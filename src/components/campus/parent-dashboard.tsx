"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  CalendarCheck,
  FileBadge,
  Heart,
  LayoutDashboard,
  Map,
  UserCircle,
  Users,
} from "lucide-react";
import { api, fmtDate } from "@/lib/campus-client";
import { ROLE_THEMES } from "@/lib/campus-theme";
import { avatarGradient, initials } from "@/lib/grades";
import type { SessionUser, StudentProfile } from "@/lib/campus-types";
import { cn } from "@/lib/utils";
import { DashboardShell, type NavItem } from "./shell";
import { ReportCardView } from "./report-card";
import { StudyPlanPanel } from "./study-plan";

const NAV: NavItem[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "profile", label: "Child Profile", icon: <UserCircle className="h-4 w-4" /> },
  { key: "attendance", label: "Attendance", icon: <CalendarCheck className="h-4 w-4" /> },
  { key: "marks", label: "Progress", icon: <Users className="h-4 w-4" /> },
  { key: "report", label: "Report Card", icon: <FileBadge className="h-4 w-4" /> },
  { key: "studyplan", label: "Study Plan", icon: <Map className="h-4 w-4" /> },
];

const ATT_STYLE: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700",
  LATE: "bg-amber-100 text-amber-700",
  ABSENT: "bg-rose-100 text-rose-700",
  LEAVE: "bg-violet-100 text-violet-700",
};

