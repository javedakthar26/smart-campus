import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { attendanceStats, gradeFor } from "@/lib/grades";

// GET /api/stats → admin overview data
export async function GET() {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const [studentCount, teacherCount, classCount, parentCount, classes, students, allAttendance] = await Promise.all([
    db.student.count(),
    db.teacher.count(),
    db.class.count(),
    db.parent.count(),
    db.class.findMany({ include: { _count: { select: { students: true, enrollments: true } } }, orderBy: { name: "asc" } }),
    db.student.findMany({ include: { attendance: { select: { status: true, date: true } }, marks: { select: { score: true, maxScore: true } } } }),
    db.attendance.findMany({ where: { date: { gte: new Date(Date.now() - 20 * 864e5).toISOString().slice(0, 10) } }, select: { date: true, status: true } }),
  ]);

  // attendance trend by date
  const byDate = new Map<string, { present: number; total: number }>();
  for (const a of allAttendance) {
    if (!byDate.has(a.date)) byDate.set(a.date, { present: 0, total: 0 });
    const d = byDate.get(a.date)!;
    d.total++;
    if (a.status === "PRESENT" || a.status === "LATE") d.present++;
  }
  const trend = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([date, v]) => ({ date: date.slice(5), pct: v.total ? Math.round((v.present / v.total) * 100) : 0 }));

  const avgAtt = students.length
    ? Math.round((students.reduce((s, st) => s + attendanceStats(st.attendance).pct, 0) / students.length) * 10) / 10
    : 0;
  const overallAvg = students.length
    ? Math.round((students.reduce((s, st) => s + st.marks.reduce((x, m) => x + (m.score / (m.maxScore || 100)) * 100, 0) / (st.marks.length || 1), 0) / students.length) * 10) / 10
    : 0;

  // grade distribution
  const dist = { "A+": 0, A: 0, "B+": 0, B: 0, C: 0, D: 0, F: 0 };
  for (const st of students) {
    if (st.marks.length === 0) continue;
    const avg = st.marks.reduce((s, m) => s + (m.score / (m.maxScore || 100)) * 100, 0) / st.marks.length;
    dist[gradeFor(avg).grade]++;
  }

  return Response.json({
    totals: { students: studentCount, teachers: teacherCount, classes: classCount, parents: parentCount, avgAttendance: avgAtt, avgScore: overallAvg },
    enrollmentByClass: classes.map((c) => ({ name: c.name, students: c._count.students, enrollments: c._count.enrollments })),
    attendanceTrend: trend,
    gradeDistribution: Object.entries(dist).map(([grade, count]) => ({ grade, count })),
  });
}
