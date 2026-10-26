# Controle Financeiro Pessoal

Next.js 15 (App Router) · TypeScript estrito · Tailwind · Prisma · PostgreSQL · Auth.js v5 · Recharts · Vitest · Playwright.

> **Estado: fundação + funcionalidades financeiras e notificações internas.** Veja “Limitações” no fim para os itens ainda pendentes.

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

| Variável                                 | Como obter                                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`, `DIRECT_URL`             | Crie um projeto no Supabase/Neon e copie as strings de conexão (a direta é usada nas migrações).                                      |
| `AUTH_SECRET`                            | `npx auth secret` ou `openssl rand -base64 32`                                                                                        |
| `CRON_SECRET`                            | Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`; configure no `.env` e na Vercel como Production. |
| `NEXT_PUBLIC_FIREBASE_*`                 | Firebase Console → Configurações do projeto → Seus apps → configuração do SDK Web.                                                    |
| `RESEND_API_KEY`, `EMAIL_FROM`           | resend.com → API Keys; verifique seu domínio. (Ainda não usado: recuperação de senha é Fase 1 pendente.)                              |
| `NEXT_PUBLIC_API_KEY`, `API_PRIVATE_KEY` | Chaves públicas e privadas para integrações de API; mantenha a pública em cliente e a privada somente no servidor.                    |

## Publicação na Vercel

1. Suba o repositório no GitHub e importe na Vercel.
2. Cadastre as variáveis acima. Defina `AUTH_URL` com a URL pública.
3. Aplique migrações em produção: `npx prisma migrate deploy` (nunca rode o seed em produção).
4. O script `build` já executa `prisma generate`.

## Notificações de vencimento

O cron diário em `vercel.json` chama `GET /api/cron/notifications` às 11:00 UTC (aproximadamente entre 08:00 e 08:59 em `America/Sao_Paulo`). O Hobby permite uma execução por dia e pode variar até 59 minutos; o Pro permite frequência maior. Cron é executado somente em Production.

Configure `CRON_SECRET` com pelo menos 32 caracteres no `.env` local e em **Vercel → Project → Settings → Environment Variables → Production**. Use o mesmo segredo em ambos os ambientes e não o versiona. Gere-o com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Depois de alterar a variável ou `vercel.json`, faça um novo deploy de produção.

Para testar localmente, inicie o app e invoque a rota com o segredo:

```bash
curl -i http://localhost:3000/api/cron/notifications \
	-H "Authorization: Bearer $CRON_SECRET"
```

No PowerShell, use:

```powershell
$headers = @{ Authorization = "Bearer $env:CRON_SECRET" }
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/cron/notifications" -Headers $headers
```

A execução retorna `checked`, `created`, `duplicates` e `errors`; se houver falhas, responde `207` e indica `success: false`. Para confirmar o agendamento após o deploy, abra **Vercel → Project → Settings → Cron Jobs** e use **View Logs**. A Vercel não repete automaticamente uma invocação que falhou.

As chaves de deduplicação incluem a data do vencimento (`transaction:{id}:{type}:{dueDate}`). Alterar o vencimento gera chaves novas sem apagar notificações anteriores; voltar para uma data já notificada não duplica aquele lembrete. O cron cria somente notificações internas; email e push não fazem parte desta fase.

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
cabeçalhos de segurança · erros sem stack trace.

## API (implementada)

`GET/POST /api/transactions` · `PATCH /api/transactions/:id` (`{action:"pay"|"cancel"}`) · `GET /api/dashboard?periodo=mes-atual|mes-anterior|ano-atual` ·
`GET/POST /api/accounts` · `GET /api/categories` · `POST /api/auth/register` · `GET /api/notifications` · `GET /api/notifications/unread-count` · `PATCH /api/notifications/:id/read` · `PATCH /api/notifications/read-all` · `GET /api/cron/notifications`.

## Limitações conhecidas / pendências

- Faltam: recuperação/redefinição de senha e e-mail (Resend), transferências (UI/serviço), recorrências, cartões e faturas (só o schema existe), orçamentos, metas, investimentos, assistente, relatórios/exportação, importação da planilha `Controle-2026(2).xlsx` (a planilha não foi fornecida), envio de notificações por email/push, PWA offline/service worker e ícones PNG (gere `icon-192.png`/`icon-512.png` de `public/icons/icon.svg`).
- shadcn/ui, TanStack Table não foram instalados; a UI usa Tailwind puro por ora.
- Rate limit em memória (insuficiente em serverless; usar Redis/DB em produção).
- Dashboard carrega todas as transações do usuário para calcular; trocar por agregações SQL quando o volume crescer.
- Testes de integração (concorrência, isolamento) descritos em `src/tests/integration/README.md`, ainda não escritos.
