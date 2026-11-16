-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "tenantryOrg" TEXT;

-- CreateTable
CREATE TABLE "tenantry_sessions" (
    "sessionId" TEXT NOT NULL,
    "sid" TEXT,
    "sub" TEXT NOT NULL,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenantry_sessions_pkey" PRIMARY KEY ("sessionId")
);

-- CreateIndex
CREATE INDEX "tenantry_sessions_sid_idx" ON "tenantry_sessions"("sid");

-- CreateIndex
CREATE INDEX "tenantry_sessions_sub_idx" ON "tenantry_sessions"("sub");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_tenantryOrg_key" ON "workspaces"("tenantryOrg");

-- AddForeignKey
ALTER TABLE "tenantry_sessions" ADD CONSTRAINT "tenantry_sessions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

