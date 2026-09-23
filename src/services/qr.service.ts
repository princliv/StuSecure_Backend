import { randomBytes } from "node:crypto";
import { ApiError } from "../utils/ApiError.js";
import { qrRepository } from "../repositories/qr.repository.js";
import { studentRepository } from "../repositories/student.repository.js";

type AuthUser = {
  id: string;
  role: string;
  organizationId: string;
};

function newToken() {
  return randomBytes(32).toString("base64url");
}

function serialize(
  qr: {
    id: string;
    studentId: string;
    token: string;
    isActive: boolean;
    createdAt: Date;
    rotatedAt: Date | null;
  },
  student: {
    enrollmentNo: string;
    user: { name: string };
    room: { number: string; hostel: { name: string } } | null;
  },
) {
  return {
    id: qr.id,
    studentId: qr.studentId,
    token: qr.token,
    isActive: qr.isActive,
    createdAt: qr.createdAt.toISOString(),
    rotatedAt: qr.rotatedAt?.toISOString() ?? null,
    student: {
      name: student.user.name,
      enrollmentNo: student.enrollmentNo,
      hostelName: student.room?.hostel.name ?? null,
      roomNumber: student.room?.number ?? null,
    },
  };
}

async function requireStudent(user: AuthUser, orgId: string) {
  let student = await studentRepository.findByUserId(orgId, user.id);
  if (student) return student;

  const enrollmentNo = `STU-${user.id.slice(-8).toUpperCase()}`;
  student = await studentRepository.create({
    organizationId: orgId,
    userId: user.id,
    enrollmentNo,
  });
  return student;
}

export const qrService = {
  me: async (user: AuthUser, orgId: string) => {
    const student = await requireStudent(user, orgId);

    let qr = await qrRepository.findByStudent(orgId, student.id);
    if (!qr) {
      qr = await qrRepository.create({
        organizationId: orgId,
        studentId: student.id,
        token: newToken(),
      });
    }

    return serialize(qr, student);
  },

  rotate: async (user: AuthUser, orgId: string) => {
    const student = await requireStudent(user, orgId);

    const existing = await qrRepository.findByStudent(orgId, student.id);
    if (!existing) {
      const created = await qrRepository.create({
        organizationId: orgId,
        studentId: student.id,
        token: newToken(),
      });
      return serialize(created, student);
    }

    const rotated = await qrRepository.rotate(existing.id, newToken());
    if (!rotated) {
      throw new ApiError(404, "QR identity not found");
    }
    return serialize(rotated, student);
  },
};
