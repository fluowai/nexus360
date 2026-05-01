import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
  console.log("🚀 Starting System Health Check...\n");

  try {
    // 1. Create Organization
    console.log("1. Testing Organization Creation...");
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: { name: "Test Agency", domain: "test.nexus360.com", plan: "Pro" }
      });
      console.log("   ✅ Created test organization:", org.id);
    } else {
      console.log("   ✅ Organization exists:", org.id);
    }

    // 2. Create Creative (Marketing Ops)
    console.log("2. Testing Marketing Ops (Creatives)...");
    const creative = await prisma.creative.create({
      data: {
        title: "FB Ad Test",
        type: "image",
        contentUrl: "https://example.com/img.jpg",
        organizationId: org.id
      }
    });
    console.log("   ✅ Created creative:", creative.id);

    // 3. Create Lead (CRM)
    console.log("3. Testing Lead Generation...");
    const lead = await prisma.lead.create({
      data: {
        name: "John Doe",
        email: "john@example.com",
        source: "Facebook",
        organizationId: org.id
      }
    });
    console.log("   ✅ Created lead:", lead.id);

    // 4. Test Sales Queue
    console.log("4. Testing Sales Queue (SDR/BDR)...");
    const queue = await prisma.lead.findMany({
      where: { organizationId: org.id, status: { in: ['novo', 'contato'] } },
      include: { followUps: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' }
    });
    console.log(`   ✅ Sales queue returned ${queue.length} items`);

    // 5. Create Client
    console.log("5. Testing Client Registration...");
    const client = await prisma.client.create({
      data: {
        corporateName: "Tech Corp LTDA",
        email: "contact@techcorp.com",
        organizationId: org.id
      }
    });
    console.log("   ✅ Created client:", client.id);

    // 6. Create Proposal
    console.log("6. Testing Proposal Generation...");
    const proposal = await prisma.proposal.create({
      data: {
        title: "Q3 Marketing Services",
        clientId: client.id,
        organizationId: org.id,
        status: "rascunho",
        subtotal: 5000,
        total: 5000,
        items: {
          create: [{ service: "Meta Ads Management", quantity: 1, unitPrice: 5000, total: 5000, order: 0 }]
        }
      },
      include: { items: true, client: true }
    });
    console.log("   ✅ Created proposal:", proposal.id);

    console.log("\n🎉 All core systems are operational!");
  } catch (error) {
    console.error("\n❌ SYSTEM CHECK FAILED:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
