"use client";
import { useEffect, useState } from "react";
import { get, ref } from "firebase/database";
import { database } from "../../../../firebase/firebaseConfig";
import QRGenerator from "../../../components/QRGenerator";
import AttendanceTable from "../../../components/AttendanceTable";
import { useParams, useRouter } from "next/navigation";

export default function SubjectPage() {
  const { id } = useParams(); // subjectId
  const [teacherId, setTeacherId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "teachers") router.push("/login");
    const fetchTeacher = async () => {
      const snapshot = await get(ref(database, "teachers"));
      if (snapshot.exists()) {
        const all = snapshot.val();
        for (const tid in all) {
          if (all[tid].email === user.email) {
            setTeacherId(tid);
          }
        }
      }
    };
    fetchTeacher();
    get(ref(database, `subjects/${id}`)).then((snap) => {
      if (snap.exists()) setSubjectName(snap.val().name);
    });
  }, [id]);

  return (
    <div style={{ padding: 30 }}>
      <h1>📚 {subjectName}</h1>
      {teacherId && <QRGenerator subjectId={id} teacherId={teacherId} />}
      <AttendanceTable subjectId={id} />
    </div>
  );
}
