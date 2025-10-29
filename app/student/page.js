"use client";

import { useState, useEffect, useRef } from "react";
import { ref, get, set, child } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";
import { Html5Qrcode } from "html5-qrcode";

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const html5QrcodeScannerRef = useRef(null);

  const studentId = "s001"; // replace with dynamic auth
  const sessionId = "session001";

  // Fetch student info
  useEffect(() => {
    const studentRef = ref(database, `students/${studentId}`);
    get(studentRef)
      .then((snapshot) => {
        if (snapshot.exists()) setStudent(snapshot.val());
      })
      .catch(console.error);

    // Fetch attendance summary
    const attendanceRef = ref(database, `attendance/${studentId}`);
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
            summary.push({
              subjectId: sessId,
              present,
              total,
              percentage: Math.round((present / total) * 100),
            });
          });
          setAttendanceSummary(summary);
        }
      })
      .catch(console.error);
  }, []);

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

          // Get location
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;

              // Save attendance to Firebase
              const attendanceRef = ref(
                database,
                `attendance/${studentId}/${sessionId}/${studentId}`
              );
              await set(attendanceRef, {
                timestamp: Date.now(),
                present: true,
                lat: latitude,
                lng: longitude,
              });

              alert(
                `Attendance marked!\nQR: ${decodedText}\nLat: ${latitude}\nLng: ${longitude}`
              );

              // Update summary table after marking
              setAttendanceSummary((prev) => {
                const newSummary = [...prev];
                const index = newSummary.findIndex(
                  (s) => s.subjectId === sessionId
                );
                if (index >= 0) {
                  newSummary[index].present += 1;
                  newSummary[index].total += 1;
                  newSummary[index].percentage = Math.round(
                    (newSummary[index].present / newSummary[index].total) * 100
                  );
                } else {
                  newSummary.push({
                    subjectId: sessionId,
                    present: 1,
                    total: 1,
                    percentage: 100,
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
          // optional: console.log("Scan error", errorMessage);
        }
      )
      .catch((err) => setError(err.message));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Student Dashboard</h1>
      {student && <h2>Welcome, {student.name}</h2>}

      <button onClick={startScanner} disabled={scanning}>
        {scanning ? "Scanning..." : "Open Camera to Scan QR"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* QR code scanner element */}
      <div id="reader" style={{ width: "300px", marginTop: "20px" }}></div>

      {/* Attendance Analysis Table */}
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
            </tr>
          </thead>
          <tbody>
            {attendanceSummary.map((s) => (
              <tr key={s.subjectId}>
                <td>{s.subjectId}</td>
                <td>{s.present}</td>
                <td>{s.total}</td>
                <td>{s.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
