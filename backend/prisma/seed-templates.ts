import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const templates = [
    { id: 'ancora', name: 'Âncora Clean', description: 'Template jurídico clean verde' },
    { id: 'executive', name: 'Executive Gold', description: 'Template luxo preto e dourado' },
    { id: 'modern', name: 'Modern Security', description: 'Template azul marinho e branco' },
    { id: 'prestige', name: 'Prestige Agility', description: 'Template dinâmico marinho e ouro' },
    { id: 'elegance', name: 'Elegance Strategy', description: 'Template sofisticado vinho' },
    { id: 'lead-gen', name: 'Geração de Leads', description: 'Template padrão para leads' },
    { id: 'webinar', name: 'Webinar', description: 'Template para eventos online' },
    { id: 'ebook', name: 'Ebook', description: 'Template para download de materiais' },
  ];

  console.log('🌱 Semeando templates no banco de dados...');

  for (const t of templates) {
    await prisma.lPTemplate.upsert({
      where: { id: t.id },
      update: { name: t.name, description: t.description },
      create: { id: t.id, name: t.name, description: t.description, category: 'premium' }
    });
  }

  console.log('✅ Templates sincronizados com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
