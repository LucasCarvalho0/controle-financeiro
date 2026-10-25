import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  NEXT_PUBLIC_API_KEY: z.string().optional(),
  API_PRIVATE_KEY: z.string().optional(),
});

/** Valida as variáveis de ambiente do servidor sob demanda (não no build). */
export function getEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success)
    throw new Error(
      "Variáveis de ambiente inválidas: " +
        parsed.error.issues.map((i) => i.path.join(".")).join(", "),
    );
  return parsed.data;
}
