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

  // Example IDs — in production these should be dynamic (from login/session)
  const studentId = "s001";
  const subjectId = "s001";
  const sessionId = "session001";

  const BLOCK_TIME_SECONDS = 30 * 60; // 30 minutes

  // --- Fetch student info + attendance summary ---
  useEffect(() => {
    const fetchStudentAndAttendance = async () => {
      try {
        const studentRef = ref(database, `students/${studentId}`);
        const studentSnap = await get(studentRef);
        if (studentSnap.exists()) setStudent(studentSnap.val());

        const attendanceRef = ref(database, `attendance/${subjectId}`);
        const attendanceSnap = await get(attendanceRef);
        if (attendanceSnap.exists()) {
          const sessions = attendanceSnap.val();
          const summary = [];

          Object.keys(sessions).forEach((sessId) => {
            const sessData = sessions[sessId];
            const presentCount = Object.values(sessData).filter((a) => a.present)
              .length;
            const totalStudents = Object.keys(sessData).length;
            const studentAttendance = sessData[studentId] || null;

            summary.push({
              sessionId: sessId,
              presentCount,
              totalStudents,
              percentage: totalStudents
                ? Math.round((presentCount / totalStudents) * 100)
                : 0,
              lastAttendance: studentAttendance
                ? studentAttendance.timestamp
                : null,
              lastLat: studentAttendance ? studentAttendance.lat : null,
              lastLng: studentAttendance ? studentAttendance.lng : null,
            });
          });

          setAttendanceSummary(summary);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchStudentAndAttendance();
  }, [studentId, subjectId]);

  // --- Check if student can scan ---
  const canScan = () => {
    const session = attendanceSummary.find((s) => s.sessionId === sessionId);
    if (!session || !session.lastAttendance) return true;

    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - session.lastAttendance;
    return elapsed > BLOCK_TIME_SECONDS;
  };

  // --- Start QR Scanner ---
  const startScanner = async () => {
    if (!canScan()) {
      alert(
        "You already marked attendance recently. Wait 30 minutes before scanning again."
      );
      return;
    }

    if (!Html5Qrcode.getCameras) {
      setError("Camera API not supported.");
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
    setError("");

    const config = { fps: 10, qrbox: 250 };
    html5QrcodeScannerRef.current = new Html5Qrcode("reader");

    html5QrcodeScannerRef.current
      .start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          // Stop scanner immediately after successful scan
          await html5QrcodeScannerRef.current.stop();
          setScanning(false);

          // Get location before saving attendance
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              const timestamp = Math.floor(Date.now() / 1000);

              const attendanceRef = ref(
                database,
                `attendance/${subjectId}/${sessionId}/${studentId}`
              );

              await set(attendanceRef, {
                timestamp,
                present: true,
                lat: latitude,
                lng: longitude,
              });

              alert(
                `✅ Attendance marked successfully!\nQR: ${decodedText}\nLat: ${latitude.toFixed(
                  4
                )}, Lng: ${longitude.toFixed(4)}`
              );

              // Update UI summary
              setAttendanceSummary((prev) => {
                const newSummary = [...prev];
                const index = newSummary.findIndex(
                  (s) => s.sessionId === sessionId
                );

                if (index >= 0) {
                  newSummary[index].presentCount += 1;
                  newSummary[index].lastAttendance = timestamp;
                  newSummary[index].lastLat = latitude;
                  newSummary[index].lastLng = longitude;
                  newSummary[index].percentage = Math.round(
                    (newSummary[index].presentCount /
                      newSummary[index].totalStudents) *
                      100
                  );
                } else {
                  newSummary.push({
                    sessionId,
                    presentCount: 1,
                    totalStudents: 1,
                    percentage: 100,
                    lastAttendance: timestamp,
                    lastLat: latitude,
                    lastLng: longitude,
                  });
                }

                return newSummary;
              });
            },
            (err) => {
              setScanning(false);
              alert(
                "❌ Location permission denied. Attendance not marked."
              );
              console.error(err);
            }
          );
        },
        (errorMessage) => {
          // Optional continuous scan errors ignored
        }
      )
      .catch((err) => setError(err.message));
  };

  // --- Format timestamp properly ---
  const formatTimestamp = (ts) => {
    if (!ts) return "-";
    const date = new Date(ts * 1000);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>🎓 Student Dashboard</h1>
      {student && <h2>Welcome, {student.name}</h2>}

      <button
        onClick={startScanner}
        disabled={scanning || !canScan()}
        style={{
          padding: "10px 20px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: scanning ? "not-allowed" : "pointer",
        }}
      >
        {scanning ? "📷 Scanning..." : "Open Camera to Scan QR"}
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
              <th style={{ padding: "8px" }}>Session</th>
              <th>Present</th>
              <th>Total</th>
              <th>%</th>
              <th>Last Attendance</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {attendanceSummary.map((s) => (
              <tr key={s.sessionId} style={{ textAlign: "center" }}>
                <td>{s.sessionId}</td>
                <td>{s.presentCount}</td>
                <td>{s.totalStudents}</td>
                <td>{s.percentage}%</td>
                <td>{formatTimestamp(s.lastAttendance)}</td>
                <td>
                  {s.lastLat && s.lastLng
                    ? `${s.lastLat.toFixed(3)}, ${s.lastLng.toFixed(3)}`
                    : "No location"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
