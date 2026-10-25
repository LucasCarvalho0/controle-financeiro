import { expect, test } from "@playwright/test";

// Requer app + banco rodando. Executa: cadastro -> conta -> receita -> dashboard.
test("cadastro, conta, receita e dashboard", async ({ page }) => {
  const email = `e2e-${Date.now()}@teste.local`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Teste E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/Senha/).fill("Senha@12345");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/contas");
  await page.getByLabel("Nome").fill("Conta E2E");
  await page.getByLabel(/Saldo inicial/).fill("1.000,00");
  await page.getByRole("button", { name: "Adicionar conta" }).click();
  await expect(page.getByText("Conta E2E")).toBeVisible();

  await page.goto("/receitas");
  await page.getByLabel("Descrição").fill("Salário teste");
  await page.getByLabel("Valor (R$)").fill("2.500,00");
  await page.getByLabel("Conta").selectOption({ label: "Conta E2E" });
  await page.getByLabel("Situação").first().selectOption("PAID");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText("Salário teste")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText("R$ 3.500,00").first()).toBeVisible();
});
