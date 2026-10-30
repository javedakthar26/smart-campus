import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// GET /api/classes → all classes with subjects, teacher, student count
export async function GET() {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const classes = await db.class.findMany({
    include: {
      subjects: { orderBy: { name: "asc" } },
      teacher: { include: { user: { select: { name: true } } } },
      students: { select: { id: true } },
      enrollments: { select: { id: true, status: true } },
    },
    orderBy: { name: "asc" },
  });

  return Response.json({
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      room: c.room,
      teacherName: c.teacher?.user.name ?? null,
      studentCount: c.students.length,
      activeEnrollments: c.enrollments.filter((e) => e.status === "ACTIVE").length,
      subjects: c.subjects.map((s) => ({ id: s.id, name: s.name, code: s.code })),
    })),
  });
}
