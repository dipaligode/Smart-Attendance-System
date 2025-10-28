"use client";
import { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { database } from "../../../firebase/firebaseConfig";

export default function ViewAttendance() {
  const [attendance, setAttendance] = useState({});

  const fetchAttendance = async () => {
    const snapshot = await get(ref(database, "attendance"));
    if (snapshot.exists()) setAttendance(snapshot.val());
  };

  useEffect(()=>{ fetchAttendance(); }, []);

  return (
    <div style={{ padding: 30 }}>
      <h1>View Attendance</h1>
      {Object.entries(attendance).map(([subjectId, sessions]) => (
        <div key={subjectId}>
          <h2>Subject: {subjectId}</h2>
          {Object.entries(sessions).map(([sessionId, students]) => (
            <div key={sessionId}>
              <h4>Session: {sessionId}</h4>
              <ul>
                {Object.entries(students).map(([studentId, record]) => (
                  <li key={studentId}>
                    {studentId}: {record.present ? "Present" : "Absent"} - {new Date(record.timestamp).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
