/* eslint-disable no-console */
import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { ARGON2_OPTIONS } from '../src/common/password';

/**
 * Jeu de données de démonstration (développement et préproduction uniquement).
 * Idempotent : relancer le script ne duplique rien.
 *
 * Compte : demo@immo.local / DemoImmo2026!
 */
const DEMO_EMAIL = 'demo@immo.local';
const DEMO_PASSWORD = 'DemoImmo2026!';

const dateOnly = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Le jeu de démonstration est interdit en production.');
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await hash(DEMO_PASSWORD, ARGON2_OPTIONS);

    const user = await prisma.user.upsert({
      where: { email: DEMO_EMAIL },
      update: {},
      create: {
        email: DEMO_EMAIL,
        fullName: 'Camille Démo',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });

    // --- Patrimoine (créé une seule fois) ---------------------------------
    const existingEntities = await prisma.ownerEntity.count({ where: { ownerId: user.id } });

    if (existingEntities === 0) {
      const sci = await prisma.ownerEntity.create({
        data: {
          ownerId: user.id,
          type: 'SCI',
          name: 'SCI Bellecour',
          siren: '130025265',
          email: 'contact@sci-bellecour.example',
          addressLine1: '1 place Bellecour',
          postalCode: '69002',
          city: 'Lyon',
          notes: 'Patrimoine familial — 4 lots.',
        },
      });

      const individual = await prisma.ownerEntity.create({
        data: {
          ownerId: user.id,
          type: 'INDIVIDUAL',
          name: 'Camille Démo (personnel)',
          city: 'Lyon',
          postalCode: '69003',
        },
      });

      const building = await prisma.building.create({
        data: {
          ownerId: user.id,
          entityId: sci.id,
          name: 'Immeuble Bellecour',
          reference: 'IMM-BEL-01',
          addressLine1: '12 rue de la République',
          postalCode: '69002',
          city: 'Lyon',
          constructionYear: 1890,
          notes: 'Copropriété de 12 lots, ravalement voté en 2026.',
        },
      });

      await prisma.property.createMany({
        data: [
          {
            ownerId: user.id,
            entityId: sci.id,
            buildingId: building.id,
            name: 'Appartement 3B',
            type: 'APARTMENT',
            lotNumber: '3B',
            floor: '3',
            surfaceM2: 62.5,
            rooms: 3,
            occupancyStatus: 'OCCUPIED',
            description: 'T3 lumineux, balcon côté cour.',
          },
          {
            ownerId: user.id,
            entityId: sci.id,
            buildingId: building.id,
            name: 'Studio 1A',
            type: 'APARTMENT',
            lotNumber: '1A',
            floor: '1',
            surfaceM2: 24,
            rooms: 1,
            occupancyStatus: 'VACANT',
          },
          {
            ownerId: user.id,
            entityId: sci.id,
            buildingId: building.id,
            name: 'Parking P2',
            type: 'PARKING',
            lotNumber: 'P2',
            surfaceM2: 12.5,
            occupancyStatus: 'OCCUPIED',
          },
          {
            ownerId: user.id,
            entityId: individual.id,
            name: 'Maison des Lilas',
            type: 'HOUSE',
            addressLine1: '4 allée des Lilas',
            postalCode: '69100',
            city: 'Villeurbanne',
            surfaceM2: 110,
            rooms: 5,
            occupancyStatus: 'OCCUPIED',
            description: 'Maison indépendante avec jardin.',
          },
        ],
      });
    }

    // --- Locataires (idempotent, même si le patrimoine existait déjà) -----
    const tenantSeeds = [
      {
        key: 'camille',
        type: 'INDIVIDUAL' as const,
        name: 'Camille Martin',
        email: 'camille.martin@example.com',
        phone: '06 12 34 56 78',
        addressLine1: '8 rue Garibaldi',
        postalCode: '69003',
        city: 'Lyon',
      },
      {
        key: 'horizon',
        type: 'COMPANY' as const,
        name: 'SARL Horizon',
        email: 'gestion@sarl-horizon.example',
        phone: '04 72 00 00 00',
        addressLine1: '25 cours Lafayette',
        postalCode: '69006',
        city: 'Lyon',
      },
    ];

    const tenants: Record<string, { id: string }> = {};

    for (const seed of tenantSeeds) {
      const existing = await prisma.tenant.findFirst({
        where: { ownerId: user.id, name: seed.name },
      });
      tenants[seed.key] =
        existing ??
        (await prisma.tenant.create({
          data: {
            ownerId: user.id,
            type: seed.type,
            name: seed.name,
            email: seed.email,
            phone: seed.phone,
            addressLine1: seed.addressLine1,
            postalCode: seed.postalCode,
            city: seed.city,
          },
        }));
    }

    // --- Baux de démonstration -------------------------------------------
    const leaseSeeds = [
      {
        propertyName: 'Appartement 3B',
        tenantKey: 'camille',
        type: 'NUE' as const,
        startsOn: '2025-09-01',
        rentAmount: 890,
        chargesAmount: 60,
        depositAmount: 1780,
        paymentDay: 5,
        notes: 'Bail de résidence principale, révision annuelle à date anniversaire.',
      },
      {
        propertyName: 'Parking P2',
        tenantKey: 'horizon',
        type: 'NUE' as const,
        startsOn: '2025-01-01',
        rentAmount: 60,
        chargesAmount: 0,
        depositAmount: 120,
        paymentDay: 1,
      },
      {
        propertyName: 'Maison des Lilas',
        tenantKey: 'camille',
        type: 'MEUBLEE' as const,
        startsOn: '2026-02-01',
        rentAmount: 1250,
        chargesAmount: 120,
        depositAmount: 2500,
        paymentDay: 10,
        notes: 'Location meublée.',
      },
    ];

    let createdLeases = 0;

    for (const seed of leaseSeeds) {
      const property = await prisma.property.findFirst({
        where: { ownerId: user.id, name: seed.propertyName },
      });
      if (!property) continue;

      const existing = await prisma.lease.findFirst({
        where: { ownerId: user.id, propertyId: property.id, archivedAt: null },
      });
      if (existing) continue;

      const tenant = tenants[seed.tenantKey];
      if (!tenant) continue;

      await prisma.lease.create({
        data: {
          ownerId: user.id,
          entityId: property.entityId,
          propertyId: property.id,
          tenantId: tenant.id,
          type: seed.type,
          startsOn: dateOnly(seed.startsOn),
          rentAmount: seed.rentAmount,
          chargesAmount: seed.chargesAmount,
          depositAmount: seed.depositAmount,
          paymentDay: seed.paymentDay,
          notes: seed.notes ?? null,
        },
      });
      createdLeases += 1;

      await prisma.property.update({
        where: { id: property.id },
        data: { occupancyStatus: 'OCCUPIED' },
      });
    }

    const counts = await Promise.all([
      prisma.ownerEntity.count({ where: { ownerId: user.id } }),
      prisma.building.count({ where: { ownerId: user.id } }),
      prisma.property.count({ where: { ownerId: user.id } }),
      prisma.tenant.count({ where: { ownerId: user.id } }),
      prisma.lease.count({ where: { ownerId: user.id } }),
    ]);

    console.log('Jeu de démonstration disponible :');
    console.log(`  compte       : ${DEMO_EMAIL}`);
    console.log(`  mot de passe : ${DEMO_PASSWORD}`);
    console.log(
      `  ${counts[0]} entités, ${counts[1]} immeuble, ${counts[2]} biens, ${counts[3]} locataires, ${counts[4]} baux`,
    );
    if (createdLeases > 0) console.log(`  ${createdLeases} bail/baux ajouté(s) cette fois.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
