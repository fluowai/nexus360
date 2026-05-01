# 🚀 NEXUS360 - ROADMAP VISÃO 360°
## Plano Maestro de Implementação Completa

---

## FASE 1: FUNDAMENTOS (Semanas 1-2)
### 1.1 Expansão do Schema do Banco

```prisma
// ============ GESTÃO DE CONTAS DE ANÚNCIO ============

model AdAccount {
  id             String       @id @default(uuid())
  accountId      String       // ID real da plataforma (ex: act_123456)
  accountName    String
  platform       String       // meta, google, linkedin, tiktok
  accountStatus  String       @default("active") // active, paused, disabled
  
  // Credenciais (criptografadas)
  accessToken    String?
  refreshToken   String?
  tokenExpiry   DateTime?
  
  // Dados da Plataforma
  accountCurrency String?
  accountTimezone  String?
  
  // Stats
  dailySpendLimit Float     @default(0)
  currentSpend    Float     @default(0)
  
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  campaigns      CampaignAd[]
  creatives      AdCreative[]
  audiences      CustomAudience[]
  
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model CampaignAd {
  id             String       @id @default(uuid())
  campaignId     String       // ID real da plataforma
  name           String
  
  platform       String       // meta, google, linkedin, tiktok
  objective      String       // traffic, conversions, leads, awareness, engagement
  
  status         String       @default("paused")
  biddingStrategy String      // lowest_cost, target_cost, manual
  
  // Datas
  startDate      DateTime?
  endDate        DateTime?
  
  // Orçamento
  budgetType     String       // daily, lifetime
  budgetAmount   Float        @default(0)
  spendAmount    Float        @default(0)
  
  // Targeting
  locations      String?      // JSON array
  ageMin         Int          @default(18)
  ageMax         Int          @default(65)
  genders       String?      // JSON array
  interests     String?      // JSON array
  
  // Pixel/Conversion
  pixelId       String?
  conversionEvent String?
  
  adAccountId    String
  adAccount     AdAccount    @relation(fields: [adAccountId], references: [id])
  
  adSets         AdSet[]
  ads           Ad[]
  
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model AdSet {
  id             String       @id @default(uuid())
  adSetId         String       // ID real da plataforma
  name           String
  
  status         String       @default("active")
  
  // Targeting detalhado
  targeting      String?      // JSON completo
  
  // Orçamento
  budgetType     String       @default("daily")
  budgetAmount   Float        @default(0)
  
  campaignAdId   String
  campaignAd    CampaignAd   @relation(fields: [campaignAdId], references: [id])
  
  ads            Ad[]
  
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model Ad {
  id             String       @id @default(uuid())
  adId           String       // ID real da plataforma
  name           String
  
  status         String       @default("active")
  format         String       // image, video, carousel, collection
  
  creativeId     String?
  creative       AdCreative? @relation(fields: [creativeId], references: [id])
  
  adSetId        String
  adSet          AdSet        @relation(fields: [adSetId], references: [id]) 
  
  // Stats
  impressions    Int          @default(0)
  clicks         Int          @default(0)
  spend          Float        @default(0)
  conversions   Int          @default(0)
  
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model AdCreative {
  id             String       @id @default(uuid())
  name           String
  
  // Tipo
  type           String       // image, video, carousel, collection, story
  
  // Assets
  imageUrl       String?
  videoUrl      String?
  thumbnailUrl  String?
  
  // Copy
  headline      String?
  primaryText  String?
  description  String?
  callToAction String?      // learn_more, sign_up, shop_now, etc
  
  // Link
  displayLink   String?
  destinationUrl String?
  
  // Platform specific
  platformData  String?      // JSON com dados específicos
  
  adAccountId   String
  adAccount    AdAccount    @relation(fields: [adAccountId], references: [id])
  
  ads          Ad[]
  
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

model CustomAudience {
  id             String       @id @default(uuid())
  audienceId     String       // ID real da plataforma
  name           String
  platform       String       // meta, google
  description    String?
  
  // Tipo
  audienceType   String       // custom, lookalike, interest, engagement
  
  // Definição
  rule          String?      // JSON com regra
  sourceAudience String?     // ID de origem para lookalike
  
  // Tamanho
  size          Int          @default(0)
  
  adAccountId   String
  adAccount    AdAccount    @relation(fields: [adAccountId], references: [id])
  
  createdAt    DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

// ============ BIBLIOTECA DE ASSETS ============

model Asset {
  id             String       @id @default(uuid())
  name           String
  type           String       // image, video, audio, document, template
  mimeType       String?
  size           Int?
  
  // URL
  url            String?
  thumbnailUrl  String?
  
  // Metadados
  width         Int?
  height       Int?
  duration     Int?         // para videos
  tags          String?      // JSON array
  
  // Pasta
  folderId      String?
  folder       AssetFolder? @relation(fields: [folderId], references: [id])
  
  // Uso
  usedIn       String?      // JSON - onde está sendo usado
  
  organizationId String
  organization  Organization @relation(fields: [organizationId], references: [id])
  
  createdAt    DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model AssetFolder {
  id             String       @id @default(uuid())
  name           String
  parentId       String?
  parent        AssetFolder?  @relation("FolderHierarchy", fields: [parentId], references: [id])
  children      AssetFolder[] @relation("FolderHierarchy")
  
  organizationId String
  organization  Organization  @relation(fields: [organizationId], references: [id])
  
  createdAt     DateTime      @default(now())
}

// ============ LANDING PAGES ============

model LandingPage {
  id             String       @id @default(uuid())
  name           String
  slug           String       @unique // nome do subdomain
  
  // Template
  templateId    String?
  template      LPTemplate?  @relation(fields: [templateId], references: [id])
  
  // Conteúdo
  headline      String?
  subheadline   String?
  heroImage    String?
  heroVideo   String?
  sections    String?      // JSON com sections
  
  // Form
  formId        String?
  form         LPForm?       @relation(fields: [formId], references: [id])
  formProvider String?      // meta, google, native
  formConfig   String?      // JSON com config
  
  // Estado
  status        String       @default("draft") // draft, published, paused
  
  // Stats
  views        Int          @default(0)
  submissions  Int          @default(0)
  conversionRate Float       @default(0)
  
  // Domínio
  domain       String?
  customDomain String?
  
  // SEO
  metaTitle    String?
  metaDescription String?
  metaImage   String?
  
  organizationId String
  organization  Organization @relation(fields: [organizationId], references: [id])
  
  createdAt    DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model LPTemplate {
  id            String        @id @default(uuid())
  name          String
  category     String        // lead_gen, webinar, ebook, product, service
  
  // Template
  thumbnail    String?
  htmlTemplate String?      // HTML completo com placeholders
  
  // Config
  isActive     Boolean       @default(true)
  isPro        Boolean       @default(false)
  
  landingPages LandingPage[]
  
  createdAt   DateTime     @default(now())
}

model LPForm {
  id              String        @id @default(uuid())
  name            String
  
  // Campos
  fields          String        // JSON array de campos
  
  // Config
  submitAction    String       // url, webhook, email
  submitUrl     String?      // URL para submission
  webhookUrl    String?      // Webhook URL
  emailTo       String?      // Email para notificação
  emailSubject  String?
  
  // Auto-response
  autoReply      Boolean      @default(false)
  replySubject  String?
  replyMessage  String?
  
  // GDPR
  gdprConsent   Boolean      @default(false)
  gdprText      String?
  
  landingPages  LandingPage[]
  
  createdAt   DateTime     @default(now())
}

// ============ QUIZ / LEAD QUALIFIER ============

model Quiz {
  id             String       @id @default(uuid())
  name           String
  description    String?
  
  // Tipo
  quizType       String       // qualification, assessment, recommendation
  
  // Config
  isActive       Boolean      @default(true)
  isProspectOnly Boolean     @default(false)
  
  // Scoring
  scoringType   String       // binary, points, segments
  passScore    Int?         // Score mínimo para lead quente
  
  // Results
  resultsConfig String?    // JSON com configuração de resultados
  
  questions    QuizQuestion[]
  submissions  QuizSubmission[]
  
  organizationId String
  organization  Organization  @relation(fields: [organizationId], references: [id])
  
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

model QuizQuestion {
  id             String       @id @default(uuid())
  questionText   String
  
  // Tipo
  questionType   String       // multiple_choice, multiple_select, rating, text, email, phone
  
  // Opções (para choice)
  options       String?      // JSON array
  
  // Config
  isRequired    Boolean      @default(true)
  order         Int
  
  // Scoring
  points        Int          @default(1)
  
  quizId        String
  quiz          Quiz         @relation(fields: [quizId], references: [id])
  
  createdAt    DateTime     @default(now())
}

model QuizSubmission {
  id             String       @id @default(uuid())
  
  // Respostas
  answers       String       // JSON com respostas
  
  // Score
  score        Int?
  segment      String?      // Segmento resultado
  
  // Lead
  leadId       String?
  lead         Lead?        @relation(fields: [leadId], references: [id])
  
  // Contato (se não tinha lead)
  contactName  String?
  contactEmail String?
  contactPhone String?
  
  quizId       String
  quiz        Quiz        @relation(fields: [quizId], references: [id])
  
  createdAt   DateTime     @default(now())
}

// ============ RELATÓRIOS ANALYTICS ============

model AnalyticsReport {
  id             String       @id @default(uuid())
  name           String
  
  // Tipo
  reportType    String       // daily, weekly, monthly, custom
  
  // Datas
  startDate     DateTime
  endDate       DateTime
  
  // Dados
  data          String       // JSON com dados
  
  // Scheduled
  isScheduled   Boolean     @default(false)
  scheduleCron  String?     // Cron expression
  
  organizationId String
  organization  Organization  @relation(fields: [organizationId], references: [id])
  
  createdAt    DateTime     @default(now())
}

// ============ AUTOMATION ============

model Automation {
  id             String       @id @default(uuid())
  name           String
  description    String?
  
  // Tipo
  triggerType   String       // form_submission, quiz_completion, lead_score, manual
  triggerConfig String?     // JSON
  
  // Condições
  conditions    String?     // JSON array
  
  // Ações
  actions       String?      // JSON array
  
  // Estado
  isActive      Boolean     @default(true)
  
  // Stats
  executions    Int         @default(0)
  lastExecution  DateTime?
  
  organizationId String
  organization  Organization @relation(fields: [organizationId], references: [id])
  
  createdAt    DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}
```

