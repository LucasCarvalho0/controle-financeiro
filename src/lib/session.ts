import { auth } from "./auth";
import { unauthorized } from "./errors";

/** Retorna o id do usuário autenticado ou lança 401. Toda rota protegida deve usar isto. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw unauthorized();
  return session.user.id;
}
