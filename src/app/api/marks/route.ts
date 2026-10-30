import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// GET /api/marks?classId=&exam=   → class marksheet for an exam (teacher/admin)
// GET /api/marks?studentId=       → one student's marks grouped by exam (role-checked)
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const exam = url.searchParams.get("exam");
  const studentId = url.searchParams.get("studentId");

  if (classId && exam) {
    if (!["ADMIN", "TEACHER"].includes(me.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

    const cls = await db.class.findUnique({
      where: { id: classId },
      include: { subjects: { orderBy: { name: "asc" } } },
    });
    const students = await db.student.findMany({
      where: { classId },
      include: {
        user: { select: { name: true } },
        marks: { where: { exam } },
      },
      orderBy: { rollNo: "asc" },
    });

    return Response.json({
      subjects: cls?.subjects.map((s) => ({ id: s.id, name: s.name })) ?? [],
      rows: students.map((s) => ({
        studentId: s.id,
        rollNo: s.rollNo,
        name: s.user.name,
        marks: cls?.subjects.map((sub) => {
          const m = s.marks.find((x) => x.subjectId === sub.id);
          return { subjectId: sub.id, score: m?.score ?? null };
        }) ?? [],
      })),
    });
  }

  if (studentId) {
    if (me.role === "STUDENT" && me.student?.id !== studentId) return Response.json({ error: "Forbidden" }, { status: 403 });
    if (me.role === "PARENT" && !me.parent?.childrenIds.includes(studentId)) return Response.json({ error: "Forbidden" }, { status: 403 });

    const marks = await db.mark.findMany({
      where: { studentId },
      include: { subject: { select: { name: true, code: true } } },
      orderBy: { createdAt: "asc" },
    });
    return Response.json({
      marks: marks.map((m) => ({ id: m.id, exam: m.exam, subject: m.subject.name, code: m.subject.code, score: m.score, maxScore: m.maxScore })),
    });
  }

  return Response.json({ error: "Provide classId+exam or studentId" }, { status: 400 });
}

// POST /api/marks → bulk save for a class + exam (teacher/admin)
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "TEACHER"].includes(me.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { exam, records } = await req.json();
  if (!exam || !Array.isArray(records)) return Response.json({ error: "exam and records[] required" }, { status: 400 });

  let saved = 0;
  for (const r of records) {
    if (!r.studentId || !r.subjectId || r.score === null || r.score === undefined || r.score === "") continue;
    const score = Math.max(0, Math.min(100, Number(r.score)));
    await db.mark.upsert({
      where: { studentId_subjectId_exam: { studentId: r.studentId, subjectId: r.subjectId, exam } },
      create: { studentId: r.studentId, subjectId: r.subjectId, exam, score, maxScore: 100 },
      update: { score, maxScore: 100 },
    });
    saved++;
  }

  return Response.json({ ok: true, saved });
}
