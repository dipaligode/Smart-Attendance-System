"use client";
import { useEffect, useState } from "react";
import { ref, push, update, onValue } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";
import { QRCodeCanvas } from "qrcode.react"; // ✅ updated import

export default function TeacherSessionController({ subjectId }) {
  const [currentSession, setCurrentSession] = useState(null);
  const [qrValue, setQrValue] = useState("");

  // 🟢 Listen to current active session
  useEffect(() => {
    const sessionRef = ref(database, `sessions/${subjectId}`);
    onValue(sessionRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const activeSession = Object.entries(data)
          .map(([id, s]) => ({ id, ...s }))
          .find((s) => s.active);
        setCurrentSession(activeSession || null);
      }
    });
  }, [subjectId]);

  // 🔁 Generate QR every 30s
  useEffect(() => {
    if (!currentSession) return;
    const interval = setInterval(() => {
      const newQr = `${subjectId}_${currentSession.id}_${Date.now()}`;
      setQrValue(newQr);
    }, 30000);
    return () => clearInterval(interval);
  }, [currentSession, subjectId]);

  const startSession = async () => {
    const newSessionRef = push(ref(database, `sessions/${subjectId}`));
    const newSession = {
      qrValue: `${subjectId}_${newSessionRef.key}`,
      active: true,
      startedAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    };
    await update(newSessionRef, newSession);
  };

  const stopSession = async () => {
    if (!currentSession) return;
    const stopRef = ref(database, `sessions/${subjectId}/${currentSession.id}`);
    await update(stopRef, {
      active: false,
      stoppedAt: Date.now(),
    });
  };

  return (
    <div style={{ textAlign: "center", marginBottom: "40px" }}>
      {!currentSession ? (
        <button onClick={startSession} style={btnStyle}>
          ▶️ Start Attendance
        </button>
      ) : (
        <div>
          <h2>📢 Attendance in Progress</h2>
          <QRCodeCanvas
            value={qrValue || currentSession.qrValue}
            size={500}
            level="H"
            includeMargin={true}
          />
          <div style={{ marginTop: 20 }}>
            <button
              onClick={stopSession}
              style={{ ...btnStyle, backgroundColor: "#ef4444" }}
            >
              ⏹ Stop Attendance
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  backgroundColor: "#16a34a",
  color: "#fff",
  padding: "10px 20px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "1.1rem",
};
