# Deploy do Nexus360 no Portainer

Esta stack segue o modelo recomendado para Swarm/Portainer: frontend com Nginx servindo apenas o SPA, API Node na porta `10000`, rede externa `consultio1` para o Traefik e rede overlay interna `nexus360_internal`.

O frontend nao usa `cat <<EOF` no comando da stack. Em alguns ambientes do Portainer esse heredoc e achatado em uma unica linha e o container do Nginx sai com exit code 1.

## Imagens

- `ghcr.io/fluowai/nexus360-frontend:latest`
- `ghcr.io/fluowai/nexus360-api:latest`

O workflow `.github/workflows/docker-images.yml` publica as imagens no GHCR quando ha push na branch `main`.

## Variaveis obrigatorias no Portainer

Configure estas variaveis em **Environment variables** da stack:

```env
DATABASE_URL=postgresql://postgres.projeto:senha@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
DIRECT_URL=postgresql://postgres:senha@db.projeto.supabase.co:5432/postgres?sslmode=require&schema=public
JWT_SECRET=troque_por_um_segredo_longo
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Se `DATABASE_URL`, `DIRECT_URL` ou `JWT_SECRET` aparecerem vazios nos detalhes do container da API, a API vai encerrar com exit code 1. A stack usa variaveis obrigatorias para impedir deploy sem esses valores.

Se o banco estiver vazio, rode `npx prisma db push --skip-generate` fora do boot da API e depois execute `node prisma/seed.js` uma vez. Nao deixe migracao/seed no comando principal da API em producao.

## Publicacao

- Site: `https://nexus360.consultio.com.br`
- API: `https://nexus360.consultio.com.br/api`
- Healthcheck: `https://nexus360.consultio.com.br/api/health`
- Landing pages publicas: `https://nexus360.consultio.com.br/lp/slug-da-landing`

## White-label e dominios customizados

Cada white-label tem uma URL interna por path no formato `nexus360.consultio.com.br/slug`, por exemplo `nexus360.consultio.com.br/tgamkt`. Essa URL nao exige DNS extra, pois usa o mesmo host principal publicado no Portainer.

DNS esperado:

- `crm.tgamkt.com` deve apontar com registro `A` para `207.58.153.219`.
- Opcionalmente, `www.crm.tgamkt.com` pode apontar com `CNAME` para `crm.tgamkt.com`.

O app identifica o tenant pelo host cadastrado em Admin > White-label e mantem o usuario no dominio personalizado. A URL `nexus360.consultio.com.br/tgamkt` continua disponivel como URL interna/alternativa.

As regras da stack mantem um `HostRegexp` global para roteamento generico, mas certificado HTTPS valido para dominios de clientes precisa de regra concreta `Host(...)`. Por isso o fluxo escalavel usa arquivos dinamicos do Traefik:

1. O cliente aponta o dominio para `207.58.153.219`.
2. O admin cadastra/valida o dominio no front.
3. A API escreve um arquivo em `/traefik/dynamic` com os routers `Host(...)` daquele dominio.
4. O Traefik le esse arquivo pelo provider file e emite o certificado pelo `letsencryptresolver`.

A stack do Nexus monta o volume nomeado `traefik_dynamic` em `/traefik/dynamic`; isso evita o erro de bind mount quando `/opt/traefik/dynamic` nao existe no host.

### Ajuste unico na stack do Traefik

O servico Traefik tambem precisa montar o mesmo volume e habilitar o provider file. Isso e feito uma unica vez na stack do Traefik, nao por cliente:

```yaml
services:
  traefik:
    command:
      - "--providers.file.directory=/traefik/dynamic"
      - "--providers.file.watch=true"
    volumes:
      - traefik_dynamic:/traefik/dynamic

volumes:
  traefik_dynamic:
    name: traefik_dynamic
```

Se o Traefik ja tiver uma lista `command`, apenas adicione essas duas linhas `providers.file`. Se ele ja tiver `volumes`, apenas adicione o volume `traefik_dynamic`.

Em Swarm com mais de um node, a API e o Traefik precisam enxergar o mesmo volume. Em servidor unico, o volume local funciona. Em cluster multi-node, use volume compartilhado ou restrinja API e Traefik ao mesmo node.

## Observacoes

- Nao versione secrets reais no reposititorio.
- Para Docker/Swarm, prefira o pooler IPv4 no `DATABASE_URL`. O host direto do Supabase pode resolver apenas IPv6 em alguns projetos.
- O Traefik roteia `/api` e `/lp` para `nexus360_api`. O Nginx do frontend serve apenas o SPA e nao referencia o host interno `backend` para evitar falha no startup do container.
- Se o login retornar 500, veja os logs do servico `nexus360_api` no Portainer. Os erros de login normalmente aparecem como `[LOGIN_ERROR]` com `prismaCode`.
