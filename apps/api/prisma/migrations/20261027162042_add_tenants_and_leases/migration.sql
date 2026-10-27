-- CreateEnum
CREATE TYPE "TenantType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "LeaseType" AS ENUM ('NUE', 'MEUBLEE');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "type" "TenantType" NOT NULL DEFAULT 'INDIVIDUAL',
    "name" VARCHAR(160) NOT NULL,
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

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" "LeaseType" NOT NULL DEFAULT 'NUE',
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "rent_amount" DECIMAL(10,2) NOT NULL,
    "charges_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deposit_amount" DECIMAL(10,2),
    "payment_day" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenants_owner_id_archived_at_idx" ON "tenants"("owner_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_id_owner_id_key" ON "tenants"("id", "owner_id");

-- CreateIndex
CREATE INDEX "leases_owner_id_archived_at_idx" ON "leases"("owner_id", "archived_at");

-- CreateIndex
CREATE INDEX "leases_property_id_archived_at_idx" ON "leases"("property_id", "archived_at");

-- CreateIndex
CREATE INDEX "leases_tenant_id_archived_at_idx" ON "leases"("tenant_id", "archived_at");

-- CreateIndex
CREATE INDEX "leases_entity_id_archived_at_idx" ON "leases"("entity_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "leases_id_owner_id_key" ON "leases"("id", "owner_id");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_entity_id_owner_id_fkey" FOREIGN KEY ("entity_id", "owner_id") REFERENCES "owner_entities"("id", "owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_property_id_owner_id_fkey" FOREIGN KEY ("property_id", "owner_id") REFERENCES "properties"("id", "owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_tenant_id_owner_id_fkey" FOREIGN KEY ("tenant_id", "owner_id") REFERENCES "tenants"("id", "owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;
