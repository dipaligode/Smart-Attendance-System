"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { ref, get, update, push } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [attendanceSummary, setAttendanceSummary] = useState([]);

  // ✅ Load student info from localStorage
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.email && user?.role === "students") {
      fetchStudentData(user.email);
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

  // ✅ Load attendance summary
  const loadAttendanceSummary = async (studentId) => {
    const attSnap = await get(ref(database, "attendance"));
    if (!attSnap.exists()) return;

    const data = attSnap.val();
    const result = [];

    Object.keys(data).forEach((subjectId) => {
      const subjectSessions = data[subjectId];
      let total = 0,
        present = 0;

      Object.keys(subjectSessions).forEach((sessionId) => {
        total++;
        if (subjectSessions[sessionId][studentId]?.present) {
          present++;
        }
      });

      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      result.push({ subjectId, present, total, percentage });
    });

    setAttendanceSummary(result);
  };

  // ✅ Start scanning QR
  const startScanner = () => {
    setMessage("");
    setScanning(true);

    const scanner = new Html5QrcodeScanner("reader", {
      qrbox: { width: 300, height: 300 },
      fps: 10,
    });

    scanner.render(async (qrData) => {
      scanner.clear();
      setScanning(false);
      await handleQrScan(qrData);
    });
  };

  // ✅ Handle QR scan
  const handleQrScan = async (qrValue) => {
    try {
      const parts = qrValue.split("_");
      const subjectId = parts[0];
      const sessionId = parts[1];

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

      // ✅ Get GPS
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          const attendanceRef = ref(
            database,
            `attendance/${subjectId}/${sessionId}/${student.id}`
          );

          await update(attendanceRef, {
            present: true,
            timestamp: Date.now(),
            lat,
            lng,
          });

          setMessage("✅ Attendance marked successfully!");
          loadAttendanceSummary(student.id);
        },
        (err) => setMessage("❌ Location access denied.")
      );
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to mark attendance");
    }
  };

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

          {!scanning ? (
            <button
              onClick={startScanner}
              style={{
                margin: "20px 0",
                padding: "10px 20px",
                borderRadius: "10px",
                background: "#2563eb",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              📷 Scan QR to Mark Attendance
            </button>
          ) : (
            <div id="reader" style={{ width: "100%", maxWidth: "400px" }} />
          )}

          {message && (
            <p style={{ marginTop: 10, fontWeight: "bold", color: "#374151" }}>
              {message}
            </p>
          )}

          <h2 style={{ marginTop: 40, fontSize: "1.5rem" }}>📊 Attendance Summary</h2>

          {attendanceSummary.length === 0 ? (
            <p>No attendance data yet.</p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: 20,
                background: "white",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
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

const th = {
  padding: "10px",
  textAlign: "left",
  borderBottom: "2px solid #ccc",
};
const td = {
  padding: "10px",
  borderBottom: "1px solid #eee",
};
