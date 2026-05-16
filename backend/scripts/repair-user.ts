import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function repair() {
  console.log("🛠️ Iniciando reparo de usuário...");

  const email = "contato@consultio.com.br";
  
  // 1. Achar o plano Enterprise
  const enterprisePlan = await prisma.plan.findUnique({
    where: { slug: "enterprise" }
  });

  if (!enterprisePlan) {
    console.error("❌ Plano Enterprise não encontrado. Rode 'npx prisma db seed' primeiro.");
    return;
  }

  // 2. Achar o usuário
  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true }
  });

  if (!user) {
    console.error(`❌ Usuário ${email} não encontrado.`);
    return;
  }

  // 3. Atualizar a organização do usuário para o plano Enterprise
  if (user.organizationId) {
    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { planId: enterprisePlan.id }
    });
    console.log(`✅ Organização '${user.organization?.name}' vinculada ao plano Enterprise.`);
  }

  // 4. Garantir que o usuário seja SUPER_ADMIN e esteja ACTIVE
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      role: "SUPER_ADMIN",
      status: "ACTIVE"
    }
  });

  console.log(`✅ Usuário ${email} agora é SUPER_ADMIN e está ATIVO.`);
  console.log("\n✨ Reparo concluído! Tente fazer login agora.");
}

repair()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
