import { initializeApp, getApps, getApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

let adminApp: App;

function initFirebaseAdmin(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "controle-financeiro-52cf1";
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "controle-financeiro-52cf1.firebasestorage.app";

  // Prioridade 1: variáveis de ambiente separadas (Vercel / produção)
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    // No Vercel a chave pode conter \n literal ou quebra de linha real — normaliza os dois
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.includes("\\n")
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : process.env.FIREBASE_PRIVATE_KEY;

    return initializeApp({
      credential: cert({ projectId, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey }),
      storageBucket,
    });
  }

  // Prioridade 2: arquivo JSON local (desenvolvimento)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const serviceAccountPath = path.resolve(
      process.cwd(),
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "./firebase-service-account.json"
    );
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
      return initializeApp({ credential: cert(serviceAccount), storageBucket });
    }
  } catch {
    // Ambiente serverless não tem acesso a fs — ignora silenciosamente
  }

  // Fallback mínimo (sem credenciais — funcionalidades admin ficam desabilitadas)
  return initializeApp({ projectId });
}

adminApp = initFirebaseAdmin();

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
export const adminStorage: Storage = getStorage(adminApp);
export { adminApp };