---

## FASE 2: BACKEND APIs (Semanas 3-4)

### 2.1 Ad Account Management
```typescript
// /api/ad-accounts
// GET - Listar contas conectadas
// POST - Conectar nova conta (OAuth flow)
// DELETE - Desconectar conta

// /api/ad-accounts/:id/sync
// POST - Sincronizar dados da conta

// /api/ad-accounts/:id/campaigns
// GET - Listar campanhas
// POST - Criar Campanha

// /api/ad-accounts/:id/creatives
// GET - Listar criativos
// POST - Upload criativo
```

### 2.2 Campaign Management
```typescript
// /api/campaigns
// GET - Lista todas campanhas (multi-conta)
// POST - Criar campanha

// /api/campaigns/:id
// GET - Detalhes
// PATCH - Atualizar
// DELETE - Deletar

// /api/campaigns/:id/ads
// GET - Lista ads
// POST - Criar ad

// /api/campaigns/:id/analytics
// GET - Métricas
```

### 2.3 Assets Library
```typescript
// /api/assets
// GET - Listar assets (com filtros, paginação)
// POST - Upload asset
// DELETE - Deletar

// /api/assets/folders
// GET - Listar pastas
// POST - Criar pasta
// PATCH - Mover

// /api/assets/generate-thumbnails
// POST - Gerar thumbnails
```

