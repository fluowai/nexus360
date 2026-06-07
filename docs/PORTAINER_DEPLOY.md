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

Se o banco estiver vazio, rode `npx prisma db push --skip-generate` fora do boot da API e depois execute `node prisma/seed.js` uma vez. Nao deixe migracao/seed no comando principal da API em producao.

## Publicacao

- Site: `https://nexus360.consultio.com.br`
- API: `https://nexus360.consultio.com.br/api`
- Healthcheck: `https://nexus360.consultio.com.br/api/health`
- Landing pages publicas: `https://nexus360.consultio.com.br/lp/slug-da-landing`

## White-label e dominios customizados

Cada white-label deve ter um subdominio do sistema no formato `slug.nexus360.consultio.com.br`, por exemplo `tgamkt.nexus360.consultio.com.br`.

DNS esperado:

- `tgamkt.nexus360.consultio.com.br` deve apontar com registro `A` para `207.58.153.219` ou existir via wildcard `*.nexus360.consultio.com.br`.
- `crm.tgamkt.com` pode apontar com registro `CNAME` para `tgamkt.nexus360.consultio.com.br` ou com registro `A` para `207.58.153.219`.

Para HTTPS sem aviso de privacidade, o Traefik precisa emitir certificado valido para o host acessado. Se `crm.tgamkt.com` mostrar `ERR_CERT_AUTHORITY_INVALID`, o DNS pode estar apontando certo, mas o certificado desse host ainda nao foi emitido/servido pelo Traefik.

## Observacoes

- Nao versione secrets reais no reposititorio.
- Para Docker/Swarm, prefira o pooler IPv4 no `DATABASE_URL`. O host direto do Supabase pode resolver apenas IPv6 em alguns projetos.
- O Traefik roteia `/api` e `/lp` para `nexus360_api`. O frontend nao precisa proxyar a API.
- Se o login retornar 500, veja os logs do servico `nexus360_api` no Portainer. Os erros de login normalmente aparecem como `[LOGIN_ERROR]` com `prismaCode`.
