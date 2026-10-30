/**
 * Smart Campus — demo data seeder.
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function dstr(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const existing = await db.user.findUnique({ where: { email: "admin@campus.edu" } });
  if (existing) {
    console.log("Seed data already present — skipping.");
    return;
  }

  const pw = (p: string) => hashPassword(p);

  // ── Admin ──
  const admin = await db.user.create({
    data: { email: "admin@campus.edu", passwordHash: pw("Admin@123"), name: "Dr. Anita Desai", role: "ADMIN" },
  });
  console.log("admin:", admin.email);

  // ── Teachers ──
  const t1u = await db.user.create({
    data: { email: "teacher@campus.edu", passwordHash: pw("Teacher@123"), name: "Sarah Johnson", role: "TEACHER" },
  });
  const t2u = await db.user.create({
    data: { email: "michael@campus.edu", passwordHash: pw("Teacher@123"), name: "Michael Lee", role: "TEACHER" },
  });
  const teacher1 = await db.teacher.create({
    data: { userId: t1u.id, subject: "Mathematics", phone: "+91 98450 11223" },
  });
  const teacher2 = await db.teacher.create({
    data: { userId: t2u.id, subject: "Physics", phone: "+91 98450 44556" },
  });

  // ── Classes & Subjects ──
  const class10A = await db.class.create({ data: { name: "Grade 10 - A", room: "Room 201", teacherId: teacher1.id } });
  const class10B = await db.class.create({ data: { name: "Grade 10 - B", room: "Room 202", teacherId: teacher2.id } });
  const class9A = await db.class.create({ data: { name: "Grade 9 - A", room: "Room 105" } });

  const subjectDefs = [
    ["Mathematics", "MATH"],
    ["Physics", "PHY"],
    ["Chemistry", "CHEM"],
    ["English", "ENG"],
    ["Computer Science", "CS"],
  ];
  const subjectsByClass: Record<string, { id: string; name: string }[]> = {};
  for (const cls of [class10A, class10B, class9A]) {
    subjectsByClass[cls.id] = [];
    for (const [name, code] of subjectDefs) {
      const s = await db.subject.create({ data: { name, code, classId: cls.id } });
      subjectsByClass[cls.id].push({ id: s.id, name: s.name });
    }
  }

  // ── Students ──
  type Stu = { email: string; name: string; roll: string; cls: string; gender: string; dob: string };
  const studentDefs: Stu[] = [
    { email: "student@campus.edu", name: "Alex Kumar", roll: "S1001", cls: class10A.id, gender: "Male", dob: "2010-04-12" },
    { email: "priya@campus.edu", name: "Priya Sharma", roll: "S1002", cls: class10A.id, gender: "Female", dob: "2010-07-25" },
    { email: "rohan@campus.edu", name: "Rohan Mehta", roll: "S1003", cls: class10A.id, gender: "Male", dob: "2010-01-09" },
    { email: "sara@campus.edu", name: "Sara Ali", roll: "S1004", cls: class10B.id, gender: "Female", dob: "2010-09-30" },
    { email: "dev@campus.edu", name: "Dev Patel", roll: "S1005", cls: class10B.id, gender: "Male", dob: "2010-11-18" },
    { email: "maya@campus.edu", name: "Maya Nair", roll: "S1006", cls: class9A.id, gender: "Female", dob: "2011-03-05" },
  ];

  const students: { id: string; userId: string; classId: string; rollNo: string; name: string }[] = [];
  for (const s of studentDefs) {
    const u = await db.user.create({
      data: { email: s.email, passwordHash: pw("Student@123"), name: s.name, role: "STUDENT" },
    });
    const stu = await db.student.create({
      data: {
        userId: u.id,
        rollNo: s.roll,
        classId: s.cls,
        gender: s.gender,
        dob: s.dob,
        phone: "+91 90000 0" + s.roll.slice(-4),
        address: "12 MG Road, Bengaluru",
        bio: "Enthusiastic learner who loves science fairs and coding clubs.",
      },
    });
    await db.enrollment.create({ data: { studentId: stu.id, classId: s.cls, status: "ACTIVE" } });
    students.push({ id: stu.id, userId: u.id, classId: s.cls, rollNo: s.roll, name: s.name });
  }

  // ── Parent of Alex ──
  const pu = await db.user.create({
    data: { email: "parent@campus.edu", passwordHash: pw("Parent@123"), name: "Rajesh Kumar", role: "PARENT" },
  });
  await db.parent.create({
    data: {
      userId: pu.id,
      relation: "Father",
      phone: "+91 98450 77889",
      children: { connect: [{ id: students[0].id }, { id: students[1].id }] },
    },
  });
  console.log("parent:", pu.email);

  // ── Marks (two exams) ──
  const exams = ["Midterm Exam", "Term 1 Exam"];
  const base: Record<string, number> = {
    S1001: 78, S1002: 91, S1003: 64, S1004: 85, S1005: 72, S1006: 88,
  };
  const jitter = [6, -4, 3, -8, 5, 2];
  for (const stu of students) {
    for (let e = 0; e < exams.length; e++) {
      for (let si = 0; si < subjectsByClass[stu.classId].length; si++) {
        const subj = subjectsByClass[stu.classId][si];
        const score = Math.min(99, Math.max(32, base[stu.rollNo] + jitter[(e + si) % jitter.length] + ((si * 7 + e * 3) % 9) - 4));
        await db.mark.create({
          data: { studentId: stu.id, subjectId: subj.id, exam: exams[e], score: Math.round(score * 10) / 10, maxScore: 100 },
        });
      }
    }
  }

  // ── Attendance: last 24 weekdays ──
  const statuses = ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "LATE", "PRESENT", "ABSENT", "PRESENT", "LEAVE"];
  let idx = 0;
  const days: string[] = [];
  const cursor = new Date();
  while (days.length < 24) {
    cursor.setDate(cursor.getDate() - 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days.push(dstr(cursor));
  }
  days.reverse();
  for (const stu of students) {
    for (const day of days) {
      const status = statuses[idx++ % statuses.length];
      await db.attendance.create({
        data: { studentId: stu.id, classId: stu.classId, date: day, status },
      });
    }
  }

  // ── Pre-generated report card for Alex (Midterm) ──
  const alexMarks = await db.mark.findMany({ where: { studentId: students[0].id, exam: "Midterm Exam" } });
  const pct = Math.round((alexMarks.reduce((s, m) => s + m.score, 0) / alexMarks.length) * 10) / 10;
  await db.reportCard.create({
    data: {
      studentId: students[0].id,
      exam: "Midterm Exam",
      percentage: pct,
      grade: pct >= 80 ? "A" : "B+",
      gpa: 3.2,
      remarks:
        "Alex shows strong analytical ability in Mathematics and Computer Science. Consistent effort is needed in Physics — encourage regular problem practice and lab participation. Overall a dependable and curious student.",
    },
  });

  // ── Welcome AI chat message for admin ──
  await db.chatMessage.create({
    data: {
      userId: admin.id,
      role: "assistant",
      content: "Welcome to Smart Campus! 🎓 I can answer questions about students, attendance, enrollment, report cards and more. Try asking: “How many students are enrolled?”",
    },
  });

  console.log("✅ Seed complete: 1 admin, 2 teachers, 6 students, 1 parent, 3 classes, 15 subjects, marks & attendance.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
