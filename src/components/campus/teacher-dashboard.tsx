"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Award,
  BookOpenCheck,
  CalendarCheck,
  ClipboardEdit,
  LayoutDashboard,
  Loader2,
  Save,
  Users,
} from "lucide-react";
import { api } from "@/lib/campus-client";
import { ROLE_THEMES } from "@/lib/campus-theme";
import { EXAM_OPTIONS, type ClassRow, type SessionUser, type StudentProfile, type StudentRow } from "@/lib/campus-types";
import { cn } from "@/lib/utils";
import { DashboardShell, type NavItem } from "./shell";
import { AttendanceMarker } from "./admin-dashboard";
import { ReportGenerator } from "./report-card";

const NAV: NavItem[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "attendance", label: "Attendance", icon: <CalendarCheck className="h-4 w-4" /> },
  { key: "marks", label: "Marks Entry", icon: <ClipboardEdit className="h-4 w-4" /> },
  { key: "reports", label: "Report Cards", icon: <Award className="h-4 w-4" /> },
  { key: "students", label: "My Students", icon: <Users className="h-4 w-4" /> },
];

export function TeacherDashboard({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const theme = ROLE_THEMES.TEACHER;
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    api<{ classes: ClassRow[] }>("/api/classes").then((d) => setClasses(d.classes)).catch(() => {});
    api<{ students: StudentRow[] }>("/api/students").then((d) => setStudents(d.students)).catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
  }

  async function openProfile(id: string) {
    try {
      const data = await api<{ student: StudentProfile }>(`/api/students/${id}`);
      setProfile(data.student);
    } catch (e) {
      toast({ title: "Could not load profile", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <DashboardShell user={user} theme={theme} nav={NAV} active={tab} onNav={setTab} onLogout={logout}>
      {tab === "overview" && <TeacherOverview theme={theme} user={user} classes={classes} students={students} />}
      {tab === "attendance" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Mark students present / late / absent / on-leave for any class & date.</p>
          <AttendanceMarker theme={theme} classes={classes} onSavedToastTitle="✅ Attendance saved" />
        </div>
      )}
      {tab === "marks" && <MarksEntry theme={theme} classes={classes} />}
      {tab === "reports" && (
        <ReportGenerator
          students={students.map((s) => ({ id: s.id, name: s.name, rollNo: s.rollNo, className: s.className }))}
          theme={theme}
          user={user}
        />
      )}
      {tab === "students" && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead className="text-right">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{s.rollNo}</div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className={cn("rounded-full", theme.chip)}>{s.className}</Badge></TableCell>
                    <TableCell className="font-semibold text-emerald-700">{s.attendancePct}%</TableCell>
                    <TableCell>{s.avgScore}%</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => openProfile(s.id)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={!!profile} onOpenChange={(o) => !o && setProfile(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {profile && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl">🎓 {profile.name}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-100 text-emerald-700 p-3 text-center">
                  <div className="text-lg font-black">{profile.attendance.pct}%</div>
                  <div className="text-[10px] font-medium">Attendance</div>
                </div>
                <div className="rounded-xl bg-amber-100 text-amber-700 p-3 text-center">
                  <div className="text-lg font-black">{profile.overallAvg}%</div>
                  <div className="text-[10px] font-medium">Avg Score</div>
                </div>
                <div className="rounded-xl bg-teal-100 text-teal-700 p-3 text-center">
                  <div className="text-lg font-black">{profile.overallGrade}</div>
                  <div className="text-[10px] font-medium">Grade</div>
                </div>
              </div>
              {profile.bio && <p className="text-sm text-gray-500 italic">“{profile.bio}”</p>}
              <div className="text-xs text-gray-500">
                {profile.rollNo} · {profile.className} · Guardian: {profile.parent?.name ?? "—"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function TeacherOverview({
  theme,
  user,
  classes,
  students,
}: {
  theme: typeof ROLE_THEMES.TEACHER;
  user: SessionUser;
  classes: ClassRow[];
  students: StudentRow[];
}) {
  const totalStudents = students.length;
  const mySubjects = classes.flatMap((c) => c.subjects.map((s) => s.name));
  const uniqueSubjects = [...new Set(mySubjects)];

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className={cn("bg-gradient-to-r p-6 text-white", theme.gradient)}>
          <div className="text-2xl font-black">Good to see you, {user.name.split(" ")[0]}! 📚</div>
          <div className="text-sm opacity-90 mt-1">You teach {user.teacher?.subject}. Here's your classroom at a glance.</div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Classes", value: classes.length, icon: <BookOpenCheck className="h-5 w-5" />, g: theme.statGradients[0] },
          { label: "Students", value: totalStudents, icon: <Users className="h-5 w-5" />, g: theme.statGradients[1] },
          { label: "Subjects", value: uniqueSubjects.length, icon: <ClipboardEdit className="h-5 w-5" />, g: theme.statGradients[2] },
          { label: "Pending Reports", value: Math.max(0, totalStudents - 1), icon: <Award className="h-5 w-5" />, g: theme.statGradients[3] },
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

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">📖 My Classes</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          {classes.map((c) => (
            <div key={c.id} className="rounded-2xl border p-4">
              <div className="font-bold">{c.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{c.room}</div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <Badge variant="secondary" className={cn("rounded-full", theme.chip)}>{c.studentCount} students</Badge>
                <span className="text-gray-400">{c.subjects.length} subjects</span>
              </div>
            </div>
          ))}
          {classes.length === 0 && <div className="text-sm text-gray-400">No classes assigned.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────────── Marks entry grid ─────────────────────

type MarkRow = { studentId: string; rollNo: string; name: string; marks: { subjectId: string; score: number | null }[] };

function MarksEntry({ theme, classes }: { theme: typeof ROLE_THEMES.TEACHER; classes: ClassRow[] }) {
  const { toast } = useToast();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [exam, setExam] = useState(EXAM_OPTIONS[0]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const data = await api<{ subjects: { id: string; name: string }[]; rows: MarkRow[] }>(
        `/api/marks?classId=${classId}&exam=${encodeURIComponent(exam)}`
      );
      setSubjects(data.subjects);
      setRows(data.rows);
    } catch (e) {
      toast({ title: "Could not load marks", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [classId, exam, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function setScore(studentId: string, subjectId: string, value: string) {
    const num = value === "" ? null : Math.max(0, Math.min(100, Number(value)));
    setRows((rs) =>
      rs.map((r) =>
        r.studentId === studentId
          ? { ...r, marks: r.marks.map((m) => (m.subjectId === subjectId ? { ...m, score: num } : m)) }
          : r
      )
    );
  }

  async function save() {
    setSaving(true);
    try {
      const records = rows.flatMap((r) =>
        r.marks.filter((m) => m.score !== null).map((m) => ({ studentId: r.studentId, subjectId: m.subjectId, score: m.score }))
      );
      await api("/api/marks", { method: "POST", body: JSON.stringify({ exam, records }) });
      toast({ title: "✅ Marks saved", description: `${records.length} entries for ${exam}` });
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const filled = useMemo(() => rows.reduce((n, r) => n + r.marks.filter((m) => m.score !== null).length, 0), [rows]);
  const total = rows.length * subjects.length;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardEdit className={cn("h-5 w-5", theme.text)} /> Marks Entry
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <Select value={classId || undefined} onValueChange={setClassId}>
            <SelectTrigger className="h-10 sm:w-52"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={exam} onValueChange={setExam}>
            <SelectTrigger className="h-10 sm:w-48"><SelectValue placeholder="Exam" /></SelectTrigger>
            <SelectContent>
              {EXAM_OPTIONS.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-gray-400 self-center">{filled}/{total} filled · max 100 each</span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" /> Loading marks…
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Student</TableHead>
                    {subjects.map((s) => (
                      <TableHead key={s.id} className="text-center">{s.name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.studentId}>
                      <TableCell>
                        <div className="font-semibold text-sm">{r.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{r.rollNo}</div>
                      </TableCell>
                      {r.marks.map((m) => (
                        <TableCell key={m.subjectId} className="text-center">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={m.score ?? ""}
                            onChange={(e) => setScore(r.studentId, m.subjectId, e.target.value)}
                            className="h-9 w-20 mx-auto text-center rounded-lg"
                            aria-label={`Score for ${r.name}`}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={subjects.length + 1} className="text-center text-gray-400 py-10">
                        No students in this class.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={save} disabled={saving || filled === 0} className={cn("rounded-xl font-semibold", theme.button)}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Marks
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
