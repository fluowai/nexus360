# Deploy do Nexus360 no Portainer

Esta stack segue o modelo que estabilizou em producao: frontend com Nginx interno encaminhando `/api` e `/lp` para o alias `backend`, API Node na porta `10000`, rede externa `consultio1` para o Traefik e rede overlay interna `nexus360_internal`.

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
- A API recebe o alias `backend` na rede interna porque o Nginx do frontend usa `http://backend:10000`.
- Se o login retornar 500, veja os logs do servico `nexus360_api` no Portainer.
