import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@nexus360.ai";
  const password = "admin-password-change-me"; // Sugerido mudar após o primeiro login
  const name = "Super Admin";

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: "SUPER_ADMIN",
        status: "ACTIVE"
      },
      create: {
        email,
        name,
        password: hashedPassword,
        role: "SUPER_ADMIN",
        status: "ACTIVE"
      }
    });

    console.log("--------------------------------------");
    console.log("✅ Super Admin criado com sucesso!");
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha: ${password}`);
    console.log("--------------------------------------");
    console.log("⚠️  Lembre-se de alterar a senha após o primeiro acesso.");
  } catch (error) {
    console.error("❌ Erro ao criar Super Admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
