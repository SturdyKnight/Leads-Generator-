/**
 * Seed a demo campaign with a handful of leads, so a fresh database has
 * something to look at. Idempotent — safe to run more than once.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_LEADS = [
  { placeId: 'demo-1', name: 'Blue Tokai Coffee Roasters', phone: '+91 22 4005 1234', website: 'https://bluetokaicoffee.com', rating: 4.5, reviewCount: 1820, status: 'QUALIFIED', score: 88 },
  { placeId: 'demo-2', name: 'Kala Ghoda Cafe', phone: '+91 22 2263 3866', website: 'https://kalaghodacafe.com', rating: 4.3, reviewCount: 2410, status: 'CONTACTED', score: 85 },
  { placeId: 'demo-3', name: 'Prithvi Cafe', phone: '+91 22 2614 9546', website: null, rating: 4.4, reviewCount: 3100, status: 'DISCOVERED', score: 62 },
  { placeId: 'demo-4', name: 'Subko Coffee Roasters', phone: '+91 91361 61111', website: 'https://subko.coffee', rating: 4.6, reviewCount: 940, status: 'INTERESTED', score: 91 },
  { placeId: 'demo-5', name: 'Corner Chai Stall', phone: null, website: null, rating: 3.9, reviewCount: 42, status: 'LOST', score: 21 },
];

async function main() {
  const operator = await prisma.user.upsert({
    where: { email: 'operator@bmatrix.local' },
    update: {},
    create: { email: 'operator@bmatrix.local', name: 'Operator' },
  });

  const config = {
    city: 'Mumbai',
    keywords: ['coffee shop', 'cafe'],
    localities: ['Bandra', 'Colaba'],
    maxResults: 100,
    focusOnChains: false,
  };

  const existing = await prisma.campaign.findFirst({ where: { name: 'Mumbai coffee shops' } });

  const campaign =
    existing ??
    (await prisma.campaign.create({
      data: {
        name: 'Mumbai coffee shops',
        description: 'Sample campaign created by the seed script.',
        config: JSON.stringify(config),
        createdById: operator.id,
        startedAt: new Date(),
      },
    }));

  const session = await prisma.discoverySession.create({
    data: {
      campaignId: campaign.id,
      name: 'Seed run',
      config: JSON.stringify(config),
      status: 'COMPLETED',
      totalLeads: DEMO_LEADS.length,
      discoveredAt: new Date(),
    },
  });

  for (const lead of DEMO_LEADS) {
    await prisma.lead.upsert({
      where: { campaignId_placeId: { campaignId: campaign.id, placeId: lead.placeId } },
      update: {},
      create: {
        ...lead,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        address: 'Mumbai, Maharashtra',
        categories: JSON.stringify(['cafe', 'coffee_shop']),
        source: 'google_places',
        campaignId: campaign.id,
        sessionId: session.id,
        createdById: operator.id,
        logs: { create: { type: 'created', message: 'Discovered in "Seed run"' } },
      },
    });
  }

  // Keep the denormalized counters consistent with what was just inserted.
  const grouped = await prisma.lead.groupBy({
    by: ['status'],
    where: { campaignId: campaign.id },
    _count: { _all: true },
  });
  const aggregate = await prisma.lead.aggregate({
    where: { campaignId: campaign.id },
    _avg: { score: true },
    _count: { _all: true },
  });

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      leadsByStatus: JSON.stringify(
        Object.fromEntries(grouped.map((row) => [row.status, row._count._all])),
      ),
      totalLeads: aggregate._count._all,
      avgScore: Math.round((aggregate._avg.score ?? 0) * 10) / 10,
    },
  });

  console.log(`Seeded "${campaign.name}" with ${aggregate._count._all} leads.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
