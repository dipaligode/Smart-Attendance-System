"use client";

import AuthGuard from "../components/AuthGuard";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminDashboard() {
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <AuthGuard allowedRoles={["admins"]}>
      <div style={{ padding: 30, fontFamily: "sans-serif" }}>
        <h1>🧑‍💼 Admin Dashboard</h1>
        <p>Welcome! Choose what you want to manage:</p>

        <nav>
            <Link href="/change-password">Change Password</Link>
        </nav>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li><Link href="/admin/teachers">👨‍🏫 Manage Teachers</Link></li>
          <li><Link href="/admin/students">👩‍🎓 Manage Students</Link></li>
          <li><Link href="/admin/classes">🏫 Manage Classes</Link></li>
          <li><Link href="/admin/attendance">📋 View Attendance</Link></li>
        </ul>

        <button onClick={logout} style={{ marginTop: 20 }}>
          Logout
        </button>
      </div>
    </AuthGuard>
  );
}
