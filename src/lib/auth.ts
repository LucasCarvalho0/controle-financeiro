import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { prisma } from "./prisma";
import { rateLimit } from "./rate-limit";
import { ensureDefaultCategories } from "@/server/services/default-categories";

const firebaseProjectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "controle-financeiro-52cf1";
const firebaseSigningKeys = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((e) => e.toLowerCase()),
  password: z.string().min(1, "Informe a senha"),
});
const firebaseTokenSchema = z.object({ idToken: z.string().min(1) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email;
        if (!rateLimit(`login:${email}`, 25, 15 * 60_000)) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        return ok
          ? {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
            }
          : null;
      },
    }),
    Credentials({
      id: "firebase",
      name: "Firebase",
      credentials: { idToken: {} },
      async authorize(raw) {
        const parsed = firebaseTokenSchema.safeParse(raw);
        if (!parsed.success) return null;

        let email: string | undefined;
        let name: string | null = null;
        let image: string | null = null;
        try {
          const { payload } = await jwtVerify(
            parsed.data.idToken,
            firebaseSigningKeys,
            {
              issuer: `https://securetoken.google.com/${firebaseProjectId}`,
              audience: firebaseProjectId,
            },
          );
          email =
            typeof payload.email === "string"
              ? payload.email.trim().toLowerCase()
              : undefined;
          if (payload.email_verified !== true) return null;
          name = typeof payload.name === "string" ? payload.name : null;
          image = typeof payload.picture === "string" ? payload.picture : null;
        } catch {
          return null;
        }

        if (!email) return null;
        if (!rateLimit(`firebase-login:${email}`, 25, 15 * 60_000)) return null;

        const user = await prisma.user.upsert({
          where: { email },
          create: {
            email,
            name,
            image,
          },
          update: {},
        });

        await ensureDefaultCategories(user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  events: {
    // Usuários criados via provedores OAuth recebem as categorias padrão.
    async createUser({ user }) {
      if (user.id) await ensureDefaultCategories(user.id);
    },
  },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = (user as { image?: string | null }).image;
      }
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.image) token.picture = session.image;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.name) session.user.name = token.name;
      if (token.picture) session.user.image = token.picture as string;
      return session;
    },
  },
});
