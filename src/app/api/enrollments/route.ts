import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// GET /api/enrollments → all enrollments with student + class
export async function GET() {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "TEACHER"].includes(me.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const enrollments = await db.enrollment.findMany({
    include: {
      student: { include: { user: { select: { name: true } } } },
      class: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    enrollments: enrollments.map((e) => ({
      id: e.id,
      studentId: e.student.id,
      studentName: e.student.user.name,
      rollNo: e.student.rollNo,
      classId: e.class.id,
      className: e.class.name,
      status: e.status,
      date: e.createdAt,
    })),
  });
}

// POST /api/enrollments → enroll student into a class (admin only)
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return Response.json({ error: "Admin only" }, { status: 403 });

  const { studentId, classId } = await req.json();
  if (!studentId || !classId) return Response.json({ error: "studentId and classId required" }, { status: 400 });

  const student = await db.student.findUnique({ where: { id: studentId } });
  const cls = await db.class.findUnique({ where: { id: classId } });
  if (!student || !cls) return Response.json({ error: "Student or class not found" }, { status: 404 });

  const enrollment = await db.enrollment.upsert({
    where: { studentId_classId: { studentId, classId } },
    create: { studentId, classId, status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });

  await db.student.update({ where: { id: studentId }, data: { classId } });

  return Response.json({ ok: true, enrollment });
}

// PATCH /api/enrollments → change status (admin only)
export async function PATCH(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return Response.json({ error: "Admin only" }, { status: 403 });

  const { id, status } = await req.json();
  if (!id || !status) return Response.json({ error: "id and status required" }, { status: 400 });

  const enrollment = await db.enrollment.update({ where: { id }, data: { status } });
  return Response.json({ ok: true, enrollment });
}
