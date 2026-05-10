import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
async function main() {
const prisma = new PrismaClient()
const hash = await bcrypt.hash('admin123', 10)
await prisma.user.update({ where: { email: 'contato@consultio.com.br' }, data: { password: hash } })
console.log('Password updated')
await prisma.$disconnect()
}
main()
