"use client";
import { useState, useEffect } from "react";
import { ref, set, get, remove } from "firebase/database";
import { database } from "../../../firebase/firebaseConfig";

export default function ManageStudents() {
  const [students, setStudents] = useState({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [classId, setClassId] = useState("");

  // Fetch all students
  const fetchStudents = async () => {
    const snapshot = await get(ref(database, "students"));
    if (snapshot.exists()) setStudents(snapshot.val());
    else setStudents({});
  };

  // Add a new student (default password = "12345")
  const addStudent = async () => {
    if (!name || !email || !classId) return alert("Please enter all details");

    const id = "s" + Date.now();

    await set(ref(database, `students/${id}`), {
      name,
      email,
      password: "12345", // ✅ Default password
      classId,
    });

    setName("");
    setEmail("");
    setClassId("");
    fetchStudents();
  };

  // Delete student
  const deleteStudent = async (id) => {
    await remove(ref(database, `students/${id}`));
    fetchStudents();
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <div style={{ padding: 30 }}>
      <h1>Manage Students</h1>

      <div style={{ display: "flex", flexDirection: "column", maxWidth: 300, gap: 10 }}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Class ID"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        />
        <button onClick={addStudent}>Add Student</button>
      </div>

      <h2 style={{ marginTop: 30 }}>Student List</h2>
      <ul>
        {Object.entries(students).map(([id, s]) => (
          <li key={id} style={{ marginBottom: 10 }}>
            <strong>{s.name}</strong> ({s.email}) — Class: {s.classId}
            <button
              onClick={() => deleteStudent(id)}
              style={{ marginLeft: 10, color: "red" }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
