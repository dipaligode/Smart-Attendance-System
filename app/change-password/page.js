"use client";
import { useState, useEffect } from "react";
import { ref, get, update } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load user info from localStorage
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      alert("Please log in first");
      router.push("/login");
    } else {
      setEmail(user.email);
      setRole(user.role);
    }
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword)
      return alert("Please fill all fields");
    if (newPassword !== confirmPassword)
      return alert("New passwords do not match");

    setLoading(true);
    try {
      // Fetch users from role-specific branch
      const snapshot = await get(ref(database, role));
      if (snapshot.exists()) {
        const users = snapshot.val();
        for (const id in users) {
          const user = users[id];
          if (user.email === email) {
            if (user.password !== oldPassword) {
              alert("Old password incorrect!");
              setLoading(false);
              return;
            }

            // Update password
            await update(ref(database, `${role}/${id}`), { password: newPassword });
            alert("Password updated successfully! Please log in again.");

            localStorage.removeItem("user");
            router.push("/login");
            return;
          }
        }
      }
      alert("User not found!");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 400, margin: "auto", fontFamily: "sans-serif" }}>
      <h1>🔑 Change Password</h1>
      <form onSubmit={handleChangePassword}>
        <p><strong>Email:</strong> {email}</p>
        <input
          type="password"
          placeholder="Old Password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}
