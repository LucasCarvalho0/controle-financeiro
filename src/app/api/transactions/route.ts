import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { createTransactionSchema, listTransactionsSchema } from "@/server/validators/transaction";
import { createTransaction, listTransactions } from "@/server/services/transactions";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const query = listTransactionsSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    return NextResponse.json(await listTransactions(userId, query));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = createTransactionSchema.parse(await req.json());
    return NextResponse.json(await createTransaction(userId, input), { status: 201 });
  } catch (e) { return errorResponse(e); }
}
