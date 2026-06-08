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

Cada white-label tem uma URL interna por path no formato `nexus360.consultio.com.br/slug`, por exemplo `nexus360.consultio.com.br/tgamkt`. Essa URL nao exige DNS extra, pois usa o mesmo host principal publicado no Portainer.

DNS esperado:

- `crm.tgamkt.com` deve apontar com registro `A` para `207.58.153.219`.
- Opcionalmente, `www.crm.tgamkt.com` pode apontar com `CNAME` para `crm.tgamkt.com`.

O app identifica o tenant pelo host cadastrado em Admin > White-label e mantem o usuario no dominio personalizado. A URL `nexus360.consultio.com.br/tgamkt` continua disponivel como URL interna/alternativa.

As regras fixas da stack atendem apenas `nexus360.consultio.com.br`. Dominios personalizados nao dependem de catch-all: eles entram por arquivos dinamicos gerados pela API com routers explicitos `Host(dominio)`.

Quando um dominio e cadastrado ou validado com DNS correto, a API tambem gera um arquivo em `TRAEFIK_DYNAMIC_DIR` com routers explicitos `Host(dominio)` para frontend e API. Na stack, o caminho padrao dentro do container e `/traefik/dynamic`, montado a partir de `TRAEFIK_DYNAMIC_HOST_PATH` no host.

O Traefik do Portainer precisa estar configurado com file provider observando o mesmo diretorio do host, por exemplo `--providers.file.directory=/opt/traefik/dynamic` e `--providers.file.watch=true`. Depois de configurar isso, use `POST /api/admin/domains/sync-all` como superadmin para regerar os arquivos dos dominios ja verificados.

Atualizar apenas a imagem da API nao adiciona o volume nem as variaveis novas. A definicao da stack no Portainer tambem precisa ser atualizada com `TRAEFIK_DYNAMIC_DIR` e o volume `TRAEFIK_DYNAMIC_HOST_PATH:/traefik/dynamic`.

Para HTTPS sem aviso de privacidade, o Traefik precisa emitir certificado valido para o host acessado. Se `crm.tgamkt.com` mostrar `ERR_CERT_AUTHORITY_INVALID`, o DNS pode estar apontando certo, mas o certificado desse host ainda nao foi emitido/servido pelo Traefik.

## Observacoes

- Nao versione secrets reais no reposititorio.
- Para Docker/Swarm, prefira o pooler IPv4 no `DATABASE_URL`. O host direto do Supabase pode resolver apenas IPv6 em alguns projetos.
- O Traefik roteia `/api` e `/lp` para `nexus360_api`. O frontend nao precisa proxyar a API.
- Se o login retornar 500, veja os logs do servico `nexus360_api` no Portainer. Os erros de login normalmente aparecem como `[LOGIN_ERROR]` com `prismaCode`.
