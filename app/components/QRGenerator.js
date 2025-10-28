"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ref, set, update } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";

export default function QRGenerator({ subjectId, teacherId, subjectName }) {
  const [qrData, setQrData] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [expiresIn, setExpiresIn] = useState(30);
  const [sessionId, setSessionId] = useState("");

  // Generate a new QR and push it to Firebase
  const generateQR = async (sessionKey) => {
    const newQrValue = `${subjectId}_${sessionKey}_${Date.now()}`;

    // Push QR to Firebase
    await update(ref(database, `sessions/${subjectId}/${sessionKey}`), {
      qrValue: newQrValue,
      lastUpdated: Date.now(),
    });

    // Generate QR image
    const url = await QRCode.toDataURL(newQrValue, { width: 1000, margin: 1 });
    setQrData(newQrValue);
    setQrImage(url);
    setExpiresIn(30);
  };

  // Start a session on component mount
  useEffect(() => {
    const startSession = async () => {
      const newSessionId = "session_" + Date.now();
      await set(ref(database, `sessions/${subjectId}/${newSessionId}`), {
        teacherId,
        qrValue: "",
        startedAt: Date.now(),
      });
      setSessionId(newSessionId);

      // Generate the first QR immediately
      await generateQR(newSessionId);

      // Start 30s interval to refresh QR
      const interval = setInterval(async () => {
        await generateQR(newSessionId);
      }, 30000);

      // Countdown timer
      const countdown = setInterval(() => {
        setExpiresIn((prev) => (prev > 0 ? prev - 1 : 30));
      }, 1000);

      return () => {
        clearInterval(interval);
        clearInterval(countdown);
      };
    };

    const cleanupPromise = startSession();
    return () => cleanupPromise.then((clean) => clean && clean());
  }, [subjectId, teacherId]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        color: "white",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{subjectName}</h1>

      {qrImage && (
        <img
          src={qrImage}
          alt="QR Code"
          style={{
            width: "90vw",
            maxWidth: "700px",
            height: "auto",
            borderRadius: "16px",
            boxShadow: "0 0 40px rgba(255,255,255,0.2)",
            backgroundColor: "white",
            padding: "10px",
          }}
        />
      )}

      <div style={{ marginTop: "20px", fontSize: "1.2rem" }}>
        ⏳ QR expires in: <strong>{expiresIn}s</strong>
      </div>

      <div style={{ fontSize: "0.9rem", opacity: 0.8, marginTop: "10px" }}>
        Session: {sessionId || "Loading..."}
      </div>
    </div>
  );
}
