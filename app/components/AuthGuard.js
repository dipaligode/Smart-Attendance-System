"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGuard({ children, allowedRoles }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem("user");

    // If no user in localStorage → redirect immediately
    if (!userStr) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);

      // If role not allowed → redirect
      if (!allowedRoles.includes(user.role)) {
        router.replace("/login");
        return;
      }

      // User is authorized
      setIsAuthorized(true);
    } catch (err) {
      // Invalid JSON → redirect
      router.replace("/login");
    }
  }, [router, allowedRoles]);

  // Don't render anything until we know auth state
  if (!isAuthorized) return null;

  return children;
}
