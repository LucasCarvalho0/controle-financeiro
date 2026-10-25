import { initializeApp, getApps, getApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;
let adminStorage: Storage | null = null;

function cleanPrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  let cleaned = key.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  if (cleaned.includes("\\n")) {
    cleaned = cleaned.replace(/\\n/g, "\n");
  }
  return cleaned;
}

function initFirebaseAdmin(): App | null {
  try {
    if (getApps().length > 0) {
      return getApp();
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "controle-financeiro-52cf1";
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "controle-financeiro-52cf1.firebasestorage.app";

    // Prioridade 1: variáveis de ambiente (Vercel / produção)
    const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();

    if (privateKey && clientEmail) {
      try {
        return initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          storageBucket,
        });
      } catch (err) {
        console.warn("[Firebase Admin] Falha ao inicializar com credenciais:", err);
      }
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
      // Ambiente serverless não tem acesso ao arquivo — ignora silenciosamente
    }

    return initializeApp({ projectId });
  } catch (e) {
    console.warn("[Firebase Admin] Inicialização ignorada:", e);
    return null;
  }
}

try {
  adminApp = initFirebaseAdmin();
  if (adminApp) {
    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
    adminStorage = getStorage(adminApp);
  }
} catch (e) {
  console.warn("[Firebase Admin] Erro ao obter serviços:", e);
}

export { adminApp, adminAuth, adminDb, adminStorage };
