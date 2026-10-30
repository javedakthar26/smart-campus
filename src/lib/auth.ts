import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SECRET = "smart-campus-glm-session-2026";
export const SESSION_COOKIE = "sc_session";

// ─────────────── Password hashing (scrypt with salt) ───────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const candidate = crypto.scryptSync(password, salt, 32).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
  } catch {
    return false;
  }
}

// ─────────────── HMAC-signed session token ───────────────

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload = b64url(JSON.stringify({ uid: userId, iat: Date.now() }));
  return `${payload}.${sign(payload)}`;
}

function readSessionToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof data.uid === "string" ? data.uid : null;
  } catch {
    return null;
  }
}

// ─────────────── Current user from cookie ───────────────

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  student:
    | (Omit<
        Awaited<ReturnType<typeof db.student.findFirstOrThrow>>,
        "user" | "class" | "parent" | "enrollments" | "attendance" | "marks" | "reportCards" | "studyPlans"
      > & {
        className: string | null;
        classNameId: string | null;
      })
    | null;
  teacher: { id: string; subject: string; phone: string | null; classes: { id: string; name: string }[] } | null;
  parent: { id: string; relation: string; phone: string | null; childrenIds: string[] } | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const uid = readSessionToken(token);
  if (!uid) return null;

  const user = await db.user.findUnique({
    where: { id: uid },
    include: {
      student: { include: { class: true, parent: { include: { user: true } } } },
      teacher: { include: { classes: true } },
      parent: { include: { children: true } },
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as SessionUser["role"],
    student: user.student
      ? {
          id: user.student.id,
          userId: user.student.userId,
          rollNo: user.student.rollNo,
          classId: user.student.classId,
          dob: user.student.dob,
          gender: user.student.gender,
          phone: user.student.phone,
          address: user.student.address,
          bio: user.student.bio,
          parentId: user.student.parentId,
          className: user.student.class?.name ?? null,
          classNameId: user.student.class?.teacherId ?? null,
        }
      : null,
    teacher: user.teacher
      ? {
          id: user.teacher.id,
          subject: user.teacher.subject,
          phone: user.teacher.phone,
          classes: user.teacher.classes.map((c) => ({ id: c.id, name: c.name })),
        }
      : null,
    parent: user.parent
      ? {
          id: user.parent.id,
          relation: user.parent.relation,
          phone: user.parent.phone,
          childrenIds: user.parent.children.map((c) => c.id),
        }
      : null,
  };
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
