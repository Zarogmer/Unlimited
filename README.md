# Unlimited 3D

Sistema web (TypeScript) de controle da impressao 3D: calcula o filamento de
um modelo do MakerWorld, guarda cada calculo, registra os lotes impressos com
custo, venda e lucro, e mostra o painel com os totais. Feito pra rodar em
nuvem e ser compartilhado entre os socios (senha unica).

Portado das features "Filamento 3D" e "Impressos" do Bot_Marketing (Python).

## O que tem

- **Calculadora de filamento** — cole o link do MakerWorld (ou informe os
  gramas na mao). Soma os gramas de cada cor em cada placa do perfil de
  impressao e responde: custo por peca, pecas por rolo, cor gargalo, rolos e
  investimento pro lote, sobra por rolo, tempo de impressao. Aceita **escala**
  (%) do slicer: o peso cai com o cubo do tamanho (60% = 21,6% do filamento).
- **Calculos** — historico de tudo que foi calculado, com relatorio .txt.
- **Impressos** — lotes realmente impressos: escala, quantidade, custo do
  material + outros custos, preco de venda -> lucro por peca, do lote e
  margem. Totais gerais no painel.
- **Configuracoes** — preco e peso do rolo, margem sobre o slicer.
- **Login** — senha compartilhada (`APP_SENHA`). Sem ela, nao pede login.

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind 4 ·
Prisma 6 · PostgreSQL.

## Rodar local

```bash
# 1) Postgres (docker)
docker run -d --name unlimited-postgres -e POSTGRES_USER=unlimited \
  -e POSTGRES_PASSWORD=unlimited -e POSTGRES_DB=unlimited -p 5434:5432 postgres:16-alpine

# 2) variaveis
cp .env.example .env   # DATABASE_URL=postgresql://unlimited:unlimited@localhost:5434/unlimited?schema=public

# 3) dependencias + banco + servidor
npm install
npx prisma migrate dev
npm run dev            # http://localhost:3000
```

## Deploy (Railway)

1. Servico **Postgres** no projeto.
2. Servico do app apontando pra este repositorio (branch `main`). O build e
   `npm run build`; o start roda `prisma migrate deploy && next start`, entao
   as migracoes sao aplicadas sozinhas a cada deploy.
3. Variaveis do app:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `APP_SENHA` = senha que voce e seu socio vao usar
   - `APP_SEGREDO` = qualquer texto aleatorio
4. Gerar o dominio publico. Healthcheck: `/api/health`.

## Estrutura

```
prisma/schema.prisma        modelos: Configuracao, Calculo, Impresso
src/lib/filamento.ts        conta do filamento (porte do filamento_3d.py)
src/lib/impressos.ts        contas de lucro (porte do impressos.py)
src/lib/formato.ts          R$, gramas, horas, datas em pt-BR
src/proxy.ts                porta de entrada (senha)
src/app/                    paginas: painel, calculadora, calculos, impressos, configuracoes, entrar
```
