-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'LIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "DecisionSource" AS ENUM ('API', 'PLAYGROUND', 'DEMO');

-- CreateEnum
CREATE TYPE "PolicyEventType" AS ENUM ('CREATED', 'PUBLISHED', 'ROLLED_BACK', 'PAUSED', 'RESUMED', 'DELETED');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "draft" JSONB NOT NULL,
    "liveVersionId" TEXT,
    "opaHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_versions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "ruleSet" JSONB NOT NULL,
    "rego" TEXT NOT NULL,
    "note" TEXT,
    "publishedById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_events" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "policyId" TEXT,
    "policyKey" TEXT NOT NULL,
    "type" "PolicyEventType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromVersion" INTEGER,
    "toVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_payloads" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_payloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "versionNumber" INTEGER,
    "source" "DecisionSource" NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "matchedRule" TEXT,
    "missingFields" TEXT[],
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_daily" (
    "workspaceId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "allowed" INTEGER NOT NULL DEFAULT 0,
    "denied" INTEGER NOT NULL DEFAULT 0,
    "p95LatencyMs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "usage_daily_pkey" PRIMARY KEY ("workspaceId","policyId","date")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_shortId_key" ON "workspaces"("shortId");

-- CreateIndex
CREATE INDEX "members_userId_idx" ON "members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "members_workspaceId_userId_key" ON "members"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token");

-- CreateIndex
CREATE INDEX "invites_workspaceId_idx" ON "invites"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_hash_key" ON "api_keys"("hash");

-- CreateIndex
CREATE INDEX "api_keys_workspaceId_idx" ON "api_keys"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "policies_shortId_key" ON "policies"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "policies_liveVersionId_key" ON "policies"("liveVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "policies_workspaceId_key_key" ON "policies"("workspaceId", "key");

-- CreateIndex
CREATE INDEX "policy_versions_workspaceId_idx" ON "policy_versions"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "policy_versions_policyId_number_key" ON "policy_versions"("policyId", "number");

-- CreateIndex
CREATE INDEX "policy_events_workspaceId_createdAt_idx" ON "policy_events"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "sample_payloads_workspaceId_idx" ON "sample_payloads"("workspaceId");

-- CreateIndex
CREATE INDEX "decisions_workspaceId_createdAt_idx" ON "decisions"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "decisions_workspaceId_policyId_createdAt_idx" ON "decisions"("workspaceId", "policyId", "createdAt");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_payloads" ADD CONSTRAINT "sample_payloads_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
