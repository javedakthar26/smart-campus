"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Sparkles, Loader2, LogIn } from "lucide-react";
import type { Role, SessionUser } from "@/lib/campus-types";

const DEMO: { role: Role; icon: string; email: string; password: string; grad: string; desc: string }[] = [
  { role: "ADMIN", icon: "🛡️", email: "admin@campus.edu", password: "Admin@123", grad: "from-violet-500 to-fuchsia-500", desc: "Full campus control" },
  { role: "TEACHER", icon: "📚", email: "teacher@campus.edu", password: "Teacher@123", grad: "from-emerald-500 to-teal-500", desc: "Marks & attendance" },
  { role: "STUDENT", icon: "🎒", email: "student@campus.edu", password: "Student@123", grad: "from-amber-500 to-orange-500", desc: "Learning dashboard" },
  { role: "PARENT", icon: "👨‍👩‍👧", email: "parent@campus.edu", password: "Parent@123", grad: "from-rose-500 to-pink-500", desc: "Track your child" },
];

export function LoginScreen({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("admin@campus.edu");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);

  async function login(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      // fetch full session (with role profiles)
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      onLogin(meData.user);
      toast({ title: "Welcome back! 🎉", description: `Logged in as ${data.user.name}` });
    } catch (err) {
      toast({ title: "Login failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(d: (typeof DEMO)[number]) {
    setEmail(d.email);
    setPassword(d.password);
    toast({ title: `${d.icon} Demo account loaded`, description: `${d.role} — press Sign In` });
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-violet-100 via-orange-50 to-rose-100 relative overflow-hidden">
      {/* floating decorative blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-violet-300/40 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-amber-300/40 blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute -bottom-24 left-1/4 h-96 w-96 rounded-full bg-rose-300/40 blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left: branding */}
          <section className="text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-3">
              <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-violet-600 via-orange-500 to-rose-500 flex items-center justify-center shadow-2xl rotate-3">
                <GraduationCap className="h-9 w-9 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-violet-600 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                  Smart Campus
                </h1>
                <p className="text-sm font-medium text-gray-500">One portal. Every role. Zero paperwork.</p>
              </div>
            </div>

            <p className="text-gray-600 text-lg max-w-md mx-auto lg:mx-0">
              Student management, enrollment, attendance, AI assistance, auto report cards & study plans — wrapped in one colorful hub.
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto lg:mx-0">
              {DEMO.map((d) => (
                <button
                  key={d.role}
                  onClick={() => fillDemo(d)}
                  className={`text-left rounded-2xl p-3 bg-gradient-to-br ${d.grad} text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all`}
                >
                  <div className="text-lg">{d.icon} <span className="font-bold">{d.role.charAt(0) + d.role.slice(1).toLowerCase()}</span></div>
                  <div className="text-xs opacity-90 mt-0.5">{d.desc}</div>
                  <div className="text-[11px] opacity-75 mt-1 font-mono">{d.email}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">👆 Click a card to auto-fill demo credentials</p>
          </section>

          {/* Right: login card */}
          <section className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-gray-800">Sign in to your portal</h2>
            </div>
            <form onSubmit={login} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-violet-600 via-orange-500 to-rose-500 hover:opacity-90 text-white"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </form>
            <div className="mt-5 pt-4 border-t grid grid-cols-4 gap-2 text-center">
              {[
                ["🛡️", "Admin", "text-violet-600"],
                ["📚", "Teacher", "text-emerald-600"],
                ["🎒", "Student", "text-amber-600"],
                ["👨‍👩‍👧", "Parent", "text-rose-600"],
              ].map(([icon, label, color]) => (
                <div key={label} className="rounded-xl bg-gray-50 py-2.5">
                  <div className="text-xl">{icon}</div>
                  <div className={`text-xs font-semibold ${color}`}>{label}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 text-center mt-3">
              Role-based access — each login opens a completely different themed dashboard.
            </p>
          </section>
        </div>
      </main>

      <footer className="relative z-10 pb-6 text-center text-xs text-gray-400">
        Smart Campus © 2026 — Student Management • Enrollment • Attendance • AI Assistant • Report Cards • Study Plans
      </footer>
    </div>
  );
}
