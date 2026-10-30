"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart,
  Area,
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
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  Award,
} from "lucide-react";
import { api, fmtDate, todayStr } from "@/lib/campus-client";
import { ROLE_THEMES } from "@/lib/campus-theme";
import type { AdminStats, ClassRow, EnrollmentRow, SessionUser, StudentProfile, StudentRow } from "@/lib/campus-types";
import { cn } from "@/lib/utils";
import { DashboardShell, type NavItem } from "./shell";
import { ReportGenerator } from "./report-card";

const NAV: NavItem[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "students", label: "Students", icon: <Users className="h-4 w-4" /> },
  { key: "enrollment", label: "Enrollment", icon: <UserPlus className="h-4 w-4" /> },
  { key: "attendance", label: "Attendance", icon: <CalendarCheck className="h-4 w-4" /> },
  { key: "reports", label: "Report Cards", icon: <Award className="h-4 w-4" /> },
];

const STATUS_STYLE: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700",
  LATE: "bg-amber-100 text-amber-700",
  ABSENT: "bg-rose-100 text-rose-700",
  LEAVE: "bg-violet-100 text-violet-700",
};

export function AdminDashboard({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const theme = ROLE_THEMES.ADMIN;
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [search, setSearch] = useState("");

  const loadStudents = useCallback(async (q = "") => {
    const data = await api<{ students: StudentRow[] }>(`/api/students${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    setStudents(data.students);
  }, []);

  const loadClasses = useCallback(async () => {
    const data = await api<{ classes: ClassRow[] }>("/api/classes");
    setClasses(data.classes);
  }, []);

  const loadEnrollments = useCallback(async () => {
    const data = await api<{ enrollments: EnrollmentRow[] }>("/api/enrollments");
    setEnrollments(data.enrollments);
  }, []);

  useEffect(() => {
    api<AdminStats>("/api/stats").then((d) => setStats(d)).catch(() => {});
    api<{ students: StudentRow[] }>("/api/students").then((d) => setStudents(d.students)).catch(() => {});
    api<{ classes: ClassRow[] }>("/api/classes").then((d) => setClasses(d.classes)).catch(() => {});
    api<{ enrollments: EnrollmentRow[] }>("/api/enrollments").then((d) => setEnrollments(d.enrollments)).catch(() => {});
  }, []);

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q) || s.className.toLowerCase().includes(q));
  }, [students, search]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
  }

  return (
    <DashboardShell
      user={user}
      theme={theme}
      nav={NAV}
      active={tab}
      onNav={setTab}
      onLogout={logout}
    >
      {tab === "overview" && (
        <OverviewTab theme={theme} stats={stats} students={students} onGoStudents={() => setTab("students")} />
      )}
      {tab === "students" && (
        <StudentsTab
          theme={theme}
          students={filteredStudents}
          classes={classes}
          search={search}
          onSearch={setSearch}
          onReload={() => {
            loadStudents();
            loadClasses();
          }}
        />
      )}
      {tab === "enrollment" && (
        <EnrollmentTab
          theme={theme}
          students={students}
          classes={classes}
          enrollments={enrollments}
          onReload={() => {
            loadEnrollments();
            loadStudents();
            loadClasses();
          }}
        />
      )}
      {tab === "attendance" && <AdminAttendanceTab theme={theme} classes={classes} />}
      {tab === "reports" && (
        <ReportGenerator
          students={students.map((s) => ({ id: s.id, name: s.name, rollNo: s.rollNo, className: s.className }))}
          theme={theme}
          user={user}
        />
      )}
    </DashboardShell>
  );
}

// ─────────────────────────── Overview ───────────────────────────

function OverviewTab({
  theme,
  stats,
  students,
  onGoStudents,
}: {
  theme: typeof ROLE_THEMES.ADMIN;
  stats: AdminStats | null;
  students: StudentRow[];
  onGoStudents: () => void;
}) {
  const cards = stats
    ? [
        { label: "Total Students", value: stats.totals.students, icon: <Users className="h-5 w-5" />, g: theme.statGradients[0] },
        { label: "Teachers", value: stats.totals.teachers, icon: <GraduationCap className="h-5 w-5" />, g: theme.statGradients[1] },
        { label: "Classes", value: stats.totals.classes, icon: <LayoutDashboard className="h-5 w-5" />, g: theme.statGradients[2] },
        { label: "Avg Attendance", value: `${stats.totals.avgAttendance}%`, icon: <TrendingUp className="h-5 w-5" />, g: theme.statGradients[3] },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(stats ? cards : Array.from({ length: 4 })).map((c: (typeof cards)[number] | null, i) =>
          c ? (
            <div key={c.label} className={cn("rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br", c.g)}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-3xl font-black">{c.value}</div>
                  <div className="text-xs opacity-85 font-medium mt-1">{c.label}</div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">{c.icon}</div>
              </div>
            </div>
          ) : (
            <div key={i} className="rounded-2xl p-5 bg-white shadow animate-pulse h-[100px]" />
          )
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">📈 Attendance Trend (last 14 school days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {stats && stats.attendanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.attendanceTrend}>
                  <defs>
                    <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#d946ef" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis domain={[0, 100]} fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="pct" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#attGrad)" name="Attendance %" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton />
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">📊 Students per Class</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {stats ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.enrollmentByClass}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="students" radius={[8, 8, 0, 0]} name="Students">
                    {stats.enrollmentByClass.map((_, i) => (
                      <Cell key={i} fill={theme.chart[i % theme.chart.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">🏆 Grade Distribution (overall averages)</CardTitle>
          <Button size="sm" variant="outline" className="rounded-full" onClick={onGoStudents}>
            Manage students
          </Button>
        </CardHeader>
        <CardContent className="h-56">
          {stats ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.gradeDistribution.filter((g) => g.count > 0)}
                  dataKey="count"
                  nameKey="grade"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {stats.gradeDistribution
                    .filter((g) => g.count > 0)
                    .map((g, i) => (
                      <Cell key={g.grade} fill={theme.chart[i % theme.chart.length]} />
                    ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton />
          )}
        </CardContent>
      </Card>

      {students.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">⭐ Recent Students</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {students.slice(0, 6).map((s) => (
              <Badge key={s.id} variant="secondary" className={cn("rounded-full px-3 py-1.5", theme.chip)}>
                {s.name} · {s.className}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Skeleton() {
  return <div className="h-full w-full rounded-xl bg-gray-100 animate-pulse" />;
}

// ─────────────────────────── Students CRUD ───────────────────────────

const emptyForm = {
  name: "",
  email: "",
  password: "",
  rollNo: "",
  classId: "",
  dob: "",
  gender: "",
  phone: "",
  address: "",
  bio: "",
};

function StudentsTab({
  theme,
  students,
  classes,
  search,
  onSearch,
  onReload,
}: {
  theme: typeof ROLE_THEMES.ADMIN;
  students: StudentRow[];
  classes: ClassRow[];
  search: string;
  onSearch: (v: string) => void;
  onReload: () => void;
}) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  async function addStudent() {
    setSaving(true);
    try {
      await api("/api/students", { method: "POST", body: JSON.stringify(form) });
      toast({ title: "✅ Student enrolled", description: `${form.name} added to campus` });
      setAddOpen(false);
      setForm(emptyForm);
      onReload();
    } catch (e) {
      toast({ title: "Could not add student", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function openProfile(id: string) {
    setProfileLoading(true);
    try {
      const data = await api<{ student: StudentProfile }>(`/api/students/${id}`);
      setProfile(data.student);
    } catch (e) {
      toast({ title: "Could not load profile", description: (e as Error).message, variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  }

  function startEdit(s: StudentRow) {
    setEditing(s);
    setEditForm({ ...emptyForm, name: s.name, rollNo: s.rollNo, classId: s.classId ?? "", phone: s.phone ?? "", gender: s.gender ?? "" });
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await api(`/api/students/${editing.id}`, { method: "PATCH", body: JSON.stringify(editForm) });
      toast({ title: "✏️ Student updated" });
      setEditing(null);
      onReload();
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function remove(s: StudentRow) {
    if (!confirm(`Delete ${s.name}? This removes their profile, marks and attendance.`)) return;
    try {
      await api(`/api/students/${s.id}`, { method: "DELETE" });
      toast({ title: "🗑️ Student removed" });
      onReload();
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search name, roll no, class…" value={search} onChange={(e) => onSearch(e.target.value)} className="pl-9 h-11 rounded-xl" />
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className={cn("rounded-xl h-11 font-semibold", theme.button)}>
              <Plus className="h-4 w-4" /> Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>➕ Add New Student</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Full name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Temp password *</Label>
                <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Student@123" />
              </div>
              <div className="space-y-1">
                <Label>Roll no *</Label>
                <Input value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} placeholder="S1007" />
              </div>
              <div className="space-y-1">
                <Label>Class</Label>
                <Select value={form.classId || undefined} onValueChange={(v) => setForm({ ...form, classId: v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Date of birth</Label>
                <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Gender</Label>
                <Select value={form.gender || undefined} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Address</Label>
                <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <Button onClick={addStudent} disabled={saving} className={cn("w-full h-11 rounded-xl font-semibold", theme.button)}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Student
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Student</TableHead>
                <TableHead>Roll</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.email}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.rollNo}</TableCell>
                  <TableCell><Badge variant="secondary" className={cn("rounded-full", theme.chip)}>{s.className}</Badge></TableCell>
                  <TableCell>
                    <span className={cn("font-semibold", s.attendancePct >= 85 ? "text-emerald-600" : s.attendancePct >= 70 ? "text-amber-600" : "text-rose-600")}>
                      {s.attendancePct}%
                    </span>
                  </TableCell>
                  <TableCell>{s.avgScore}%</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="View profile"
                        onClick={() => openProfile(s.id)}>
                        <Search className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Edit"
                        onClick={() => startEdit(s)}>
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Delete"
                        onClick={() => remove(s)}>
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-10">No students found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Profile dialog */}
      <Dialog open={!!profile} onOpenChange={(o) => !o && setProfile(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {profileLoading || !profile ? (
            <div className="py-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" /> Loading profile…
            </div>
          ) : (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl">🎓 {profile.name}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Info label="Roll No" value={profile.rollNo} />
                <Info label="Class" value={profile.className} />
                <Info label="Email" value={profile.email} />
                <Info label="Phone" value={profile.phone ?? "—"} />
                <Info label="Gender" value={profile.gender ?? "—"} />
                <Info label="DOB" value={profile.dob ?? "—"} />
                <Info label="Class Teacher" value={profile.classTeacher} />
                <Info label="Guardian" value={profile.parent ? `${profile.parent.name} (${profile.parent.relation})` : "—"} />
              </div>
              {profile.bio && <p className="text-sm text-gray-500 italic">“{profile.bio}”</p>}
              <div className="grid grid-cols-3 gap-2">
                <MiniStat value={`${profile.attendance.pct}%`} label="Attendance" color="bg-emerald-100 text-emerald-700" />
                <MiniStat value={`${profile.overallAvg}%`} label="Avg Score" color="bg-amber-100 text-amber-700" />
                <MiniStat value={profile.overallGrade} label="Grade" color="bg-violet-100 text-violet-700" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1.5">Enrollments</div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.enrollments.map((e) => (
                    <Badge key={e.id} variant="secondary" className="rounded-full">
                      {e.className} · {e.status}
                    </Badge>
                  ))}
                  {profile.enrollments.length === 0 && <span className="text-xs text-gray-400">None yet</span>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>✏️ Edit {editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Roll No</Label>
              <Input value={editForm.rollNo} onChange={(e) => setEditForm({ ...editForm, rollNo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Class</Label>
              <Select value={editForm.classId || undefined} onValueChange={(v) => setEditForm({ ...editForm, classId: v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>New password (optional)</Label>
              <Input value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank" />
            </div>
          </div>
          <Button onClick={saveEdit} className={cn("w-full h-11 rounded-xl font-semibold", theme.button)}>Save Changes</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <div className="text-[11px] text-gray-400 font-medium">{label}</div>
      <div className="text-sm font-semibold truncate">{value}</div>
    </div>
  );
}

function MiniStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className={cn("rounded-xl p-3 text-center", color)}>
      <div className="text-lg font-black">{value}</div>
      <div className="text-[10px] font-medium opacity-80">{label}</div>
    </div>
  );
}

// ─────────────────────────── Enrollment ───────────────────────────

function EnrollmentTab({
  theme,
  students,
  classes,
  enrollments,
  onReload,
}: {
  theme: typeof ROLE_THEMES.ADMIN;
  students: StudentRow[];
  classes: ClassRow[];
  enrollments: EnrollmentRow[];
  onReload: () => void;
}) {
  const { toast } = useToast();
  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");
  const [busy, setBusy] = useState(false);

  async function enroll() {
    if (!studentId || !classId) {
      toast({ title: "Select both student and class", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await api("/api/enrollments", { method: "POST", body: JSON.stringify({ studentId, classId }) });
      const s = students.find((x) => x.id === studentId);
      const c = classes.find((x) => x.id === classId);
      toast({ title: "🎉 Enrolled!", description: `${s?.name} → ${c?.name}` });
      setStudentId("");
      setClassId("");
      onReload();
    } catch (e) {
      toast({ title: "Enrollment failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    try {
      await api("/api/enrollments", { method: "PATCH", body: JSON.stringify({ id, status }) });
      toast({ title: `Status → ${status}` });
      onReload();
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <Card className="border-0 shadow-lg h-fit lg:sticky lg:top-24">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className={cn("h-5 w-5", theme.text)} /> New Enrollment
          </CardTitle>
          <p className="text-sm text-gray-500">Assign a student into a class for the current term.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={studentId || undefined} onValueChange={setStudentId}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Choose student" /></SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name} · {s.rollNo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classId || undefined} onValueChange={setClassId}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Choose class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} ({c.studentCount} students)</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={enroll} disabled={busy} className={cn("w-full h-11 rounded-xl font-semibold", theme.button)}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enroll Student
          </Button>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-3">
        {enrollments.map((e) => (
          <Card key={e.id} className="border-0 shadow-md">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{e.studentName} <span className="text-xs font-mono text-gray-400">{e.rollNo}</span></div>
                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                  <ClipboardList className="h-3.5 w-3.5" /> {e.className} · enrolled {fmtDate(e.date)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    "rounded-full",
                    e.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : e.status === "WITHDRAWN" ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-600"
                  )}
                >
                  {e.status}
                </Badge>
                {e.status !== "ACTIVE" && (
                  <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => setStatus(e.id, "ACTIVE")}>
                    Reactivate
                  </Button>
                )}
                {e.status === "ACTIVE" && (
                  <>
                    <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => setStatus(e.id, "COMPLETED")}>
                      Complete
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full h-8 text-rose-600" onClick={() => setStatus(e.id, "WITHDRAWN")}>
                      Withdraw
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {enrollments.length === 0 && (
          <Card className="border-dashed border-0 shadow-lg">
            <CardContent className="py-10 text-center text-sm text-gray-400">No enrollments yet.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Attendance (admin) ───────────────────────────

export function AttendanceMarker({
  theme,
  classes,
  fixedClassId,
  onSavedToastTitle = "✅ Attendance saved",
}: {
  theme: typeof ROLE_THEMES.ADMIN | typeof ROLE_THEMES.TEACHER;
  classes: ClassRow[];
  fixedClassId?: string;
  onSavedToastTitle?: string;
}) {
  const { toast } = useToast();
  const [classId, setClassId] = useState(fixedClassId ?? classes[0]?.id ?? "");
  const [date, setDate] = useState(todayStr());
  const [roster, setRoster] = useState<{ studentId: string; rollNo: string; name: string; status: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRoster = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const data = await api<{ roster: typeof roster }>(`/api/attendance?classId=${classId}&date=${date}`);
      setRoster(data.roster);
    } catch (e) {
      toast({ title: "Could not load roster", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [classId, date, toast]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  function setStatus(studentId: string, status: string) {
    setRoster((r) => r.map((s) => (s.studentId === studentId ? { ...s, status } : s)));
  }

  function markAll(status: string) {
    setRoster((r) => r.map((s) => ({ ...s, status })));
  }

  async function save() {
    setSaving(true);
    try {
      const records = roster
        .filter((s) => s.status)
        .map((s) => ({ studentId: s.studentId, status: s.status }));
      await api("/api/attendance", { method: "POST", body: JSON.stringify({ classId, date, records }) });
      toast({ title: onSavedToastTitle, description: `${records.length} students marked for ${date}` });
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const marked = roster.filter((s) => s.status).length;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarCheck className={cn("h-5 w-5", theme.text)} /> Mark Attendance
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {!fixedClassId && (
            <Select value={classId || undefined} onValueChange={setClassId}>
              <SelectTrigger className="h-10 sm:w-52"><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 sm:w-44" />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => markAll("PRESENT")}>All Present</Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => markAll("ABSENT")}>All Absent</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" /> Loading roster…
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
              {roster.map((s) => (
                <div key={s.studentId} className="rounded-2xl border bg-white p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{s.name}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{s.rollNo}</div>
                  </div>
                  <div className="flex gap-1">
                    {["PRESENT", "LATE", "ABSENT", "LEAVE"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatus(s.studentId, st)}
                        aria-label={`Mark ${s.name} ${st}`}
                        className={cn(
                          "rounded-lg px-2 py-1.5 text-[10px] font-bold transition",
                          s.status === st ? STATUS_STYLE[st] + " shadow-inner ring-1 ring-current" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        )}
                      >
                        {st[0]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {roster.length === 0 && (
                <div className="col-span-2 py-8 text-center text-sm text-gray-400">No students in this class yet.</div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">{marked}/{roster.length} marked</span>
              <Button onClick={save} disabled={saving || marked === 0} className={cn("rounded-xl font-semibold", theme.button)}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />} Save Attendance
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AdminAttendanceTab({ theme, classes }: { theme: typeof ROLE_THEMES.ADMIN; classes: ClassRow[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Mark daily attendance for any class. Students & parents see updates instantly in their portals.</p>
      <AttendanceMarker theme={theme} classes={classes} />
    </div>
  );
}
