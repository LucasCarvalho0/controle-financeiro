import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountBalance } from "@/domain/finance/calculations";
import { formatBRL } from "@/lib/currency";
import { AccountForm } from "@/components/finance/account-form";

export default async function ContasPage() {
  const userId = (await auth())!.user.id;
  const [accounts, txs] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.transaction.findMany({ where: { userId, deletedAt: null } }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Contas</h1>
      <AccountForm />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.length === 0 && <li className="text-sm text-slate-500">Nenhuma conta cadastrada.</li>}
        {accounts.map((a) => (
          <li key={a.id} className="card">
            <p className="font-medium">{a.name}</p>
            <p className="text-xs text-slate-500">Saldo inicial: {formatBRL(a.initialBalance.toString())}</p>
            <p className="mt-2 text-xl font-semibold">{formatBRL(accountBalance(a.initialBalance, a.id, txs, a.balanceDate).toFixed(2))}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
