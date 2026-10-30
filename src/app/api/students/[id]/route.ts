import { db } from "@/lib/db";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { attendanceStats, avgScore, gradeFor } from "@/lib/grades";

// GET /api/students/[id] → full profile with stats (admin, teacher, linked parent, self)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const student = await db.student.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, createdAt: true } },
      class: { include: { subjects: true, teacher: { include: { user: { select: { name: true } } } } } },
      parent: { include: { user: { select: { name: true, email: true } } } },
      attendance: { orderBy: { date: "desc" } },
      marks: { include: { subject: { select: { name: true, code: true } } }, orderBy: { createdAt: "asc" } },
      reportCards: { orderBy: { createdAt: "desc" } },
      studyPlans: { orderBy: { createdAt: "desc" } },
      enrollments: { include: { class: { select: { name: true } } } },
    },
  });
  if (!student) return Response.json({ error: "Student not found" }, { status: 404 });

  // access control
  if (me.role === "STUDENT" && me.student?.id !== id) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (me.role === "PARENT" && !me.parent?.childrenIds.includes(id)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const att = attendanceStats(student.attendance);
  const overall = avgScore(student.marks);
  const { grade } = gradeFor(overall);

  // per-subject averages
  const bySubject = new Map<string, { name: string; code: string; scores: number[] }>();
  for (const m of student.marks) {
    const key = m.subject.code;
    if (!bySubject.has(key)) bySubject.set(key, { name: m.subject.name, code: key, scores: [] });
    bySubject.get(key)!.scores.push((m.score / (m.maxScore || 100)) * 100);
  }
  const subjectAverages = [...bySubject.values()].map((s) => ({
    name: s.name,
    code: s.code,
    avg: Math.round((s.scores.reduce((a, b) => a + b, 0) / s.scores.length) * 10) / 10,
  }));

  return Response.json({
    student: {
      id: student.id,
      name: student.user.name,
      email: student.user.email,
      rollNo: student.rollNo,
      classId: student.classId,
      className: student.class?.name ?? "—",
      classTeacher: student.class?.teacher?.user.name ?? "—",
      subjects: student.class?.subjects.map((s) => ({ name: s.name, code: s.code })) ?? [],
      dob: student.dob,
      gender: student.gender,
      phone: student.phone,
      address: student.address,
      bio: student.bio,
      joined: student.user.createdAt,
      parent: student.parent ? { name: student.parent.user.name, email: student.parent.user.email, relation: student.parent.relation, phone: student.parent.phone } : null,
      attendance: att,
      overallAvg: overall,
      overallGrade: grade,
      subjectAverages,
      marks: student.marks.map((m) => ({ id: m.id, exam: m.exam, subject: m.subject.name, score: m.score, maxScore: m.maxScore })),
      attendanceLog: student.attendance.slice(0, 40),
      reportCards: student.reportCards,
      studyPlans: student.studyPlans,
      enrollments: student.enrollments.map((e) => ({ id: e.id, className: e.class.name, status: e.status, date: e.createdAt })),
    },
  });
}

// PATCH /api/students/[id] → update (admin only)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return Response.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, rollNo, classId, dob, gender, phone, address, bio, password } = body;

  const student = await db.student.findUnique({ where: { id }, include: { user: true } });
  if (!student) return Response.json({ error: "Student not found" }, { status: 404 });

  if (name) await db.user.update({ where: { id: student.userId }, data: { name } });
  if (password) await db.user.update({ where: { id: student.userId }, data: { passwordHash: hashPassword(password) } });

  await db.student.update({
    where: { id },
    data: {
      ...(rollNo ? { rollNo } : {}),
      ...(classId !== undefined ? { classId: classId || null } : {}),
      ...(dob !== undefined ? { dob } : {}),
      ...(gender !== undefined ? { gender } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(bio !== undefined ? { bio } : {}),
    },
  });

  return Response.json({ ok: true });
}

// DELETE /api/students/[id] → remove student + user (admin only)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return Response.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const student = await db.student.findUnique({ where: { id } });
  if (!student) return Response.json({ error: "Student not found" }, { status: 404 });

  await db.user.delete({ where: { id: student.userId } });
  return Response.json({ ok: true });
}
