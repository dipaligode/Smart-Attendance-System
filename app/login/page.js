"use client";
import { useState } from "react";
import { ref, get } from "firebase/database";
import { useRouter } from "next/navigation";
import { database } from "../../firebase/firebaseConfig";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const checkUserRole = async (email, password) => {
    const roles = ["admins", "teachers", "students"];
    for (let role of roles) {
      const snapshot = await get(ref(database, role));
      if (snapshot.exists()) {
        const users = snapshot.val();
        for (const id in users) {
          const user = users[id];
          if (user.email === email && user.password === password) {
            return { role, user };
          }
        }
      }
    }
    return null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await checkUserRole(email, password);
      if (!result) {
        alert("Invalid email or password!");
        return;
      }

      const { role } = result;

      if (role === "admins") {
        localStorage.setItem("user", JSON.stringify({ email, role }));
        router.push("/admin");
    } else if (role === "teachers") {
        localStorage.setItem("user", JSON.stringify({ email, role }));
        router.push("/teacher");
        } else if (role === "students") {
        localStorage.setItem("user", JSON.stringify({ email, role }));
        router.push("/student");
        }


    } catch (err) {
      alert("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 400, margin: "auto", fontFamily: "sans-serif" }}>
      <h1>🔐 Smart Attendance Login</h1>
      <form onSubmit={handleLogin}>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button type="submit" disabled={loading}>{loading ? "Checking..." : "Login"}</button>
      </form>
    </div>
  );
}
