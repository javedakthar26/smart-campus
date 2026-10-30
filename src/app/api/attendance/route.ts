import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { attendanceStats } from "@/lib/grades";

// GET /api/attendance?classId=&date=   → roster with statuses (teacher/admin)
// GET /api/attendance?studentId=&limit= → one student's log (any role w/ access)
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const date = url.searchParams.get("date");
  const studentId = url.searchParams.get("studentId");
  const limit = Number(url.searchParams.get("limit") ?? 60);

  if (classId && date) {
    if (!["ADMIN", "TEACHER"].includes(me.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

    const students = await db.student.findMany({
      where: { classId },
      include: { user: { select: { name: true } }, attendance: { where: { date } } },
      orderBy: { rollNo: "asc" },
    });

    return Response.json({
      roster: students.map((s) => ({
        studentId: s.id,
        rollNo: s.rollNo,
        name: s.user.name,
        status: s.attendance[0]?.status ?? null,
      })),
      existing: students.some((s) => s.attendance.length > 0),
    });
  }

  if (studentId) {
    if (me.role === "STUDENT" && me.student?.id !== studentId) return Response.json({ error: "Forbidden" }, { status: 403 });
    if (me.role === "PARENT" && !me.parent?.childrenIds.includes(studentId)) return Response.json({ error: "Forbidden" }, { status: 403 });

    const records = await db.attendance.findMany({
      where: { studentId },
      include: { class: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: limit,
    });
    return Response.json({
      records: records.map((r) => ({ id: r.id, date: r.date, status: r.status, className: r.class.name })),
      stats: attendanceStats(records),
    });
  }

  return Response.json({ error: "Provide classId+date or studentId" }, { status: 400 });
}

// POST /api/attendance → bulk mark for a class on a date (teacher/admin)
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "TEACHER"].includes(me.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { classId, date, records } = await req.json();
  if (!classId || !date || !Array.isArray(records)) {
    return Response.json({ error: "classId, date and records[] required" }, { status: 400 });
  }

  let saved = 0;
  for (const r of records) {
    if (!r.studentId || !r.status) continue;
    await db.attendance.upsert({
      where: { studentId_classId_date: { studentId: r.studentId, classId, date } },
      create: { studentId: r.studentId, classId, date, status: r.status },
      update: { status: r.status },
    });
    saved++;
  }

  return Response.json({ ok: true, saved });
}
