import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// Configuração do Firebase com variáveis de ambiente e fallback
export const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBWm18OkjwGZ7rJP0I99lJzSfx1HMwiM2c",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "controle-financeiro-52cf1.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "controle-financeiro-52cf1",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "controle-financeiro-52cf1.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "771627730020",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:771627730020:web:813c46dc2d02de764d4b71",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-4QKNW31BBB",
};

// Inicializa o Firebase apenas uma vez (evita múltiplas instâncias no Next.js)
export const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Analytics só funciona no ambiente do navegador (cliente)
let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { analytics };
