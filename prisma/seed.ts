/**
 * Seeds one demo organization with a demo user for each of the four roles.
 * Creates matching Firebase Auth accounts (best-effort — falls back to a
 * deterministic placeholder UID if Firebase Admin isn't reachable, so the
 * seed never hard-fails just because Firebase credentials are missing).
 *
 * Run with `npm run seed` (or automatically after `npm run prisma:migrate`).
 */
import { firebaseAuth } from "../src/config/firebase.js";
import { prisma } from "../src/config/database.js";
import { organizationRepository } from "../src/repositories/organization.repository.js";
import { logger } from "../src/utils/logger.js";

const DEMO_PASSWORD = "Demo@1234";

const DEMO_USERS = [
  { role: "STUDENT" as const, name: "Demo Student", email: "student@demo.stusecure.app" },
  { role: "GUARD" as const, name: "Demo Guard", email: "guard@demo.stusecure.app" },
  { role: "FACULTY" as const, name: "Demo Faculty", email: "faculty@demo.stusecure.app" },
  { role: "ADMIN" as const, name: "Demo Admin", email: "admin@demo.stusecure.app" },
];

async function resolveFirebaseUid(email: string, name: string): Promise<string> {
  try {
    const existing = await firebaseAuth.getUserByEmail(email);
    return existing.uid;
  } catch {
    // not found — fall through to create
  }

  try {
    const created = await firebaseAuth.createUser({
      email,
      password: DEMO_PASSWORD,
      displayName: name,
      emailVerified: true,
    });
    return created.uid;
  } catch (err) {
    logger.warn(
      `Could not create/find Firebase user for ${email} — falling back to a placeholder UID. ` +
        `This demo account won't be able to sign in via Firebase until it's created manually.`,
      err,
    );
    return `seed-${email}`;
  }
}

async function main() {
  const organization = await organizationRepository.getOrCreateDefault();
  logger.info(`Demo organization ready: ${organization.name} (${organization.id})`);

  for (const demo of DEMO_USERS) {
    const firebaseUid = await resolveFirebaseUid(demo.email, demo.name);

    const user = await prisma.user.upsert({
      where: { firebaseUid },
      update: {
        name: demo.name,
        email: demo.email,
        role: demo.role,
        organizationId: organization.id,
      },
      create: {
        firebaseUid,
        name: demo.name,
        email: demo.email,
        role: demo.role,
        organizationId: organization.id,
      },
    });

    logger.info(`Seeded ${user.role} user: ${user.email} (${user.id})`);
  }

  console.log("\nDemo credentials (password is the same for all):");
  console.table(DEMO_USERS.map(({ role, email }) => ({ role, email, password: DEMO_PASSWORD })));
}

main()
  .catch((err) => {
    logger.error("Seed failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
