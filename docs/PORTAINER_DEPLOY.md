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
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=troque_por_um_segredo_longo
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SEED_ADMIN_EMAIL=admin@nexus360.com
SEED_ADMIN_PASSWORD=troque_por_uma_senha_forte
RUN_DB_PUSH=true
RUN_SEED=true
```

Depois do primeiro deploy bem-sucedido, altere:

```env
RUN_DB_PUSH=false
RUN_SEED=false
```

## Publicacao

- Site: `https://nexus360.consultio.com.br`
- API: `https://nexus360.consultio.com.br/api`
- Healthcheck: `https://nexus360.consultio.com.br/api/health`
- Landing pages publicas: `https://nexus360.consultio.com.br/lp/slug-da-landing`

## Observacoes

- Nao versione secrets reais no reposititorio.
- O Traefik roteia `/api` e `/lp` para `nexus360_api`. O frontend nao precisa proxyar a API.
- Se o login retornar 500, veja os logs do servico `nexus360_api` no Portainer. Os erros de login normalmente aparecem como `[LOGIN_ERROR]` com `prismaCode`.
