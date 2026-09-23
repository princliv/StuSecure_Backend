import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { logger } from "./utils/logger.js";

let io: SocketIOServer | null = null;

export function initRealtime(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    socket.on("org:join", (orgId: unknown) => {
      if (typeof orgId === "string" && orgId.length > 0) {
        socket.join(`org:${orgId}:monitoring`);
        socket.join(`org:${orgId}:emergencies`);
        socket.join(`org:${orgId}:help`);
      }
    });
  });

  logger.info("Socket.IO ready");
  return io;
}

export function emitOrgMovement(orgId: string, payload: unknown) {
  io?.to(`org:${orgId}:monitoring`).emit("movement:created", payload);
}

export function emitOrgEmergency(orgId: string, event: string, payload: unknown) {
  io?.to(`org:${orgId}:emergencies`).emit(event, payload);
}

export function emitOrgHelp(orgId: string, event: string, payload: unknown) {
  io?.to(`org:${orgId}:help`).emit(event, payload);
}
