import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Lista de e-mails permitidos como SUPER_ADMIN
  const allowedEmails = [
    'fluowai@gmail.com',
    'contato@teste.com',
    'paulo@consultio.com.br',
    'contato@consultio.com.br'
  ];

  console.log('--- Iniciando Limpeza de Super Admins ---');

  // 1. Rebaixar TODO MUNDO que não esteja na lista para ORG_ADMIN
  const updated = await prisma.user.updateMany({
    where: {
      role: 'SUPER_ADMIN',
      NOT: {
        email: {
          in: allowedEmails
        }
      }
    },
    data: { 
      role: 'ORG_ADMIN' 
    }
  });

  console.log(`> Sucesso! ${updated.count} usuários foram rebaixados para ORG_ADMIN (incluindo Thiago).`);

  // 2. Garantir que os e-mails permitidos SEJAM SUPER_ADMIN (caso algum tenha sido criado errado)
  const promoted = await prisma.user.updateMany({
    where: {
      email: { in: allowedEmails },
      NOT: { role: 'SUPER_ADMIN' }
    },
    data: { role: 'SUPER_ADMIN' }
  });

  if (promoted.count > 0) {
    console.log(`> Plus: ${promoted.count} de suas contas Paulo foram promovidas a SUPER_ADMIN.`);
  }

  console.log('--- Limpeza Concluída com Sucesso ---');
}

main()
  .catch((e) => {
    console.error('Erro ao executar limpeza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