### 2.4 Landing Pages
```typescript
// /api/landing-pages
// GET - Listar landing pages
// POST - Criar landing page

// /api/landing-pages/:id
// GET - Detalhes
// PATCH - Atualizar
// DELETE - Deletar

// /api/landing-pages/:id/publish
// POST - Publicar

// /api/landing-pages/:id/preview
// GET - Preview

// /api/landing-pages/:id/analytics
// GET - Métricas

// /api/landing-pages/templates
// GET - Listar templates

// /api/landing-pages/forms
// GET - Listar forms
// POST - Criar form
```

### 2.5 Quiz
```typescript
// /api/quizzes
// GET - Listar quizzes
// POST - Criar quiz

// /api/quizzes/:id
// GET - Detalhes
// PATCH - Atualizar
// DELETE - Deletar

// /api/quizzes/:id/questions
// POST - Adicionar pergunta

// /api/quizzes/:id/submit
// POST - Submeter quiz

// /api/quizzes/:id/results
// GET - Ver resultados
```

### 2.6 Analytics
```typescript
// /api/analytics/dashboard
// GET - Dashboard geral

// /api/analytics/campaigns
// GET - Analytics por campanha

// /api/analytics/attribution
// GET - Atribuição

// /api/analytics/export
// GET - Exportar relatório
```

