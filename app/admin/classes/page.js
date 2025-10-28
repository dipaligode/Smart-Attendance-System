"use client";
import { useState, useEffect } from "react";
import { ref, set, get, remove } from "firebase/database";
import { database } from "../../../firebase/firebaseConfig";

export default function ManageClasses() {
  const [classes, setClasses] = useState({});
  const [name, setName] = useState("");
  const [year, setYear] = useState("");

  const fetchClasses = async () => {
    const snapshot = await get(ref(database, "classes"));
    if (snapshot.exists()) setClasses(snapshot.val());
  };

  const addClass = async () => {
    if (!name || !year) return alert("Enter all details");
    const id = "c" + Date.now();
    await set(ref(database, `classes/${id}`), { name, year });
    setName(""); setYear("");
    fetchClasses();
  };

  const deleteClass = async (id) => {
    await remove(ref(database, `classes/${id}`));
    fetchClasses();
  };

  useEffect(()=>{ fetchClasses(); }, []);

  return (
    <div style={{ padding: 30 }}>
      <h1>Manage Classes</h1>
      <input placeholder="Class Name" value={name} onChange={e=>setName(e.target.value)} />
      <input placeholder="Year" value={year} onChange={e=>setYear(e.target.value)} />
      <button onClick={addClass}>Add Class</button>

      <ul>
        {Object.entries(classes).map(([id, c]) => (
          <li key={id}>
            {c.name} ({c.year})
            <button onClick={()=>deleteClass(id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
