CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'EXPO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");
CREATE INDEX "DeviceToken_organizationId_idx" ON "DeviceToken"("organizationId");
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
