import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountBalance } from "@/domain/finance/calculations";
import { formatBRL } from "@/lib/currency";
import { AccountForm } from "@/components/finance/account-form";

export default async function ContasPage() {
  const userId = (await auth())!.user.id;
  const [accounts, txs] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.findMany({ where: { userId, deletedAt: null } }),
  ]);
  const accountSummaries = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    initialBalance: account.initialBalance.toString(),
    balance: formatBRL(
      accountBalance(
        account.initialBalance,
        account.id,
        txs,
        account.balanceDate,
      ).toFixed(2),
    ),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Contas</h1>
      <AccountForm accounts={accountSummaries} />
    </div>
  );
}
