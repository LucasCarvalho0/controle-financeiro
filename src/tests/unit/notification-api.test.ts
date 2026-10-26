import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserIdMock, prismaMock } = vi.hoisted(() => ({
  requireUserIdMock: vi.fn(),
  prismaMock: {
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    transaction: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/session", () => ({ requireUserId: requireUserIdMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET as getNotifications } from "@/app/api/notifications/route";
import { GET as getUnreadCount } from "@/app/api/notifications/unread-count/route";
import { PATCH as markRead } from "@/app/api/notifications/[id]/read/route";
import { PATCH as markAllRead } from "@/app/api/notifications/read-all/route";
import { GET as runCron } from "@/app/api/cron/notifications/route";

const originalCronSecret = process.env.CRON_SECRET;
const validCronSecret = "test-cron-secret-0123456789abcdef";

beforeEach(() => {
  vi.clearAllMocks();
  requireUserIdMock.mockResolvedValue("user-current");
  prismaMock.notification.findMany.mockResolvedValue([]);
  prismaMock.notification.findFirst.mockResolvedValue(null);
  prismaMock.notification.count.mockResolvedValue(0);
  prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.transaction.findMany.mockResolvedValue([]);
});

afterEach(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;
});

describe("API de notificações", () => {
  it("lista somente para o usuário autenticado, mesmo se userId vier na URL", async () => {
    const response = await getNotifications(
      new Request("https://example.test/api/notifications?userId=other&page=2"),
    );
    expect(response.status).toBe(200);
    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-current" },
        skip: 20,
        take: 20,
      }),
    );
  });

  it("não revela uma notificação pertencente a outro usuário", async () => {
    const response = await markRead(new Request("https://example.test"), {
      params: Promise.resolve({ id: "notification-other" }),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Notificação não encontrada." },
    });
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "notification-other",
          userId: "user-current",
          readAt: null,
        },
      }),
    );
  });

  it("marca a notificação própria como lida e reduz o contador", async () => {
    let read = false;
    prismaMock.notification.count.mockImplementation(async () =>
      read ? 0 : 1,
    );
    prismaMock.notification.updateMany.mockImplementation(async () => {
      read = true;
      return { count: 1 };
    });

    const before = await getUnreadCount();
    expect(await before.json()).toEqual({ count: 1 });

    const updated = await markRead(new Request("https://example.test"), {
      params: Promise.resolve({ id: "notification-own" }),
    });
    expect(updated.status).toBe(200);

    const after = await getUnreadCount();
    expect(await after.json()).toEqual({ count: 0 });
  });

  it("marca todas as notificações não lidas do usuário atual", async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 3 });
    const response = await markAllRead();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, updated: 3 });
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-current", readAt: null },
      }),
    );
  });
});

describe("autorização do cron", () => {
  it("rejeita chamadas sem segredo configurado", async () => {
    delete process.env.CRON_SECRET;
    const response = await runCron(new Request("https://example.test"));
    expect(response.status).toBe(503);
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled();
  });

  it("rejeita segredo configurado menor que 32 caracteres", async () => {
    process.env.CRON_SECRET = "short-secret";
    const response = await runCron(
      new Request("https://example.test", {
        headers: { authorization: "Bearer short-secret" },
      }),
    );
    expect(response.status).toBe(503);
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled();
  });

  it("rejeita token Bearer incorreto", async () => {
    process.env.CRON_SECRET = validCronSecret;
    const response = await runCron(
      new Request("https://example.test", {
        headers: { authorization: `Bearer ${"x".repeat(32)}` },
      }),
    );
    expect(response.status).toBe(401);
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled();
  });

  it("processa apenas quando o segredo Bearer é válido", async () => {
    process.env.CRON_SECRET = validCronSecret;
    const response = await runCron(
      new Request("https://example.test", {
        headers: { authorization: `Bearer ${validCronSecret}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      partial: false,
      checked: 0,
      created: 0,
      duplicates: 0,
      errors: 0,
    });
    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: "EXPENSE",
          status: "PENDING",
          dueDate: { not: null },
          deletedAt: null,
        }),
        take: 100,
      }),
    );
  });
});
