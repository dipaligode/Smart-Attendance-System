"use client";

import { useState, useEffect } from "react";
import { ref, set, get, remove } from "firebase/database";
import { database } from "../../../firebase/firebaseConfig";

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editId, setEditId] = useState(null);

  // Fetch teachers
  const fetchTeachers = async () => {
    const snapshot = await get(ref(database, "teachers"));
    if (snapshot.exists()) setTeachers(snapshot.val());
    else setTeachers({});
  };

  // Add or update teacher (default password = "12345")
  const saveTeacher = async () => {
    if (!name || !email) return alert("Please enter all details");

    const id = editId || "t" + Date.now();

    await set(ref(database, `teachers/${id}`), {
      name,
      email,
      password: "12345", // ✅ Default password
    });

    setName("");
    setEmail("");
    setEditId(null);
    fetchTeachers();
  };

  // Delete teacher
  const deleteTeacher = async (id) => {
    await remove(ref(database, `teachers/${id}`));
    fetchTeachers();
  };

  // Edit teacher info (name/email only)
  const editTeacher = (id, t) => {
    setEditId(id);
    setName(t.name);
    setEmail(t.email);
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  return (
    <div style={{ padding: 30 }}>
      <h1>Manage Teachers</h1>

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
        <button onClick={saveTeacher}>
          {editId ? "Update" : "Add"} Teacher
        </button>
      </div>

      <h2 style={{ marginTop: 30 }}>Teacher List</h2>
      <ul>
        {Object.entries(teachers).map(([id, t]) => (
          <li key={id} style={{ marginBottom: 10 }}>
            <strong>{t.name}</strong> ({t.email})
            <button
              onClick={() => editTeacher(id, t)}
              style={{ marginLeft: 10 }}
            >
              Edit
            </button>
            <button
              onClick={() => deleteTeacher(id)}
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
