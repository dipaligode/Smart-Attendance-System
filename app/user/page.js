"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { ref, get, update } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [scanner, setScanner] = useState(null);
  const [ready, setReady] = useState(false);
  const readerRef = useRef(null);

  // ✅ Ensure reader div exists before mounting
  useEffect(() => {
    setReady(true);
  }, []);

  // ✅ Load student info
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.email && user?.role === "students") {
      fetchStudentData(user.email);
    } else {
      setMessage("⚠️ Please login as a student first.");
    }
  }, []);

  const fetchStudentData = async (email) => {
    const snap = await get(ref(database, "students"));
    if (snap.exists()) {
      const all = snap.val();
      const stu = Object.entries(all)
        .map(([id, s]) => ({ id, ...s }))
        .find((s) => s.email === email);
      if (stu) {
        setStudent(stu);
        loadAttendanceSummary(stu.id);
      }
    }
  };

  const loadAttendanceSummary = async (studentId) => {
    const attSnap = await get(ref(database, "attendance"));
    if (!attSnap.exists()) return;
    const data = attSnap.val();

    const result = [];
    Object.keys(data).forEach((subjectId) => {
      const subjectSessions = data[subjectId];
      let total = 0;
      let present = 0;

      Object.keys(subjectSessions).forEach((sessionId) => {
        total++;
        if (subjectSessions[sessionId][studentId]?.present) present++;
      });

      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      result.push({ subjectId, present, total, percentage });
    });
    setAttendanceSummary(result);
  };

  // ✅ Start QR Scanner safely
  const startScanner = async () => {
    try {
      setMessage("");
      setScanning(true);

      // ✅ Make sure the reader div is present
      const readerElem = document.getElementById("reader");
      if (!readerElem) {
        setMessage("❌ QR container not found in DOM.");
        setScanning(false);
        return;
      }

      // Ask for permission (triggers popup if needed)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());

      const html5QrCode = new Html5Qrcode("reader"); // ✅ Using ID string safely
      setScanner(html5QrCode);

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 300, height: 300 } },
        async (qrValue) => {
          await html5QrCode.stop();
          setScanner(null);
          setScanning(false);
          await handleQrScan(qrValue);
        }
      );

      setMessage("📷 Camera started. Scan a QR code now!");
    } catch (err) {
      console.error("Camera start failed:", err);
      if (err.name === "NotAllowedError") {
        setMessage("⚠️ Please allow camera access in your browser.");
      } else if (err.name === "NotFoundError") {
        setMessage("❌ No camera found on this device.");
      } else {
        setMessage("❌ Unable to start camera. Please enable permissions and use HTTPS.");
      }
      setScanning(false);
    }
  };

  // ✅ Handle QR Scan
  const handleQrScan = async (qrValue) => {
    try {
      const [subjectId, sessionId] = qrValue.split("_");
      if (!subjectId || !sessionId) {
        setMessage("❌ Invalid QR Code");
        return;
      }

      const sessionSnap = await get(ref(database, `sessions/${subjectId}/${sessionId}`));
      if (!sessionSnap.exists()) {
        setMessage("❌ Session not found");
        return;
      }

      const session = sessionSnap.val();
      if (!session.active || Date.now() > session.expiresAt) {
        setMessage("⚠️ Session expired or not active");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          await update(ref(database, `attendance/${subjectId}/${sessionId}/${student.id}`), {
            present: true,
            timestamp: Date.now(),
            lat,
            lng,
          });

          setMessage("✅ Attendance marked successfully!");
          loadAttendanceSummary(student.id);
        },
        () => setMessage("⚠️ Location permission denied.")
      );
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to mark attendance");
    }
  };

  // ✅ Stop scanner
  const stopScanner = async () => {
    if (scanner) {
      await scanner.stop();
      setScanner(null);
    }
    setScanning(false);
    setMessage("🛑 Scanner stopped");
  };

  if (!ready) return null; // Ensure reader div renders first

  return (
    <div style={{ padding: 40, fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>🎓 Student Dashboard</h1>

      {!student ? (
        <p>Loading student data...</p>
      ) : (
        <>
          <h3>
            Welcome, <span style={{ color: "#2563eb" }}>{student.name}</span>
          </h3>

          {/* ✅ Reader div always in DOM */}
          <div
            id="reader"
            ref={readerRef}
            style={{
              width: "100%",
              maxWidth: 400,
              marginTop: 20,
              display: scanning ? "block" : "none",
            }}
          />

          {!scanning ? (
            <button style={btnStyle} onClick={startScanner}>
              📷 Open Camera to Scan QR
            </button>
          ) : (
            <button onClick={stopScanner} style={stopBtnStyle}>
              🛑 Stop Scanning
            </button>
          )}

          {message && <p style={{ marginTop: 10, fontWeight: "bold" }}>{message}</p>}

          <h2 style={{ marginTop: 40, fontSize: "1.5rem" }}>📊 Attendance Summary</h2>

          {attendanceSummary.length === 0 ? (
            <p>No attendance data yet.</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#2563eb", color: "white" }}>
                  <th style={th}>Subject</th>
                  <th style={th}>Present</th>
                  <th style={th}>Total</th>
                  <th style={th}>%</th>
                </tr>
              </thead>
              <tbody>
                {attendanceSummary.map((s) => (
                  <tr key={s.subjectId}>
                    <td style={td}>{s.subjectId}</td>
                    <td style={td}>{s.present}</td>
                    <td style={td}>{s.total}</td>
                    <td style={td}>{s.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

// --- Styles ---
const btnStyle = {
  margin: "20px 0",
  padding: "10px 20px",
  borderRadius: "10px",
  background: "#2563eb",
  color: "white",
  border: "none",
  cursor: "pointer",
  fontSize: "1rem",
};

const stopBtnStyle = {
  ...btnStyle,
  background: "#dc2626",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 20,
  background: "white",
  borderRadius: "10px",
  overflow: "hidden",
};

const th = { padding: "10px", textAlign: "left", borderBottom: "2px solid #ccc" };
const td = { padding: "10px", borderBottom: "1px solid #eee" };
