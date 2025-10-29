"use client";

import { useState, useEffect, useRef } from "react";
import { ref, get, set } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";
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

  const BLOCK_TIME_SECONDS = 30 * 60; // 30 minutes

  // Fetch student info and attendance summary
  useEffect(() => {
    const studentRef = ref(database, `students/${studentId}`);
    get(studentRef)
      .then((snapshot) => {
        if (snapshot.exists()) setStudent(snapshot.val());
      })
      .catch(console.error);

    const attendanceRef = ref(database, `attendance/${subjectId}`);
    get(attendanceRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const sessions = snapshot.val();
          const summary = [];

          Object.keys(sessions).forEach((sessId) => {
            const sessData = sessions[sessId];
            const presentCount = Object.values(sessData).filter(
              (a) => a.present
            ).length;

            const totalStudents = Object.keys(sessData).length;

            const studentAttendance = sessData[studentId] || null;

            summary.push({
              sessionId: sessId,
              presentCount,
              totalStudents,
              percentage: totalStudents
                ? Math.round((presentCount / totalStudents) * 100)
                : 0,
              lastAttendance: studentAttendance ? studentAttendance.timestamp : null,
            });
          });

          setAttendanceSummary(summary);
        }
      })
      .catch(console.error);
  }, [studentId, subjectId]);

  // Check if student can scan
  const canScan = () => {
    const session = attendanceSummary.find((s) => s.sessionId === sessionId);
    if (!session || !session.lastAttendance) return true;

    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - session.lastAttendance;

    return elapsed > BLOCK_TIME_SECONDS;
  };

  const startScanner = async () => {
    if (!canScan()) {
      alert(
        "You have already marked attendance for this session recently. Please wait 30 minutes before scanning again."
      );
      return;
    }

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

          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              const timestamp = Math.floor(Date.now() / 1000);

              const attendanceRef = ref(
                database,
                `attendance/${subjectId}/${sessionId}/${studentId}`
              );

              // Use set() to save all fields correctly
              await set(attendanceRef, {
                timestamp,
                present: true,
                lat: latitude,
                lng: longitude,
              });

              alert(`Attendance marked!\nQR: ${decodedText}`);

              // Update local summary
              setAttendanceSummary((prev) => {
                const newSummary = [...prev];
                const index = newSummary.findIndex(
                  (s) => s.sessionId === sessionId
                );

                if (index >= 0) {
                  newSummary[index].presentCount += 1;
                  newSummary[index].percentage = Math.round(
                    (newSummary[index].presentCount / newSummary[index].totalStudents) * 100
                  );
                  newSummary[index].lastAttendance = timestamp;
                } else {
                  newSummary.push({
                    sessionId,
                    presentCount: 1,
                    totalStudents: 1,
                    percentage: 100,
                    lastAttendance: timestamp,
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

      <button onClick={startScanner} disabled={scanning || !canScan()}>
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
                <td>{s.presentCount}</td>
                <td>{s.totalStudents}</td>
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
