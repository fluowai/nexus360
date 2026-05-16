import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'contato@consultio.com.br';
  const password = 'Argo@15077399brsc';
  const hashedPassword = await bcrypt.hash(password, 12);

  // Verifica se usuário existe
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Atualiza a senha e garante SUPER_ADMIN
    await prisma.user.update({
      where: { email },
      data: { 
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      }
    });
    console.log(`✅ Senha do usuário ${email} atualizada com sucesso!`);
  } else {
    // Cria o usuário do zero
    await prisma.user.create({
      data: {
        name: 'Paulo Admin',
        email,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      }
    });
    console.log(`✅ Usuário ${email} criado como SUPER_ADMIN!`);
  }
}

main()
  .catch((e) => { console.error('Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
