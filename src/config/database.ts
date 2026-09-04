import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Missing required environment variable: DATABASE_URL");
}

// Prisma 7 requires a driver adapter (pg / Neon).
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
