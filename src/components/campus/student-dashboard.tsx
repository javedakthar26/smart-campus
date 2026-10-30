"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  BookOpen,
  CalendarCheck,
  FileBadge,
  LayoutDashboard,
  Map,
  Percent,
  Star,
  Trophy,
  UserCircle,
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
  { key: "profile", label: "My Profile", icon: <UserCircle className="h-4 w-4" /> },
  { key: "attendance", label: "Attendance", icon: <CalendarCheck className="h-4 w-4" /> },
  { key: "marks", label: "My Marks", icon: <BookOpen className="h-4 w-4" /> },
  { key: "report", label: "Report Card", icon: <FileBadge className="h-4 w-4" /> },
  { key: "studyplan", label: "Study Plan", icon: <Map className="h-4 w-4" /> },
];

const ATT_STYLE: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700",
  LATE: "bg-amber-100 text-amber-700",
  ABSENT: "bg-rose-100 text-rose-700",
  LEAVE: "bg-violet-100 text-violet-700",
};

export function StudentDashboard({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const theme = ROLE_THEMES.STUDENT;
  const [tab, setTab] = useState("overview");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user.student) return;
    try {
      const data = await api<{ student: StudentProfile }>(`/api/students/${user.student.id}`);
      setProfile(data.student);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [user.student]);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
  }

  const attDonut = profile
    ? [
        { name: "Present", value: profile.attendance.present, color: "#22c55e" },
        { name: "Late", value: profile.attendance.late, color: "#f59e0b" },
        { name: "Absent", value: profile.attendance.absent, color: "#f43f5e" },
        { name: "Leave", value: profile.attendance.leave, color: "#a855f7" },
      ].filter((d) => d.value > 0)
    : [];

  const subjectChart =
    profile?.subjectAverages.map((s) => ({ name: s.name.length > 10 ? s.name.slice(0, 9) + "…" : s.name, avg: s.avg })) ?? [];

  const exams = [...new Set((profile?.marks ?? []).map((m) => m.exam))];

  return (
    <DashboardShell user={user} theme={theme} nav={NAV} active={tab} onNav={setTab} onLogout={logout}>
      {loading && (
        <div className="py-20 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
          Loading your campus world…
        </div>
      )}

      {!loading && profile && tab === "overview" && (
        <div className="space-y-6">
          {/* Hero */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className={cn("bg-gradient-to-r p-6 text-white flex flex-col sm:flex-row sm:items-center gap-4", theme.gradient)}>
              <div className={cn("h-16 w-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-xl font-black ring-4 ring-white/30", avatarGradient(profile.name))}>
                {initials(profile.name)}
              </div>
              <div className="flex-1">
                <div className="text-2xl font-black">Hey {profile.name.split(" ")[0]}! 👋</div>
                <div className="text-sm opacity-90">
                  {profile.rollNo} · Class {profile.className} · {profile.subjects.length} subjects this term
                </div>
              </div>
              <div className="rounded-2xl bg-white/15 px-5 py-3 text-center backdrop-blur">
                <div className="text-3xl font-black">{profile.overallAvg}%</div>
                <div className="text-[11px] opacity-85">overall average</div>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Attendance", value: `${profile.attendance.pct}%`, icon: <Percent className="h-5 w-5" />, g: theme.statGradients[0] },
              { label: "Average Score", value: `${profile.overallAvg}%`, icon: <Star className="h-5 w-5" />, g: theme.statGradients[1] },
              { label: "Current Grade", value: profile.overallGrade, icon: <Trophy className="h-5 w-5" />, g: theme.statGradients[2] },
              { label: "Report Cards", value: profile.reportCards.length, icon: <FileBadge className="h-5 w-5" />, g: theme.statGradients[3] },
            ].map((c) => (
              <div key={c.label} className={cn("rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br", c.g)}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-3xl font-black">{c.value}</div>
                    <div className="text-xs opacity-85 font-medium mt-1">{c.label}</div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">{c.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">📚 Subject Performance</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fef3c7" />
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

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">🗓️ Attendance Split</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={attDonut} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={4}>
                      {attDonut.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!loading && profile && tab === "profile" && (
        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="border-0 shadow-lg lg:col-span-1">
            <CardContent className="p-6 text-center space-y-3">
              <div className={cn("h-24 w-24 mx-auto rounded-3xl bg-gradient-to-br flex items-center justify-center text-3xl font-black text-white shadow-xl", avatarGradient(profile.name))}>
                {initials(profile.name)}
              </div>
              <div>
                <div className="text-xl font-black">{profile.name}</div>
                <Badge className={cn("mt-1 rounded-full", theme.chip)} variant="secondary">
                  Class {profile.className} · {profile.rollNo}
                </Badge>
              </div>
              {profile.bio && <p className="text-xs text-gray-500 italic">“{profile.bio}”</p>}
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">🪪 Student Profile</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-2.5 text-sm">
              {[
                ["Email", profile.email],
                ["Phone", profile.phone ?? "—"],
                ["Date of Birth", profile.dob ?? "—"],
                ["Gender", profile.gender ?? "—"],
                ["Class Teacher", profile.classTeacher],
                ["Guardian", profile.parent ? `${profile.parent.name} (${profile.parent.relation})` : "—"],
                ["Address", profile.address ?? "—"],
                ["Joined", fmtDate(profile.joined)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-orange-50/70 px-3.5 py-2.5">
                  <div className="text-[11px] text-orange-400 font-semibold">{k}</div>
                  <div className="font-semibold text-gray-700">{v}</div>
                </div>
              ))}
              <div className="sm:col-span-2">
                <div className="text-[11px] text-orange-400 font-semibold mb-1">Subjects</div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.subjects.map((s) => (
                    <Badge key={s.code} variant="secondary" className={cn("rounded-full", theme.chip)}>{s.name}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && profile && tab === "attendance" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Present", profile.attendance.present, "bg-emerald-100 text-emerald-700"],
              ["Late", profile.attendance.late, "bg-amber-100 text-amber-700"],
              ["Absent", profile.attendance.absent, "bg-rose-100 text-rose-700"],
              ["On Leave", profile.attendance.leave, "bg-violet-100 text-violet-700"],
            ].map(([label, value, color]) => (
              <div key={label as string} className={cn("rounded-2xl p-4 text-center", color as string)}>
                <div className="text-2xl font-black">{value as number}</div>
                <div className="text-xs font-semibold opacity-80">{label as string}</div>
              </div>
            ))}
          </div>
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">📆 Recent Attendance ({profile.attendance.pct}% overall)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {profile.attendanceLog.map((a) => (
                <div key={a.id} className={cn("rounded-xl px-3 py-2 text-center", ATT_STYLE[a.status])}>
                  <div className="text-xs font-bold">{a.date.slice(5)}</div>
                  <div className="text-[10px] font-semibold">{a.status}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && profile && tab === "marks" && (
        <div className="space-y-5">
          {exams.map((exam) => {
            const marks = profile.marks.filter((m) => m.exam === exam);
            const avg = Math.round((marks.reduce((s, m) => s + (m.score / (m.maxScore || 100)) * 100, 0) / (marks.length || 1)) * 10) / 10;
            return (
              <Card key={exam} className="border-0 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-white flex justify-between items-center">
                  <div className="font-bold">{exam}</div>
                  <div className="text-sm font-semibold">Average: {avg}%</div>
                </div>
                <Table>
                  <TableBody>
                    {marks.map((m) => {
                      const pct = Math.round((m.score / (m.maxScore || 100)) * 100);
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-semibold">{m.subject}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{m.score}/{m.maxScore}</TableCell>
                          <TableCell className="w-40">
                            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-500")}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold w-14">{pct}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            );
          })}
          {exams.length === 0 && (
            <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-gray-400">No marks published yet.</CardContent></Card>
          )}
        </div>
      )}

      {!loading && profile && tab === "report" && (
        <div className="space-y-5 max-w-2xl">
          {profile.reportCards.length > 0 ? (
            profile.reportCards.map((c) => <ReportCardView key={c.id} card={c} studentName={profile.name} />)
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-gray-400">
                <div className="text-4xl mb-2">📄</div>
                Your report cards will appear here once your teacher generates them.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!loading && profile && tab === "studyplan" && (
        <StudyPlanPanel
          studentId={profile.id}
          theme={theme}
          subjects={profile.subjects.map((s) => s.name)}
          plans={profile.studyPlans}
          onRefresh={load}
        />
      )}
    </DashboardShell>
  );
}
