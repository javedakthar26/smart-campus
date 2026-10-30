// Shared client-side types for Smart Campus

export type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  student: { id: string; rollNo: string; className: string | null; classId: string | null } | null;
  teacher: { id: string; subject: string; classes: { id: string; name: string }[] } | null;
  parent: { id: string; relation: string; childrenIds: string[] } | null;
};

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  rollNo: string;
  classId: string | null;
  className: string;
  gender: string | null;
  phone: string | null;
  attendancePct: number;
  avgScore: number;
};

export type ClassRow = {
  id: string;
  name: string;
  room: string | null;
  teacherName: string | null;
  studentCount: number;
  activeEnrollments: number;
  subjects: { id: string; name: string; code: string }[];
};

export type EnrollmentRow = {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  classId: string;
  className: string;
  status: string;
  date: string;
};

export type AttendanceRec = { id: string; date: string; status: string; className: string };
export type AttStats = { total: number; present: number; late: number; absent: number; leave: number; pct: number };

export type MarkRec = { id: string; exam: string; subject: string; code?: string; score: number; maxScore: number };

export type ReportCardRow = {
  id: string;
  exam: string;
  percentage: number;
  grade: string;
  gpa: number;
  remarks: string;
  createdAt: string;
};

export type StudyPlanRow = { id: string; title: string; goal: string; content: string; createdAt: string };

export type StudentProfile = {
  id: string;
  name: string;
  email: string;
  rollNo: string;
  classId: string | null;
  className: string;
  classTeacher: string;
  subjects: { name: string; code: string }[];
  dob: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  bio: string | null;
  joined: string;
  parent: { name: string; email: string; relation: string; phone: string | null } | null;
  attendance: AttStats;
  overallAvg: number;
  overallGrade: string;
  subjectAverages: { name: string; code: string; avg: number }[];
  marks: MarkRec[];
  attendanceLog: { id: string; date: string; status: string }[];
  reportCards: ReportCardRow[];
  studyPlans: StudyPlanRow[];
  enrollments: { id: string; className: string; status: string; date: string }[];
};

export type AdminStats = {
  totals: { students: number; teachers: number; classes: number; parents: number; avgAttendance: number; avgScore: number };
  enrollmentByClass: { name: string; students: number; enrollments: number }[];
  attendanceTrend: { date: string; pct: number }[];
  gradeDistribution: { grade: string; count: number }[];
};

export type ChatMsg = { id: string; role: string; content: string; createdAt?: string };

export const EXAM_OPTIONS = ["Midterm Exam", "Term 1 Exam", "Final Exam"];
