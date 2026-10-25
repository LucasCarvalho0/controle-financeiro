"use client";

import type { User } from "firebase/auth";
import { signIn } from "next-auth/react";

export async function establishAppSession(user: User) {
  const idToken = await user.getIdToken();
  const result = await signIn("firebase", { idToken, redirect: false });
  if (result?.error)
    throw new Error("Não foi possível criar a sessão do aplicativo.");
  window.location.assign("/dashboard");
}