---

## FASE 3: INTERFACES (Semanas 5-8)

### 3.1 Ad Accounts Page
- Lista de contas conectadas
- Status de cada conta
- Grid de plataformas (Meta, Google, LinkedIn, TikTok)
- Botão "Conectar Conta"
- Modal de OAuth
- Detalhes da conta

### 3.2 Campaigns Dashboard
- Grid de campanhas
- Filtros por plataforma, status, data
- Cards com métricas
- Status automático (ativa/pausada)
- Criação rápida de campanha

### 3.3 Creative Studio
- Editor visual de criativos
- Templates por formato
- Upload de imagens
- Editor de texto
- Previsualização por posição
- Variações A/B

### 3.4 Asset Library
- Grid de thumbnails
- Pastas hierárquicas
- Drag & drop upload
- Busca por tags
- Preview modal
- Uso em campanhas

### 3.5 Landing Page Builder
- Editor WYSIWYG
- Templates prontos
- Seções (Hero, Features, Form, Testimonials)
- Preview desktop/mobile
- Publicar com subdomain
- SSL automático
- Integração com Analytics

### 3.6 Quiz Builder
- Criador de perguntas
- Tipos de resposta
- Configuração de score
- Resultado por segmento
- Preview
- Embed codes

### 3.7 Analytics Dashboard
- Dashboards por plataforma
- Gráficos interativos
- Comparação de campanhas
- Exportação PDF/Excel
- Agendamento de relatórios

---

## FASE 4: INTEGRAÇÕES (Semanas 9-12)

### 4.1 Meta Business API
- OAuth connect
- Listar accounts
- Criar gerenciar campanhas
- Upload criativos
- audiencias customizadas
- Lead forms
- Webhooks

### 4.2 Google Ads API
- OAuth connect
- Listar accounts
- Criar campanhas
- audiencias similares
- Conversion tracking
- Google Analytics integration

### 4.3 WhatsApp Business API
- Connect number
- Send templates
- Send messages
- Receive webhooks
- Automation sequences

### 4.4 Integrações Extras
- LinkedIn Ads
- TikTok Ads
- Pinterest Ads
- Twitter Ads

---

## FASE 5: AUTOMATION & AI (Semanas 13-16)

### 5.1 Automation Engine
- Triggers
- Conditions
- Actions
- Templates
- Execution logs

### 5.2 AI Features
- Copy generation
- Image generation
- Audience suggestions
- Budget optimization
- A/B testing automation
- Predictive scoring

---

## PRIORIDADES DE IMPLEMENTAÇÃO

| # | Módulo | Semanas | Dependências |
|---|--------|---------|--------------|
| 1 | Schema + APIs Ads | 1-2 | - |
| 2 | Asset Library | 2-3 | Schema |
| 3 | Landing Pages | 3-4 | Schema |
| 4 | Quiz Builder | 4-5 | Schema |
| 5 | Campaign UI | 5-6 | APIs |
| 6 | Ad Accounts UI | 6-7 | APIs |
| 7 | Creative Studio | 7-8 | Asset Library |
| 8 | Analytics | 8-10 | Campaign data |
| 9 | Automation | 10-12 | All |
| 10 | AI Features | 12-16 | All |

---

## CHECKLIST DE IMPLEMENTAÇÃO

### Week 1-2: Foundation
- [ ] Atualizar Prisma schema
- [ ] Criar migrations
- [ ] APIs básicas AdAccount
- [ ] APIs Campaign/Ad/AdSet
- [ ] APIs Asset upload

### Week 3-4: Core Features
- [ ] APIs Landing Pages
- [ ] APIs Quiz
- [ ] APIs Analytics

### Week 5-6: UI
- [ ] Ad Accounts page
- [ ] Campaigns dashboard
- [ ] Asset Library page

### Week 7-8: Advanced UI
- [ ] Landing Page Builder
- [ ] Quiz Builder
- [ ] Analytics Dashboard

### Week 9-12: Integrations
- [ ] Meta Business API
- [ ] Google Ads API
- [ ] WhatsApp Business

### Week 13-16: Automation & AI
- [ ] Automation engine
- [ ] AI copy generation
- [ ] AI creative suggestions