import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./prisma";
import { rateLimit } from "./rate-limit";
import { ensureDefaultCategories } from "@/server/services/default-categories";

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    // Sem allowDangerousEmailAccountLinking: Google com e-mail já cadastrado por senha NÃO é
    // associado automaticamente (evita sequestro de conta). O usuário deve entrar por senha.
    Google,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        if (!rateLimit(`login:${email}`)) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        return ok ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  ],
  events: {
    // Usuários criados via Google recebem as categorias padrão.
    async createUser({ user }) { if (user.id) await ensureDefaultCategories(user.id); },
  },
  callbacks: {
    jwt({ token, user }) { if (user?.id) token.sub = user.id; return token; },
    session({ session, token }) { if (token.sub) session.user.id = token.sub; return session; },
  },
});
