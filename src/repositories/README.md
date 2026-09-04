# repositories

Prisma queries live here, one file per model (e.g. `student.repository.ts`).
Services call repositories; repositories are the only layer that imports
`../config/prisma.js` directly.
