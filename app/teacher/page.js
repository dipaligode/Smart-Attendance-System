"use client";
import { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";
import TeacherSessionController from "../components/TeacherSessionController";
import AttendanceTable from "../components/AttendanceTable";

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [classId, setClassId] = useState("");

  // ✅ Load teacher details (you can replace this with auth user)
  useEffect(() => {
  const loadTeacher = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser || storedUser.role !== "teachers") return;

    const email = storedUser.email;

    const snap = await get(ref(database, "teachers"));
    if (snap.exists()) {
      const allTeachers = snap.val();
      const teacherData = Object.entries(allTeachers)
        .map(([id, t]) => ({ id, ...t }))
        .find((t) => t.email === email);

      if (teacherData) {
        setTeacher(teacherData);
        setSubjects(teacherData.subjects || []);
      }
    }
  };
  loadTeacher();
}, []);


  // ✅ When a subject is selected, get classId for it
  useEffect(() => {
    const fetchSubjectDetails = async () => {
      if (!selectedSubject) return;
      const snap = await get(ref(database, `subjects/${selectedSubject}`));
      if (snap.exists()) {
        const subjectData = snap.val();
        setClassId(subjectData.classId);
      }
    };
    fetchSubjectDetails();
  }, [selectedSubject]);

  return (
    <div style={{ padding: "30px", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "20px" }}>
        👩‍🏫 Teacher Dashboard
      </h1>

      {!teacher ? (
        <p>Loading teacher details...</p>
      ) : (
        <>
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="subject"
              style={{ fontWeight: "bold", marginRight: "10px" }}
            >
              Select Subject:
            </label>
            <select
              id="subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            >
              <option value="">-- Choose Subject --</option>
              {subjects.map((sid) => (
                <option key={sid} value={sid}>
                  {sid}
                </option>
              ))}
            </select>
          </div>

          {selectedSubject && (
            <>
              <TeacherSessionController subjectId={selectedSubject} />
              {classId && (
                <AttendanceTable
                  subjectId={selectedSubject}
                  classId={classId}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
