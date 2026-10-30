import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { attendanceStats, avgScore } from "@/lib/grades";

// GET /api/students?q=&classId=  → list with computed stats
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const classId = url.searchParams.get("classId") ?? "";

  const students = await db.student.findMany({
    where: {
      AND: [
        q ? { OR: [{ user: { name: { contains: q } } }, { rollNo: { contains: q } }] } : {},
        classId ? { classId } : {},
      ],
    },
    include: {
      user: { select: { name: true, email: true } },
      class: { select: { id: true, name: true } },
      attendance: { select: { status: true } },
      marks: { select: { score: true, maxScore: true } },
    },
    orderBy: { rollNo: "asc" },
  });

  return Response.json({
    students: students.map((s) => ({
      id: s.id,
      name: s.user.name,
      email: s.user.email,
      rollNo: s.rollNo,
      classId: s.classId,
      className: s.class?.name ?? "—",
      gender: s.gender,
      phone: s.phone,
      attendancePct: attendanceStats(s.attendance).pct,
      avgScore: avgScore(s.marks),
    })),
  });
}

// POST /api/students → create student (admin only)
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return Response.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();
  const { name, email, password, rollNo, classId, dob, gender, phone, address, bio } = body;
  if (!name || !email || !password || !rollNo) {
    return Response.json({ error: "Name, email, password and roll number are required" }, { status: 400 });
  }

  const emailNorm = String(email).toLowerCase().trim();
  const dupUser = await db.user.findUnique({ where: { email: emailNorm } });
  if (dupUser) return Response.json({ error: "A user with this email already exists" }, { status: 409 });
  const dupRoll = await db.student.findUnique({ where: { rollNo } });
  if (dupRoll) return Response.json({ error: "Roll number already taken" }, { status: 409 });

  const { hashPassword } = await import("@/lib/auth");
  const user = await db.user.create({
    data: { email: emailNorm, passwordHash: hashPassword(password), name, role: "STUDENT" },
  });

  const student = await db.student.create({
    data: {
      userId: user.id,
      rollNo,
      classId: classId || null,
      dob: dob || null,
      gender: gender || null,
      phone: phone || null,
      address: address || null,
      bio: bio || null,
    },
  });

  if (classId) {
    await db.enrollment.upsert({
      where: { studentId_classId: { studentId: student.id, classId } },
      create: { studentId: student.id, classId, status: "ACTIVE" },
      update: { status: "ACTIVE" },
    });
  }

  return Response.json({ ok: true, id: student.id });
}
