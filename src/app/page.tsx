"use client";

import { useCallback, useEffect, useState } from "react";
import { LoginScreen } from "@/components/campus/login-screen";
import { AdminDashboard } from "@/components/campus/admin-dashboard";
import { TeacherDashboard } from "@/components/campus/teacher-dashboard";
import { StudentDashboard } from "@/components/campus/student-dashboard";
import { ParentDashboard } from "@/components/campus/parent-dashboard";
import { api } from "@/lib/campus-client";
import type { SessionUser } from "@/lib/campus-types";

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const data = await api<{ user: SessionUser | null }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (booting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-violet-100 via-orange-50 to-rose-100">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-600 via-orange-500 to-rose-500 rotate-3 animate-pulse flex items-center justify-center text-2xl">
          🎓
        </div>
        <p className="text-sm text-gray-400 font-medium">Loading Smart Campus…</p>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={setUser} />;

  if (user.role === "ADMIN") return <AdminDashboard user={user} onLogout={() => setUser(null)} />;
  if (user.role === "TEACHER") return <TeacherDashboard user={user} onLogout={() => setUser(null)} />;
  if (user.role === "STUDENT") return <StudentDashboard user={user} onLogout={() => setUser(null)} />;
  if (user.role === "PARENT") return <ParentDashboard user={user} onLogout={() => setUser(null)} />;

  return <LoginScreen onLogin={setUser} />;
}
