"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ref, set } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";

const QrReader = dynamic(() => import("react-qr-reader-es6"), { ssr: false });

export default function Student() {
  const [result, setResult] = useState("");

  const handleScan = (data) => {
    if (data) {
      setResult(data);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const [className, subject, sessionId] = data.split("_");
          const studentId = prompt("Enter your email or ID");

          set(ref(database, `attendance/${subject}/${sessionId}/${studentId}`), {
            timestamp: Date.now(),
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            valid: true,
          });
        });
      }
    }
  };

  const handleError = (err) => console.error(err);

  return (
    <div style={{ padding: 20 }}>
      <h1>Student Portal</h1>
      <QrReader
        delay={300}
        onError={handleError}
        onScan={handleScan}
        style={{ width: "300px" }}
      />
      <p>Scanned Data: {result}</p>
    </div>
  );
}
