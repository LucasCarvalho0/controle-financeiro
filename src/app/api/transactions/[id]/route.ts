import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { cancelTransaction, getTransaction, markPaid, markPending, updateTransaction } from "@/server/services/transactions";
import { updateTransactionSchema } from "@/server/validators/transaction";

const actionSchema = z.object({
  action: z.enum(["pay", "cancel", "unpay"]),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    return NextResponse.json(await getTransaction(userId, id));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const json = await req.json();

    // Se for ação rápida de status (pay, cancel, unpay)
    const actionResult = actionSchema.safeParse(json);
    if (actionResult.success) {
      const { action, paidAt } = actionResult.data;
      if (action === "pay") return NextResponse.json(await markPaid(userId, id, paidAt));
      if (action === "unpay") return NextResponse.json(await markPending(userId, id));
      return NextResponse.json(await cancelTransaction(userId, id));
    }

    // Se for atualização de campos (edição completa ou parcial)
    const updateInput = updateTransactionSchema.parse(json);
    return NextResponse.json(await updateTransaction(userId, id, updateInput));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const json = await req.json();
    const updateInput = updateTransactionSchema.parse(json);
    return NextResponse.json(await updateTransaction(userId, id, updateInput));
  } catch (e) {
    return errorResponse(e);
  }
}
