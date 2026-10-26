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

    const existing = await prisma.ownerEntity.count({ where: { ownerId: user.id } });
    if (existing > 0) {
      console.log(`Jeu de démonstration déjà présent pour ${DEMO_EMAIL}.`);
      return;
    }

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

    console.log('Jeu de démonstration créé :');
    console.log(`  compte   : ${DEMO_EMAIL}`);
    console.log(`  mot de passe : ${DEMO_PASSWORD}`);
    console.log('  2 entités, 1 immeuble, 4 biens');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
