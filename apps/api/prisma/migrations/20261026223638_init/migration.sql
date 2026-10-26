-- CreateEnum
CREATE TYPE "OwnerEntityType" AS ENUM ('INDIVIDUAL', 'SCI', 'COMPANY', 'UNDIVIDED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'GARAGE', 'PARKING', 'BOX');

-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('VACANT', 'OCCUPIED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('PHOTO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "EmailTokenType" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "locale" VARCHAR(10) NOT NULL DEFAULT 'fr-FR',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Paris',
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "totp_secret" VARCHAR(255),
    "totp_enabled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "user_agent" VARCHAR(255),
    "ip_hash" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "EmailTokenType" NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "email_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "resource_type" VARCHAR(64) NOT NULL,
    "resource_id" UUID,
    "metadata" JSONB,
    "ip_hash" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_entities" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "type" "OwnerEntityType" NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "legal_name" VARCHAR(200),
    "siren" VARCHAR(9),
    "siret" VARCHAR(14),
    "vat_number" VARCHAR(20),
    "email" VARCHAR(254),
    "phone" VARCHAR(32),
    "address_line1" VARCHAR(200),
    "address_line2" VARCHAR(200),
    "postal_code" VARCHAR(16),
    "city" VARCHAR(120),
    "country" VARCHAR(2) NOT NULL DEFAULT 'FR',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "owner_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "reference" VARCHAR(64),
    "address_line1" VARCHAR(200) NOT NULL,
    "address_line2" VARCHAR(200),
    "postal_code" VARCHAR(16) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "country" VARCHAR(2) NOT NULL DEFAULT 'FR',
    "construction_year" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "building_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "reference" VARCHAR(64),
    "type" "PropertyType" NOT NULL,
    "lot_number" VARCHAR(32),
    "floor" VARCHAR(16),
    "surface_m2" DECIMAL(8,2),
    "rooms" INTEGER,
    "occupancy_status" "OccupancyStatus" NOT NULL DEFAULT 'UNKNOWN',
    "description" TEXT,
    "address_line1" VARCHAR(200),
    "address_line2" VARCHAR(200),
    "postal_code" VARCHAR(16),
    "city" VARCHAR(120),
    "country" VARCHAR(2) NOT NULL DEFAULT 'FR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "property_id" UUID,
    "building_id" UUID,
    "kind" "MediaKind" NOT NULL DEFAULT 'PHOTO',
    "storage_key" VARCHAR(255) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_archived_at_idx" ON "users"("archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_revoked_at_idx" ON "sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_tokens_token_hash_key" ON "email_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_tokens_user_id_type_used_at_idx" ON "email_tokens"("user_id", "type", "used_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "owner_entities_owner_id_archived_at_idx" ON "owner_entities"("owner_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "owner_entities_id_owner_id_key" ON "owner_entities"("id", "owner_id");

-- CreateIndex
CREATE INDEX "buildings_owner_id_archived_at_idx" ON "buildings"("owner_id", "archived_at");

-- CreateIndex
CREATE INDEX "buildings_entity_id_archived_at_idx" ON "buildings"("entity_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_id_owner_id_key" ON "buildings"("id", "owner_id");

-- CreateIndex
CREATE INDEX "properties_owner_id_archived_at_idx" ON "properties"("owner_id", "archived_at");

-- CreateIndex
CREATE INDEX "properties_entity_id_archived_at_idx" ON "properties"("entity_id", "archived_at");

-- CreateIndex
CREATE INDEX "properties_building_id_archived_at_idx" ON "properties"("building_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "properties_id_owner_id_key" ON "properties"("id", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "properties_building_id_lot_number_key" ON "properties"("building_id", "lot_number");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets"("storage_key");

-- CreateIndex
CREATE INDEX "media_assets_owner_id_created_at_idx" ON "media_assets"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "media_assets_property_id_idx" ON "media_assets"("property_id");

-- CreateIndex
CREATE INDEX "media_assets_building_id_idx" ON "media_assets"("building_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_entities" ADD CONSTRAINT "owner_entities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_entity_id_owner_id_fkey" FOREIGN KEY ("entity_id", "owner_id") REFERENCES "owner_entities"("id", "owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_entity_id_owner_id_fkey" FOREIGN KEY ("entity_id", "owner_id") REFERENCES "owner_entities"("id", "owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_building_id_owner_id_fkey" FOREIGN KEY ("building_id", "owner_id") REFERENCES "buildings"("id", "owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_property_id_owner_id_fkey" FOREIGN KEY ("property_id", "owner_id") REFERENCES "properties"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_building_id_owner_id_fkey" FOREIGN KEY ("building_id", "owner_id") REFERENCES "buildings"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;
