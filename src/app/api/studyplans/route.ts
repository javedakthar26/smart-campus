import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { aiChat } from "@/lib/ai";

// GET /api/studyplans?studentId= → saved plans (role-checked)
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  let studentId = url.searchParams.get("studentId") ?? "";
  if (me.role === "STUDENT") studentId = me.student?.id ?? "";
  if (!studentId) return Response.json({ error: "studentId required" }, { status: 400 });
  if (me.role === "PARENT" && !me.parent?.childrenIds.includes(studentId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const plans = await db.studyPlan.findMany({ where: { studentId }, orderBy: { createdAt: "desc" } });
  return Response.json({ studyPlans: plans });
}

// POST /api/studyplans → generate an AI study plan
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId, goal, hoursPerDay, focusSubjects, weakSubjects, days } = await req.json();
  if (!studentId || !goal) return Response.json({ error: "studentId and goal required" }, { status: 400 });

  if (me.role === "STUDENT" && me.student?.id !== studentId) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (me.role === "PARENT" && !me.parent?.childrenIds.includes(studentId)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true } },
      class: { include: { subjects: { select: { name: true } } } },
      marks: { include: { subject: { select: { name: true } } } },
    },
  });
  if (!student) return Response.json({ error: "Student not found" }, { status: 404 });

  // weakest subjects by average score
  const bySubj = new Map<string, number[]>();
  for (const m of student.marks) {
    if (!bySubj.has(m.subject.name)) bySubj.set(m.subject.name, []);
    bySubj.get(m.subject.name)!.push((m.score / (m.maxScore || 100)) * 100);
  }
  const averages = [...bySubj.entries()].map(([name, arr]) => ({ name, avg: arr.reduce((a, b) => a + b, 0) / arr.length }));
  averages.sort((a, b) => a.avg - b.avg);
  const weakest = averages.slice(0, 2).map((s) => s.name);

  const subjects = student.class?.subjects.map((s) => s.name).join(", ") || "general subjects";
  const planDays = Math.min(Math.max(Number(days) || 7, 3), 14);
  const hours = Math.min(Math.max(Number(hoursPerDay) || 2, 1), 8);

  const ai = await aiChat(
    [
      {
        role: "assistant",
        content: `You are an expert study coach. Create a personalized day-by-day study plan as clean Markdown:
- Title line starting with "## "
- A one-line "Goal:" summary
- Then one "### Day N" section per day (do not exceed ${planDays} days), each with 2-4 short bullet tasks using the format "Subject — task (time)".
- Prioritize weak subjects earlier in the week, mix subjects per day, include short breaks and one quick self-quiz or revision block per day.
- End with a final "### Weekly Tips" section with 3 bullets.
Keep it concise and practical. Do not invent subjects outside this list: ${subjects}.`,
      },
      {
        role: "user",
        content: `Student: ${student.user.name}\nGoal: ${goal}\nStudy hours per day: ${hours}\nSubjects: ${subjects}\nWeakest subjects (by average score): ${weakest.join(", ") || "none"}\nFocus subjects requested: ${focusSubjects || weakest.join(", ") || subjects}\nWeak areas: ${weakSubjects || "not specified"}\nGenerate the plan.`,
      },
    ],
    // fallback plan if AI unavailable
    `## Study Plan — ${goal}\nGoal: reach the target within ${planDays} days at ${hours}h/day.\n\n### Day 1\n- ${weakest[0] ?? subjects.split(", ")[0]} — review core concepts and make summary notes (${Math.ceil(hours * 0.5)}h)\n- Practice 10 problems (${Math.floor(hours * 0.5)}h)\n\n### Day 2\n- ${weakest[1] ?? subjects.split(", ")[1] ?? "Revision"} — textbook reading + notes (${Math.ceil(hours * 0.6)}h)\n- Flashcard quiz of Day 1 (${Math.floor(hours * 0.4)}h)\n\n### Weekly Tips\n- Revise yesterday's notes for 15 minutes before starting.\n- Take a 5-minute break every 25 minutes.\n- Teach one concept aloud to check understanding.`
  );

  // Extract a title from the AI markdown title line
  const titleMatch = ai.match(/^##\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() || `Study Plan: ${goal.slice(0, 48)}`;

  const plan = await db.studyPlan.create({
    data: { studentId, title, goal, content: ai },
  });

  return Response.json({ ok: true, studyPlan: plan });
}

// DELETE /api/studyplans?id= → remove a plan
export async function DELETE(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const plan = await db.studyPlan.findUnique({ where: { id }, include: { student: true } });
  if (!plan) return Response.json({ error: "Not found" }, { status: 404 });
  if (me.role === "STUDENT" && me.student?.id !== plan.studentId) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (me.role === "PARENT" && !me.parent?.childrenIds.includes(plan.studentId)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "TEACHER", "STUDENT", "PARENT"].includes(me.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  await db.studyPlan.delete({ where: { id } });
  return Response.json({ ok: true });
}
