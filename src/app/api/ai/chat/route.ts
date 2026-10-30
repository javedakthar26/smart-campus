import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { aiChat } from "@/lib/ai";
import { attendanceStats, avgScore, gradeFor } from "@/lib/grades";

// GET /api/ai/chat → history for current user
export async function GET() {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const history = await db.chatMessage.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "asc" },
    take: 60,
  });
  return Response.json({ history });
}

// DELETE /api/ai/chat → clear history
export async function DELETE() {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await db.chatMessage.deleteMany({ where: { userId: me.id } });
  return Response.json({ ok: true });
}

// POST /api/ai/chat → ask the campus assistant
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message || !String(message).trim()) return Response.json({ error: "message required" }, { status: 400 });

  // Build role-aware live context from the database
  let context = `User: ${me.name} (role: ${me.role}).`;

  if (me.role === "ADMIN") {
    const [students, teachers, classes, recentAtt] = await Promise.all([
      db.student.findMany({ include: { user: { select: { name: true } }, attendance: { select: { status: true } }, marks: { select: { score: true, maxScore: true } } } }),
      db.teacher.count(),
      db.class.findMany({ include: { _count: { select: { students: true } } } }),
      db.attendance.findMany({ where: { date: new Date().toISOString().slice(0, 10) }, select: { status: true } }),
    ]);
    const avgAtt = students.length
      ? Math.round((students.reduce((s, st) => s + attendanceStats(st.attendance).pct, 0) / students.length) * 10) / 10
      : 0;
    context += ` Campus stats: ${students.length} students, ${teachers} teachers, ${classes.length} classes (${classes.map((c) => `${c.name}: ${c._count.students} students`).join("; ")}). Average attendance ${avgAtt}%. Today ${recentAtt.length} attendance entries. Students: ${students.map((s) => `${s.user.name} (${s.rollNo})`).join(", ")}.`;
  } else if (me.role === "TEACHER" && me.teacher) {
    const classes = await db.class.findMany({
      where: { teacherId: me.teacher.id },
      include: { students: { include: { user: { select: { name: true } } } } },
    });
    context += ` You teach ${me.teacher.subject}. Your classes: ${classes.map((c) => `${c.name} (${c.students.length} students: ${c.students.map((s) => s.user.name).join(", ")})`).join("; ") || "none assigned"}.`;
  } else if (me.role === "STUDENT" && me.student) {
    const stu = await db.student.findUnique({
      where: { id: me.student.id },
      include: { class: { include: { subjects: { select: { name: true } } } }, attendance: { select: { status: true } }, marks: { select: { score: true, maxScore: true, exam: true } } },
    });
    const att = attendanceStats(stu?.attendance ?? []);
    const avg = avgScore(stu?.marks ?? []);
    const { grade } = gradeFor(avg);
    context += ` You are student ${me.name}, roll ${me.student.rollNo}, class ${me.student.className ?? "unassigned"}. Subjects: ${stu?.class.subjects.map((s) => s.name).join(", ") || "—"}. Attendance ${att.pct}% (${att.absent} absents, ${att.late} late). Overall average ${avg}% (grade ${grade}).`;
  } else if (me.role === "PARENT" && me.parent) {
    const children = await db.student.findMany({
      where: { parentId: me.parent.id },
      include: { user: { select: { name: true } }, class: { select: { name: true } }, attendance: { select: { status: true } }, marks: { select: { score: true, maxScore: true } } },
    });
    context += ` You are the ${me.parent.relation}. Children: ${
      children
        .map((c) => {
          const att = attendanceStats(c.attendance);
          return `${c.user.name} (class ${c.class?.name ?? "—"}, attendance ${att.pct}%, average ${avgScore(c.marks)}%)`;
        })
        .join("; ") || "none linked"
    }.`;
  }

  const history = await db.chatMessage.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 16 });
  const past = history.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  await db.chatMessage.create({ data: { userId: me.id, role: "user", content: String(message).slice(0, 2000) } });

  const reply = await aiChat(
    [
      {
        role: "assistant",
        content: `You are "Campus Pal", the friendly AI assistant of Smart Campus school. ${context}\nAnswer questions about this student information system: enrollment, attendance, report cards, study plans, school routines and study help. Be concise (max ~120 words), friendly and use 0-2 emojis. If asked about data you cannot see, say what you can see instead. Never reveal passwords or other users' private data.`,
      },
      ...past,
      { role: "user", content: String(message).slice(0, 2000) },
    ],
    "I'm having trouble reaching my AI brain right now 😅 — please try again in a moment. Meanwhile, you can view attendance, marks and report cards from the sidebar."
  );

  const saved = await db.chatMessage.create({ data: { userId: me.id, role: "assistant", content: reply } });

  return Response.json({ ok: true, reply: { id: saved.id, role: "assistant", content: reply, createdAt: saved.createdAt } });
}
