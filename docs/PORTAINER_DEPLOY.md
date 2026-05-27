# Deploy do Nexus360 no Portainer

Use o arquivo `docker-stack.portainer.yml` para publicar em Swarm/Portainer no mesmo padrão da stack da Imobzy: imagens no GHCR, rede externa do Traefik e uma rede interna overlay.

## Stack

Serviços publicados:

- `frontend`: `ghcr.io/fluowai/nexus360-frontend:latest`, exposto pelo Traefik em `https://nexus360.consultio.com.br`.
- `api`: `ghcr.io/fluowai/nexus360-api:latest`, exposto pelo Traefik apenas em `/api` e `/lp`.
- `postgres`: PostgreSQL 16 interno com volume persistente `nexus360_postgres_data`.

Redes:

- `consultio1`: rede externa já usada pelo Traefik.
- `nexus360_internal`: rede overlay interna da aplicação.

## Como subir

1. Envie as alterações para o GitHub. O workflow `.github/workflows/docker-images.yml` publica automaticamente:
   - `ghcr.io/fluowai/nexus360-frontend:latest`
   - `ghcr.io/fluowai/nexus360-api:latest`
2. No Portainer, acesse **Stacks > Add stack**.
3. Use **Repository** e informe `docker-stack.portainer.yml` como compose path, ou cole o conteúdo no Web editor.
4. Configure as variáveis da Stack usando `.env.portainer.example` como base.
5. Troque obrigatoriamente `POSTGRES_PASSWORD`, `JWT_SECRET` e `SEED_ADMIN_PASSWORD`.
6. Faça o DNS `nexus360.consultio.com.br` apontar para o servidor onde o Traefik está rodando.
7. Deploy.

## Variáveis essenciais

```env
POSTGRES_DB=nexus360
POSTGRES_USER=nexus360
POSTGRES_PASSWORD=troque_por_uma_senha_forte
JWT_SECRET=troque_por_um_segredo_longo_com_32_chars_ou_mais
FRONTEND_URL=https://nexus360.consultio.com.br
CORS_ORIGINS=https://nexus360.consultio.com.br
SEED_ADMIN_EMAIL=admin@nexus360.com
SEED_ADMIN_PASSWORD=troque_por_uma_senha_forte
RUN_DB_PUSH=true
RUN_SEED=true
VITE_API_URL=same-origin
```

Se for usar banco externo, defina `DATABASE_URL` e `DIRECT_URL` na Stack. Se usar o Postgres interno, deixe a stack montar as URLs automaticamente a partir de `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD`.

## Depois do primeiro deploy

Depois que o banco já estiver criado e semeado, você pode mudar:

```env
RUN_DB_PUSH=false
RUN_SEED=false
```

Assim os próximos restarts não tentam sincronizar schema e seed de novo.

## Verificações

- Site: `https://nexus360.consultio.com.br`
- API health: `https://nexus360.consultio.com.br/api/health`
- Landing pages públicas: `https://nexus360.consultio.com.br/lp/slug-da-landing`
