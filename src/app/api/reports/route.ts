import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { gradeFor } from "@/lib/grades";
import { aiChat } from "@/lib/ai";

// GET /api/reports?studentId= → report cards for a student (role-checked)
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  let studentId = url.searchParams.get("studentId");
  if (me.role === "STUDENT") studentId = me.student?.id ?? "";
  if (me.role === "PARENT") studentId = url.searchParams.get("studentId") ?? "";
  if (!studentId) return Response.json({ error: "studentId required" }, { status: 400 });
  if (me.role === "PARENT" && !me.parent?.childrenIds.includes(studentId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const cards = await db.reportCard.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ reportCards: cards });
}

// POST /api/reports → generate report card (computes scores + AI remarks) (teacher/admin)
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "TEACHER"].includes(me.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, exam } = await req.json();
  if (!studentId || !exam) return Response.json({ error: "studentId and exam required" }, { status: 400 });

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true } },
      class: { select: { name: true } },
      attendance: { select: { status: true } },
      marks: { where: { exam }, include: { subject: { select: { name: true, code: true } } } },
    },
  });
  if (!student) return Response.json({ error: "Student not found" }, { status: 404 });

  if (student.marks.length === 0) {
    return Response.json({ error: `No marks found for ${exam}. Enter marks first.` }, { status: 400 });
  }

  const subjectLines = student.marks.map((m) => `${m.subject.name}: ${m.score}/${m.maxScore}`);
  const total = student.marks.reduce((s, m) => s + (m.score / (m.maxScore || 100)) * 100, 0);
  const percentage = Math.round((total / student.marks.length) * 10) / 10;
  const { grade, gpa } = gradeFor(percentage);
  const att = student.attendance;
  const attPct = att.length ? Math.round(((att.filter((a) => a.status !== "ABSENT").length) / att.length) * 1000) / 10 : 0;

  const ai = await aiChat(
    [
      {
        role: "assistant",
        content:
          "You are a warm, experienced school teacher writing report card remarks. Write 3-4 sentences: mention 1-2 subject strengths with specifics, one area to improve with a concrete suggestion, and an encouraging close. Refer to the student by first name. No bullet points, no markdown, just the remark paragraph.",
      },
      {
        role: "user",
        content: `Student: ${student.user.name}, Class ${student.class?.name ?? "—"}\nExam: ${exam}\nSubjects: ${subjectLines.join(", ")}\nOverall: ${percentage}% (grade ${grade})\nAttendance: ${attPct}%\nWrite the teacher's remark.`,
      },
    ],
    // fallback remark if AI unavailable
    `${student.user.name.split(" ")[0]} scored ${percentage}% in ${exam}, showing solid understanding across subjects. Continued focus on regular revision and active class participation will help push the overall grade higher. Keep up the consistent effort!`
  );

  const card = await db.reportCard.upsert({
    where: { studentId_exam: { studentId, exam } },
    create: { studentId, exam, percentage, grade, gpa, remarks: ai },
    update: { percentage, grade, gpa, remarks: ai, createdAt: new Date() },
  });

  return Response.json({ ok: true, reportCard: card });
}
