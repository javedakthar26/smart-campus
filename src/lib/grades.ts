// Shared grading + stats helpers (server & client safe)

export const EXAMS = ["Midterm Exam", "Term 1 Exam", "Final Exam"] as const;

export function gradeFor(pct: number): { grade: string; gpa: number } {
  if (pct >= 90) return { grade: "A+", gpa: 4.0 };
  if (pct >= 80) return { grade: "A", gpa: 3.6 };
  if (pct >= 70) return { grade: "B+", gpa: 3.2 };
  if (pct >= 60) return { grade: "B", gpa: 2.8 };
  if (pct >= 50) return { grade: "C", gpa: 2.2 };
  if (pct >= 40) return { grade: "D", gpa: 1.6 };
  return { grade: "F", gpa: 0.0 };
}

export type AttRecord = { status: string };

export function attendanceStats(records: AttRecord[]) {
  const total = records.length;
  const present = records.filter((r) => r.status === "PRESENT").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const leave = records.filter((r) => r.status === "LEAVE").length;
  const pct = total === 0 ? 0 : Math.round(((present + late) / total) * 1000) / 10;
  return { total, present, late, absent, leave, pct };
}

export function avgScore(marks: { score: number; maxScore: number }[]) {
  if (marks.length === 0) return 0;
  const pctSum = marks.reduce((s, m) => s + (m.score / (m.maxScore || 100)) * 100, 0);
  return Math.round((pctSum / marks.length) * 10) / 10;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Deterministic colorful avatar gradient per name
const AVATAR_GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-pink-500",
  "from-cyan-500 to-emerald-400",
  "from-fuchsia-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-teal-500 to-green-500",
];

export function avatarGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}
