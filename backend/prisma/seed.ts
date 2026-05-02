import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Create Super Admin
  const admin = await prisma.user.upsert({
    where: { email: 'contato@consultio.com.br' },
    update: {},
    create: {
      email: 'contato@consultio.com.br',
      name: 'Dono do Sistema',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  })

  console.log({ admin })

  // Create Sample Plans
  await prisma.globalPlan.upsert({
    where: { id: 'sample-plan-pro' },
    update: {},
    create: {
      id: 'sample-plan-pro',
      name: 'Pro',
      price: 499.00,
      features: ['Leads Ilimitados', '10 Usuários', 'CRM Completo'],
    }
  })

  // Create Sample Organization
  await prisma.organization.upsert({
    where: { id: 'sample-org-1' },
    update: {},
    create: {
      id: 'sample-org-1',
      name: 'Imobiliária Alpha',
      plan: 'Pro',
      domain: 'alpha.imob.com.br'
    }
  })

  // Create Sample Alert
  await prisma.systemAlert.create({
    data: {
      level: 'info',
      message: 'Sistema operando com performance otimizada.',
    }
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
