import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(message: string, public status = 400, public code = "BAD_REQUEST") { super(message); }
}
export const unauthorized = () => new AppError("Não autenticado.", 401, "UNAUTHORIZED");
export const notFound = (what = "Registro") => new AppError(`${what} não encontrado.`, 404, "NOT_FOUND");

/** Resposta de erro consistente, sem stack trace nem detalhes internos. */
export function errorResponse(e: unknown) {
  if (e instanceof AppError) return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  if (e instanceof ZodError) return NextResponse.json({ error: { code: "VALIDATION", message: "Dados inválidos.", issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } }, { status: 422 });
  console.error("[erro interno]", e instanceof Error ? e.message : "desconhecido");
  return NextResponse.json({ error: { code: "INTERNAL", message: "Erro interno." } }, { status: 500 });
}