export function ParentDashboard({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const theme = ROLE_THEMES.PARENT;
  const [tab, setTab] = useState("overview");
  const [children, setChildren] = useState<StudentProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadChildren = useCallback(async () => {
    const ids = user.parent?.childrenIds ?? [];
    try {
      const profiles = await Promise.all(
        ids.map((id) => api<{ student: StudentProfile }>(`/api/students/${id}`).then((d) => d.student))
      );
      setChildren(profiles);
      setSelectedId((cur) => cur || profiles[0]?.id || "");
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [user.parent]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
  }

  const child = children.find((c) => c.id === selectedId) ?? null;

  if (loading) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center", theme.pageBg)}>
        <div className="h-10 w-10 rounded-full border-4 border-rose-200 border-t-rose-500 animate-spin" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <DashboardShell user={user} theme={theme} nav={NAV} active={tab} onNav={setTab} onLogout={logout}>
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-sm text-gray-400">
            <div className="text-5xl mb-3">👨‍👩‍👧</div>
            No children are linked to your account yet. Please contact the school admin.
          </CardContent>
        </Card>
      </DashboardShell>
    );
  }

  const subjectChart =
    child?.subjectAverages.map((s) => ({ name: s.name.length > 10 ? s.name.slice(0, 9) + "…" : s.name, avg: s.avg })) ?? [];

  return (
    <DashboardShell user={user} theme={theme} nav={NAV} active={tab} onNav={setTab} onLogout={logout}>
      {/* Child switcher */}
      {children.length > 1 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "shrink-0 flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 transition",
                selectedId === c.id ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg border-transparent" : "bg-white hover:shadow"
              )}
            >
              <span className={cn("h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white", avatarGradient(c.name))}>
                {initials(c.name)}
              </span>
              <span className="text-sm font-semibold">{c.name}</span>
              <span className={cn("text-xs", selectedId === c.id ? "opacity-85" : "text-gray-400")}>{c.className}</span>
            </button>
          ))}
        </div>
      )}

      {child && tab === "overview" && (
        <div className="space-y-6">
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className={cn("bg-gradient-to-r p-6 text-white flex flex-col sm:flex-row sm:items-center gap-4", theme.gradient)}>
              <div className={cn("h-16 w-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-xl font-black ring-4 ring-white/30", avatarGradient(child.name))}>
                {initials(child.name)}
              </div>
              <div className="flex-1">
                <div className="text-2xl font-black">{child.name}'s Progress 💖</div>
                <div className="text-sm opacity-90">{child.rollNo} · Class {child.className}</div>
              </div>
              <div className="rounded-2xl bg-white/15 px-5 py-3 text-center backdrop-blur">
                <div className="text-3xl font-black">{child.overallGrade}</div>
                <div className="text-[11px] opacity-85">current grade</div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Attendance", value: `${child.attendance.pct}%`, g: theme.statGradients[0] },
              { label: "Average Score", value: `${child.overallAvg}%`, g: theme.statGradients[1] },
              { label: "Report Cards", value: child.reportCards.length, g: theme.statGradients[2] },
              { label: "Study Plans", value: child.studyPlans.length, g: theme.statGradients[3] },
            ].map((c) => (
              <div key={c.label} className={cn("rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br", c.g)}>
                <div className="text-3xl font-black">{c.value}</div>
                <div className="text-xs opacity-85 font-medium mt-1">{c.label}</div>
              </div>
            ))}
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">📊 Subject Averages</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffe4e6" />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis domain={[0, 100]} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="avg" radius={[8, 8, 0, 0]} name="Average %">
                    {subjectChart.map((_, i) => (
                      <Cell key={i} fill={theme.chart[i % theme.chart.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {child && tab === "profile" && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-rose-500" /> {child.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-2.5 text-sm">
            {[
              ["Roll No", child.rollNo],
              ["Class", child.className],
              ["Email", child.email],
              ["Phone", child.phone ?? "—"],
              ["DOB", child.dob ?? "—"],
              ["Gender", child.gender ?? "—"],
              ["Class Teacher", child.classTeacher],
              ["You are", `${user.parent?.relation ?? "Guardian"} of ${child.name}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-rose-50/70 px-3.5 py-2.5">
                <div className="text-[11px] text-rose-400 font-semibold">{k}</div>
                <div className="font-semibold text-gray-700">{v}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {child && tab === "attendance" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Present", child.attendance.present, "bg-emerald-100 text-emerald-700"],
              ["Late", child.attendance.late, "bg-amber-100 text-amber-700"],
              ["Absent", child.attendance.absent, "bg-rose-100 text-rose-700"],
              ["On Leave", child.attendance.leave, "bg-violet-100 text-violet-700"],
            ].map(([label, value, color]) => (
              <div key={label as string} className={cn("rounded-2xl p-4 text-center", color as string)}>
                <div className="text-2xl font-black">{value as number}</div>
                <div className="text-xs font-semibold opacity-80">{label as string}</div>
              </div>
            ))}
          </div>
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">📆 Attendance Log ({child.attendance.pct}% overall)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {child.attendanceLog.map((a) => (
                <div key={a.id} className={cn("rounded-xl px-3 py-2 text-center", ATT_STYLE[a.status])}>
                  <div className="text-xs font-bold">{a.date.slice(5)}</div>
                  <div className="text-[10px] font-semibold">{a.status}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {child && tab === "marks" && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-3 text-white font-bold">
            Exam Performance — {child.name}
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Exam</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {child.marks.map((m) => {
                const pct = Math.round((m.score / (m.maxScore || 100)) * 100);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-semibold">{m.exam}</TableCell>
                    <TableCell>{m.subject}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{m.score}/{m.maxScore}</TableCell>
                    <TableCell className={cn("text-right font-bold", pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-rose-600")}>
                      {pct}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {child && tab === "report" && (
        <div className="space-y-5 max-w-2xl">
          {child.reportCards.length > 0 ? (
            child.reportCards.map((c) => <ReportCardView key={c.id} card={c} studentName={child.name} />)
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-gray-400">
                <div className="text-4xl mb-2">📄</div>
                Report cards for {child.name.split(" ")[0]} will appear here once generated by teachers.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {child && tab === "studyplan" && (
        <StudyPlanPanel
          studentId={child.id}
          theme={theme}
          subjects={child.subjects.map((s) => s.name)}
          plans={child.studyPlans}
          onRefresh={loadChildren}
        />
      )}
    </DashboardShell>
  );
}
