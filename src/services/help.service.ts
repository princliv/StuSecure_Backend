import type { HelpRequestStatus, HelpRequestType } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { emitOrgHelp } from "../realtime.js";
import { facultyRepository } from "../repositories/faculty.repository.js";
import { helpRepository } from "../repositories/help.repository.js";
import { studentRepository } from "../repositories/student.repository.js";
import type { AssignHelpBody, CreateHelpBody } from "../validators/help.validators.js";

type AuthUser = {
  id: string;
  role: string;
  organizationId: string;
};

function serialize(
  row: NonNullable<Awaited<ReturnType<typeof helpRepository.findById>>>,
) {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    priority: row.priority,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    student: {
      studentId: row.studentId,
      name: row.student.user.name,
      enrollmentNo: row.student.enrollmentNo,
      hostelName: row.student.room?.hostel.name ?? null,
      roomNumber: row.student.room?.number ?? null,
    },
    assignedTo: row.assignedToFaculty
      ? {
          facultyId: row.assignedToFaculty.id,
          name: row.assignedToFaculty.user.name,
        }
      : null,
  };
}

function parsePaging(query: { page?: unknown; limit?: unknown }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

async function requireStudent(user: AuthUser, orgId: string) {
  let student = await studentRepository.findByUserId(orgId, user.id);
  if (student) return student;
  student = await studentRepository.create({
    organizationId: orgId,
    userId: user.id,
    enrollmentNo: `STU-${user.id.slice(-8).toUpperCase()}`,
  });
  return student;
}

async function requireFaculty(user: AuthUser, orgId: string) {
  let faculty = await facultyRepository.findByUserId(orgId, user.id);
  if (faculty) return faculty;
  faculty = await facultyRepository.create({
    organizationId: orgId,
    userId: user.id,
    employeeId: `FAC-${user.id.slice(-8).toUpperCase()}`,
  });
  return faculty;
}

export const helpService = {
  create: async (user: AuthUser, orgId: string, body: CreateHelpBody) => {
    const student = await requireStudent(user, orgId);
    const created = await helpRepository.create({
      organizationId: orgId,
      studentId: student.id,
      type: body.type,
      description: body.description,
      priority: body.priority ?? "NORMAL",
    });
    const payload = serialize(created);
    emitOrgHelp(orgId, "help:created", payload);
    return payload;
  },

  listMine: async (
    user: AuthUser,
    orgId: string,
    query: { page?: unknown; limit?: unknown; status?: unknown },
  ) => {
    const student = await requireStudent(user, orgId);
    const { page, limit, skip, take } = parsePaging(query);
    const allowed: HelpRequestStatus[] = [
      "PENDING",
      "IN_PROGRESS",
      "RESOLVED",
      "CANCELLED",
    ];
    const status =
      typeof query.status === "string" &&
      allowed.includes(query.status as HelpRequestStatus)
        ? (query.status as HelpRequestStatus)
        : undefined;
    const [rows, total] = await helpRepository.list({
      organizationId: orgId,
      studentId: student.id,
      status,
      skip,
      take,
    });
    return { requests: rows.map(serialize), total, page, limit };
  },

  list: async (
    orgId: string,
    query: {
      page?: unknown;
      limit?: unknown;
      status?: unknown;
      type?: unknown;
      assignedToFacultyId?: string;
    },
  ) => {
    const { page, limit, skip, take } = parsePaging(query);
    const allowedStatus: HelpRequestStatus[] = [
      "PENDING",
      "IN_PROGRESS",
      "RESOLVED",
      "CANCELLED",
    ];
    const allowedType: HelpRequestType[] = [
      "TRANSPORTATION",
      "MEDICAL",
      "HOSTEL",
      "SECURITY",
      "OTHER",
    ];
    const status =
      typeof query.status === "string" &&
      allowedStatus.includes(query.status as HelpRequestStatus)
        ? (query.status as HelpRequestStatus)
        : undefined;
    const type =
      typeof query.type === "string" &&
      allowedType.includes(query.type as HelpRequestType)
        ? (query.type as HelpRequestType)
        : undefined;

    const [rows, total] = await helpRepository.list({
      organizationId: orgId,
      status,
      type,
      assignedToFacultyId: query.assignedToFacultyId,
      skip,
      take,
    });
    return { requests: rows.map(serialize), total, page, limit };
  },

  assign: async (
    user: AuthUser,
    orgId: string,
    id: string,
    body: AssignHelpBody,
  ) => {
    const row = await helpRepository.findById(orgId, id);
    if (!row) throw new ApiError(404, "Help request not found");
    if (row.status === "RESOLVED" || row.status === "CANCELLED") {
      throw new ApiError(409, "This help request is already closed");
    }

    let facultyId = body.facultyId;
    if (!facultyId) {
      const me = await requireFaculty(user, orgId);
      facultyId = me.id;
    } else {
      const target = await facultyRepository.findById(orgId, facultyId);
      if (!target) throw new ApiError(404, "Faculty assignee not found");
    }

    const updated = await helpRepository.update(id, {
      assignedToFacultyId: facultyId,
      status: row.status === "PENDING" ? "IN_PROGRESS" : row.status,
    });
    const payload = serialize(updated);
    emitOrgHelp(orgId, "help:updated", payload);
    return payload;
  },

  resolve: async (_user: AuthUser, orgId: string, id: string) => {
    const row = await helpRepository.findById(orgId, id);
    if (!row) throw new ApiError(404, "Help request not found");
    if (row.status === "RESOLVED" || row.status === "CANCELLED") {
      throw new ApiError(409, "This help request is already closed");
    }
    const updated = await helpRepository.update(id, {
      status: "RESOLVED",
      resolvedAt: new Date(),
    });
    const payload = serialize(updated);
    emitOrgHelp(orgId, "help:updated", payload);
    return payload;
  },

  cancel: async (user: AuthUser, orgId: string, id: string) => {
    const row = await helpRepository.findById(orgId, id);
    if (!row) throw new ApiError(404, "Help request not found");
    if (row.status === "RESOLVED" || row.status === "CANCELLED") {
      throw new ApiError(409, "This help request is already closed");
    }

    if (user.role === "STUDENT") {
      const student = await requireStudent(user, orgId);
      if (row.studentId !== student.id) {
        throw new ApiError(403, "You can only cancel your own request");
      }
      if (row.status !== "PENDING") {
        throw new ApiError(409, "Only a pending request can be cancelled");
      }
    }

    const updated = await helpRepository.update(id, {
      status: "CANCELLED",
      resolvedAt: new Date(),
    });
    const payload = serialize(updated);
    emitOrgHelp(orgId, "help:updated", payload);
    return payload;
  },
};
