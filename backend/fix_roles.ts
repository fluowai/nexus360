import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.user.updateMany({
    where: {
      email: 'thiago@tgamkt.com'
    },
    data: {
      role: 'ORG_ADMIN'
    }
  });
  console.log(`Updated ${updated.count} users. Thiago is now ORG_ADMIN.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
