"use client";

import { useState, useEffect, useRef } from "react";
import { ref, get, set } from "firebase/database";
import { database } from "../../firebase/firebaseConfig"; // your firebase config file
import { Html5Qrcode } from "html5-qrcode";

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const html5QrcodeScannerRef = useRef(null);

  const studentId = "s001"; // Replace with dynamic auth
  const subjectId = "s001"; // Must match subject in DB
  const sessionId = "session001"; // Active session id (should come dynamically)

  // Fetch student info
  useEffect(() => {
    const studentRef = ref(database, `students/${studentId}`);
    get(studentRef)
      .then((snapshot) => {
        if (snapshot.exists()) setStudent(snapshot.val());
      })
      .catch(console.error);

    // Fetch attendance summary for this subject
    const attendanceRef = ref(database, `attendance/${subjectId}`);
    get(attendanceRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const sessions = snapshot.val();
          const summary = [];

          Object.keys(sessions).forEach((sessId) => {
            const sessData = sessions[sessId];
            const total = Object.keys(sessData).length;
            const present = Object.values(sessData).filter(
              (a) => a.present
            ).length;
            const lastAttendance = sessData[studentId]?.timestamp || null;

            summary.push({
              sessionId: sessId,
              present,
              total,
              percentage: total ? Math.round((present / total) * 100) : 0,
              lastAttendance,
            });
          });

          setAttendanceSummary(summary);
        }
      })
      .catch(console.error);
  }, [studentId, subjectId]);

  const startScanner = async () => {
    if (!Html5Qrcode.getCameras) {
      setError("Camera API not supported in this browser.");
      return;
    }

    const cameras = await Html5Qrcode.getCameras().catch(() => {
      setError("No camera found or permission denied.");
      return [];
    });

    if (!cameras || cameras.length === 0) {
      setError("No camera found.");
      return;
    }

    setScanning(true);

    const config = { fps: 10, qrbox: 250 };
    html5QrcodeScannerRef.current = new Html5Qrcode("reader");

    html5QrcodeScannerRef.current
      .start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          await html5QrcodeScannerRef.current.stop();
          setScanning(false);

          // Get GPS location
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;

              // Save attendance to Firebase with subjectId included in path
              const attendanceRef = ref(
                database,
                `attendance/${subjectId}/${sessionId}/${studentId}`
              );

              await set(attendanceRef, {
                timestamp: Math.floor(Date.now() / 1000), // seconds
                present: true,
                lat: latitude,
                lng: longitude,
              });

              alert(
                `Attendance marked!\nQR: ${decodedText}\nLat: ${latitude}\nLng: ${longitude}`
              );

              // Update summary table in UI
              setAttendanceSummary((prev) => {
                const newSummary = [...prev];
                const index = newSummary.findIndex(
                  (s) => s.sessionId === sessionId
                );
                if (index >= 0) {
                  newSummary[index].present += 1;
                  newSummary[index].total += 1;
                  newSummary[index].percentage = Math.round(
                    (newSummary[index].present / newSummary[index].total) * 100
                  );
                  newSummary[index].lastAttendance = Math.floor(Date.now() / 1000);
                } else {
                  newSummary.push({
                    sessionId,
                    present: 1,
                    total: 1,
                    percentage: 100,
                    lastAttendance: Math.floor(Date.now() / 1000),
                  });
                }
                return newSummary;
              });
            },
            (err) => {
              alert("Location permission denied. Cannot mark attendance.");
              console.error(err);
            }
          );
        },
        (errorMessage) => {
          // Optional: handle scan errors if needed
        }
      )
      .catch((err) => setError(err.message));
  };

  const formatTimestamp = (ts) =>
    ts ? new Date(ts * 1000).toLocaleString() : "-";

  return (
    <div style={{ padding: "20px" }}>
      <h1>Student Dashboard</h1>
      {student && <h2>Welcome, {student.name}</h2>}

      <button onClick={startScanner} disabled={scanning}>
        {scanning ? "Scanning..." : "Open Camera to Scan QR"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div id="reader" style={{ width: "300px", marginTop: "20px" }}></div>

      {attendanceSummary.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr style={{ background: "#2563eb", color: "white" }}>
              <th>Session</th>
              <th>Present</th>
              <th>Total</th>
              <th>%</th>
              <th>Last Attendance</th>
            </tr>
          </thead>
          <tbody>
            {attendanceSummary.map((s) => (
              <tr key={s.sessionId}>
                <td>{s.sessionId}</td>
                <td>{s.present}</td>
                <td>{s.total}</td>
                <td>{s.percentage}%</td>
                <td>{formatTimestamp(s.lastAttendance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
