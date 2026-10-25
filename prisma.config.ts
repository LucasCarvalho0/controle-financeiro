import path from "node:path";
import { loadEnvFile } from "node:process";
import { defineConfig } from "prisma/config";

// Quando prisma.config.ts está presente, o Prisma não carrega .env automaticamente.
// Carregamos manualmente para que DATABASE_URL e DIRECT_URL fiquem disponíveis.
try {
  loadEnvFile(path.resolve(".env"));
} catch {
  // .env pode não existir em CI/CD (variáveis já injetadas)
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
});
