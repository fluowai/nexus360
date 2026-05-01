import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed started...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  // 1. Create Organizations
  const superOrg = await prisma.organization.upsert({
    where: { domain: "nexus360.ai" },
    update: {},
    create: {
      name: "Nexus360 Super Admin",
      domain: "nexus360.ai",
      plan: "Enterprise",
    },
  });

  const alphaOrg = await prisma.organization.upsert({
    where: { domain: "alpha.com" },
    update: {},
    create: {
      name: "Agência Alpha",
      domain: "alpha.com",
      plan: "Pro",
    },
  });

  // 2. Create Users
  await prisma.user.upsert({
    where: { email: "super@nexus360.ai" },
    update: {},
    create: {
      email: "super@nexus360.ai",
      name: "Super Admin",
      password: hashedPassword,
      role: "SUPERADMIN",
      organizationId: superOrg.id,
    },
  });

  const alphaAdmin = await prisma.user.upsert({
    where: { email: "admin@alpha.com" },
    update: {},
    create: {
      email: "admin@alpha.com",
      name: "Carlos Alpha",
      password: hashedPassword,
      role: "ADMIN",
      organizationId: alphaOrg.id,
    },
  });

  // 3. Create initial leads for Alpha
  await prisma.lead.createMany({
    data: [
      {
        name: "João Silva",
        email: "joao@tech.com",
        status: "novo",
        value: 5000,
        organizationId: alphaOrg.id,
        assignedToId: alphaAdmin.id,
      },
      {
        name: "Maria Souza",
        email: "maria@commerce.br",
        status: "contato",
        value: 12000,
        organizationId: alphaOrg.id,
      },
      {
        name: "Carlos Oliveira",
        email: "carlos@vendas.com",
        status: "qualificado",
        value: 8500,
        organizationId: alphaOrg.id,
      },
    ],
  });

  // 4. Create LP Templates
  await prisma.lPTemplate.createMany({
    data: [
      {
        name: "Geração de Leads",
        category: "lead_gen",
        isActive: true,
        isPro: false,
      },
      {
        name: "Webinar",
        category: "webinar",
        isActive: true,
        isPro: false,
      },
      {
        name: "Ebook",
        category: "ebook",
        isActive: true,
        isPro: false,
      },
      {
        name: "Produto/Serviço",
        category: "product",
        isActive: true,
        isPro: true,
      },
    ],
  });

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
