# Controle Financeiro Pessoal

Next.js 15 (App Router) · TypeScript estrito · Tailwind · Prisma · PostgreSQL · Auth.js v5 · Recharts · Vitest · Playwright.

> **Estado: Fase 1 (fundação) + parte da Fase 2.** Veja “Limitações” no fim. Nada aqui foi executado ainda
> (o ambiente de geração não tinha acesso à internet para `npm install`). Rode os comandos abaixo e corrija o que aparecer.

## Como iniciar

```bash
npm install
cp .env.example .env          # preencha as variáveis
npx prisma migrate dev --name init
npm run db:seed               # opcional, SOMENTE desenvolvimento (dev@exemplo.local / Dev@12345)
npm run dev                   # http://localhost:3000
npm test                      # testes unitários do domínio financeiro
npm run test:e2e              # Playwright (app + banco rodando; rode `npx playwright install` antes)
```

## Variáveis de ambiente

| Variável                                 | Como obter                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`, `DIRECT_URL`             | Crie um projeto no Supabase/Neon e copie as strings de conexão (a direta é usada nas migrações).                   |
| `AUTH_SECRET`                            | `npx auth secret` ou `openssl rand -base64 32`                                                                     |
| `NEXT_PUBLIC_FIREBASE_*`                 | Firebase Console → Configurações do projeto → Seus apps → configuração do SDK Web.                                 |
| `RESEND_API_KEY`, `EMAIL_FROM`           | resend.com → API Keys; verifique seu domínio. (Ainda não usado: recuperação de senha é Fase 1 pendente.)           |
| `NEXT_PUBLIC_API_KEY`, `API_PRIVATE_KEY` | Chaves públicas e privadas para integrações de API; mantenha a pública em cliente e a privada somente no servidor. |

## Publicação na Vercel

1. Suba o repositório no GitHub e importe na Vercel.
2. Cadastre as variáveis acima. Defina `AUTH_URL` com a URL pública.
3. Aplique migrações em produção: `npx prisma migrate deploy` (nunca rode o seed em produção).
4. O script `build` já executa `prisma generate`.

## Regras financeiras (fonte única: `src/domain/finance`)

- **Duas visões separadas**: _competência_ (resultado) e _caixa_ (saldos).
- Receita conta quando **recebida** (`PAID`, pela data de recebimento). Despesa comum conta quando **paga**.
- **Compra no cartão** conta no resultado na data da compra e **não** mexe no saldo; **pagamento de fatura** (`isInvoicePayment`) mexe no saldo e **não** entra no resultado → sem dupla contagem.
- **Transferências** (duas linhas ligadas por `transferGroupId`) movem saldos individuais, mas não são receita/despesa e não alteram o consolidado.
- Valores em `Decimal(14,2)` no banco e `decimal.js` no código; arredondamento half-up em `money.ts`.
- Divisão por zero → indicador `null` (“Indisponível”). Meta com alvo ≤ 0 → inválida.
- Situação financeira (Controlada/Atenção/Crítica) usa limites explícitos em `financial-status.ts` e devolve os motivos.
- Saldo projetado é **estimativa**: saldo atual + receitas pendentes − contas pendentes até o fim do mês.

## Segurança implementada

Hash bcrypt (custo 12) · sessão JWT de 7 dias · isolamento por `userId` em todas as consultas · validação Zod no servidor ·
idempotência por `idempotencyKey` · pagamento atômico (`updateMany` condicionado a `PENDING`) · trilha de auditoria ·
cabeçalhos de segurança · ID tokens Firebase verificados no servidor · erros sem stack trace.

## Login Firebase

No Firebase Console, ative o provedor **Google** em **Authentication → Sign-in method**. Em **Authentication → Settings → Authorized domains**, cadastre o domínio de produção e `localhost` para desenvolvimento. O servidor valida o ID token do Firebase e cria a sessão usada pelas APIs e pelos dados Prisma.

## API (implementada)

`GET/POST /api/transactions` · `PATCH /api/transactions/:id` (`{action:"pay"|"cancel"}`) · `GET /api/dashboard?periodo=mes-atual|mes-anterior|ano-atual` ·
`GET/POST /api/accounts` · `GET /api/categories` · `POST /api/auth/register`.

## Limitações conhecidas / pendências

- **Não testado/executado ainda.** Pode haver erros de tipo/compilação a ajustar no primeiro `npm run typecheck`.
- Faltam: recuperação/redefinição de senha e e-mail (Resend), edição de transações, transferências (UI/serviço), contas a pagar, recorrências, cartões e faturas (só o schema existe), orçamentos, metas, investimentos, assistente, relatórios/exportação, importação da planilha `Controle-2026(2).xlsx` (a planilha não foi fornecida), notificações, PWA offline/service worker e ícones PNG (gere `icon-192.png`/`icon-512.png` de `public/icons/icon.svg`).
- shadcn/ui, TanStack Table não foram instalados; a UI usa Tailwind puro por ora.
- Rate limit em memória (insuficiente em serverless; usar Redis/DB em produção).
- Dashboard carrega todas as transações do usuário para calcular; trocar por agregações SQL quando o volume crescer.
- Testes de integração (concorrência, isolamento) descritos em `src/tests/integration/README.md`, ainda não escritos.
