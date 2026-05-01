import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function test() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  console.log("Organizations:", JSON.stringify(orgs, null, 2));
  
  const orgId = orgs[0]?.id;
  if (orgId) {
    console.log("\nCreating test LP...");
    try {
      const lp = await prisma.landingPage.create({
        data: {
          name: "Test LP",
          slug: "test-lp-" + Date.now(),
          organizationId: orgId
        }
      });
      console.log("Created LP:", JSON.stringify(lp, null, 2));
    } catch (e) {
      console.error("Error creating LP:", e.message);
    }
  }
  
  await prisma.$disconnect();
}

test();