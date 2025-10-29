"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { ref, get, update } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [message, setMessage] = useState("");
  const [scanning, setScanning] = useState(false);
  const html5QrCodeRef = useRef(null);
  const readerRef = useRef(null);

  // 🔹 Load student from localStorage
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.role === "students" && user?.email) {
      fetchStudent(user.email);
    } else {
      setMessage("⚠️ Please login as a student first.");
    }
  }, []);

  // 🔹 Fetch student from Firebase
  const fetchStudent = async (email) => {
    const snap = await get(ref(database, "students"));
    if (!snap.exists()) return;
    const all = snap.val();
    const stu = Object.entries(all)
      .map(([id, s]) => ({ id, ...s }))
      .find((s) => s.email === email);
    if (stu) {
      setStudent(stu);
      loadAttendanceSummary(stu.id);
    } else {
      setMessage("❌ Student not found.");
    }
  };

  // 🔹 Load attendance summary
  const loadAttendanceSummary = async (studentId) => {
    const attSnap = await get(ref(database, "attendance"));
    if (!attSnap.exists()) return;
    const data = attSnap.val();
    const result = [];
    Object.keys(data).forEach((subjectId) => {
      const sessions = data[subjectId];
      let total = 0, present = 0;
      Object.keys(sessions).forEach((sessionId) => {
        total++;
        if (sessions[sessionId][studentId]?.present) present++;
      });
      const percentage = total ? Math.round((present / total) * 100) : 0;
      result.push({ subjectId, total, present, percentage });
    });
    setAttendanceSummary(result);
  };

  // ✅ Start Scanner (fixed)
  const startScanner = async () => {
    if (scanning) return;
    setScanning(true);
    setMessage("📷 Initializing camera...");

    await new Promise((resolve) => setTimeout(resolve, 300)); // ensure #reader exists
    const element = document.getElementById("reader");
    if (!element) {
      setMessage("❌ QR reader element not found.");
      setScanning(false);
      return;
    }

    try {
      const qr = new Html5Qrcode("reader");
      html5QrCodeRef.current = qr;

      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 300, height: 300 } },
        async (decodedText) => {
          await qr.stop();
          html5QrCodeRef.current = null;
          setScanning(false);
          handleQrScan(decodedText);
        },
        (err) => console.warn("QR error:", err)
      );

      setMessage("📸 Scan the QR code shown by your teacher");
    } catch (err) {
      console.error(err);
      setMessage("❌ Unable to access camera. Use HTTPS or enable permissions.");
      setScanning(false);
    }
  };

  // 🔹 Stop Scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      await html5QrCodeRef.current.stop();
      html5QrCodeRef.current = null;
    }
    setScanning(false);
    setMessage("🛑 Scanner stopped");
  };

  // 🔹 Handle QR Code Scan
  const handleQrScan = async (qrValue) => {
    try {
      const [subjectId, sessionId] = qrValue.split("_");
      if (!subjectId || !sessionId) {
        setMessage("❌ Invalid QR code format");
        return;
      }

      const sessionSnap = await get(ref(database, `sessions/${subjectId}/${sessionId}`));
      if (!sessionSnap.exists()) {
        setMessage("❌ Session not found");
        return;
      }

      const session = sessionSnap.val();
      if (!session.active || Date.now() > session.expiresAt) {
        setMessage("⚠️ Session expired or closed");
        return;
      }

      // 🔹 Get GPS
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
        (err) => {
          console.error("GPS error:", err);
          setMessage("⚠️ Location unavailable or permission denied.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch (error) {
      console.error("QR Scan error:", error);
      setMessage("❌ Failed to record attendance. Try again.");
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🎓 Student Dashboard</h1>

      {!student ? (
        <p>{message || "Loading student..."}</p>
      ) : (
        <>
          <h2 style={styles.subtitle}>
            Welcome, <span style={styles.name}>{student.name}</span>
          </h2>

          {!scanning ? (
            <button onClick={startScanner} style={styles.startBtn}>
              🎥 Start QR Scanner
            </button>
          ) : (
            <>
              {/* 🔹 The reader div always exists before calling Html5Qrcode */}
              <div id="reader" ref={readerRef} style={styles.reader}></div>
              <button onClick={stopScanner} style={styles.stopBtn}>
                🛑 Stop Scanning
              </button>
            </>
          )}

          {message && <p style={styles.message}>{message}</p>}

          {/* Attendance Summary */}
          <div style={{ marginTop: 40 }}>
            <h2 style={styles.sectionTitle}>📊 Attendance Analysis</h2>
            {attendanceSummary.length === 0 ? (
              <p>No records yet.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Subject</th>
                    <th style={styles.th}>Present</th>
                    <th style={styles.th}>Total</th>
                    <th style={styles.th}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceSummary.map((s) => (
                    <tr key={s.subjectId}>
                      <td style={styles.td}>{s.subjectId}</td>
                      <td style={styles.td}>{s.present}</td>
                      <td style={styles.td}>{s.total}</td>
                      <td
                        style={{
                          ...styles.td,
                          color: s.percentage < 75 ? "red" : "green",
                          fontWeight: "bold",
                        }}
                      >
                        {s.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: { padding: 30, fontFamily: "Inter, sans-serif", textAlign: "center" },
  title: { fontSize: "2rem", fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: "1.2rem" },
  name: { color: "#2563eb" },
  reader: {
    width: "100%",
    maxWidth: "400px",
    height: "400px",
    margin: "20px auto",
    border: "4px solid #2563eb",
    borderRadius: "12px",
  },
  startBtn: {
    background: "#2563eb",
    color: "white",
    padding: "12px 20px",
    border: "none",
    borderRadius: "10px",
    fontSize: "1rem",
    cursor: "pointer",
  },
  stopBtn: {
    background: "#dc2626",
    color: "white",
    padding: "10px 20px",
    borderRadius: "10px",
    marginTop: 10,
    border: "none",
    cursor: "pointer",
  },
  message: { marginTop: 15, fontWeight: "bold" },
  sectionTitle: { fontSize: "1.5rem", marginBottom: 15 },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 10,
    borderRadius: "10px",
    overflow: "hidden",
  },
  th: { padding: "10px", background: "#2563eb", color: "white" },
  td: { padding: "10px", borderBottom: "1px solid #eee" },
};
