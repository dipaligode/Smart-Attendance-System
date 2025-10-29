"use client";
import { useEffect, useState } from "react";
import { ref, onValue, set, get } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";

export default function AttendanceSheet({ subjectId, classId }) {
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState({});

  // Load students filtered by classId
  useEffect(() => {
    const fetchStudents = async () => {
      const snap = await get(ref(database, "students"));
      if (snap.exists()) {
        const all = snap.val();
        // Filter students belonging to the classId
        const filtered = Object.keys(all)
          .filter((sid) => all[sid].classId === classId)
          .map((sid) => ({ id: sid, name: all[sid].name }));
        setStudents(filtered);
      }
    };
    fetchStudents();
  }, [classId]);

  // Load sessions for the given subjectId
  useEffect(() => {
    const sessionRef = ref(database, `sessions/${subjectId}`);
    onValue(sessionRef, (snap) => {
      if (snap.exists()) {
        const sess = Object.entries(snap.val())
          // convert to array of {id, ...data}
          .map(([id, data]) => ({ id, ...data }))
          // Filter only stopped sessions (active === false)
          .filter((s) => !s.active)
          // Sort by startedAt ascending
          .sort((a, b) => a.startedAt - b.startedAt);
        setSessions(sess);
      } else {
        setSessions([]);
      }
    });
  }, [subjectId]);

  // Load attendance for this subjectId
  useEffect(() => {
    const attRef = ref(database, `attendance/${subjectId}`);
    onValue(attRef, (snap) => {
      if (snap.exists()) setAttendance(snap.val());
      else setAttendance({});
    });
  }, [subjectId]);

  // Toggle attendance manually for a student in a session
  const toggleAttendance = async (sessionId, studentId) => {
    const current = attendance?.[sessionId]?.[studentId]?.present || false;
    const updated = !current;
    const newEntry = {
      present: updated,
      timestamp: Math.floor(Date.now() / 1000), // store in seconds to be consistent
      lat: attendance?.[sessionId]?.[studentId]?.lat || null,
      lng: attendance?.[sessionId]?.[studentId]?.lng || null,
      distance: attendance?.[sessionId]?.[studentId]?.distance || null,
    };

    await set(ref(database, `attendance/${subjectId}/${sessionId}/${studentId}`), newEntry);
  };

  const getTotalByStudent = (studentId) => {
    let total = 0;
    sessions.forEach((s) => {
      if (attendance[s.id]?.[studentId]?.present) total++;
    });
    return total;
  };

  const getPercentage = (studentId) => {
    if (sessions.length === 0) return "0%";
    const percent = (getTotalByStudent(studentId) / sessions.length) * 100;
    return percent.toFixed(1) + "%";
  };

  const getTotalBySession = (sessionId) => {
    let total = 0;
    students.forEach((st) => {
      if (attendance[sessionId]?.[st.id]?.present) total++;
    });
    return total;
  };

  return (
    <div
      style={{
        marginTop: "30px",
        backgroundColor: "#fffbea",
        borderRadius: "10px",
        padding: "20px",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        overflowX: "auto",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>📖 Attendance Sheet</h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "1000px",
          fontFamily: "sans-serif",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#facc15" }}>
            <th style={thStyle}>Name</th>
            {sessions.map((s, idx) => (
              <th key={s.id} style={thStyle}>
                Lec {idx + 1}
                <br />
                <span style={{ fontSize: "0.7rem" }}>
                  {new Date(s.expiresAt * 1000).toLocaleDateString()}
                </span>
              </th>
            ))}
            <th style={thStyle}>Total</th>
            <th style={thStyle}>%</th>
          </tr>
        </thead>

        <tbody>
          {students.map((stu) => (
            <tr key={stu.id}>
              <td style={{ ...tdStyle, fontWeight: "600" }}>{stu.name}</td>
              {sessions.map((s) => {
                const entry = attendance[s.id]?.[stu.id];
                return (
  <td
  key={s.id}
  onClick={() => toggleAttendance(s.id, stu.id)}
  style={{
    ...tdStyle,
    cursor: "pointer",
    backgroundColor: entry
      ? entry.present
        ? entry.distance <= 30
          ? "#bbf7d0" // ✅ Present and in range
          : "#fde68a" // ⚠️ Present but far away
        : "#fecaca"   // ❌ Absent
      : "#f1f5f9",    // No record yet
  }}
  title={`Lat: ${entry?.lat ?? "N/A"}, Lng: ${entry?.lng ?? "N/A"}, Dist: ${entry?.distance ?? "?"}m`}
>
  {entry?.present ? (entry?.distance <= 30 ? "✅" : "⚠️") : "✖"}
  <div style={{ fontSize: "0.7rem", color: "#333", marginTop: 4 }}>
    {/* Display latitude and longitude with 3 decimals, or show "No location" */}
    {typeof entry?.lat === "number" && typeof entry?.lng === "number"
      ? `${entry.lat.toFixed(3)}, ${entry.lng.toFixed(3)}`
      : "No location"}
  </div>
</td>


                );
              })}
              <td style={{ ...tdStyle, fontWeight: "bold", backgroundColor: "#fef3c7" }}>
                {getTotalByStudent(stu.id)}
              </td>
              <td style={{ ...tdStyle, fontWeight: "bold", color: "#2563eb" }}>{getPercentage(stu.id)}</td>
            </tr>
          ))}

          {/* Totals row */}
          <tr style={{ backgroundColor: "#fde68a", fontWeight: "bold" }}>
            <td style={{ ...tdStyle, textAlign: "left" }}>Total Present</td>
            {sessions.map((s) => (
              <td key={s.id} style={tdStyle}>
                {getTotalBySession(s.id)}
              </td>
            ))}
            <td colSpan="2" style={tdStyle}>
              —
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  border: "1px solid #d1d5db",
  padding: "8px",
  textAlign: "center",
  fontWeight: "600",
};

const tdStyle = {
  border: "1px solid #e5e7eb",
  padding: "8px",
  textAlign: "center",
  fontSize: "0.9rem",
};
