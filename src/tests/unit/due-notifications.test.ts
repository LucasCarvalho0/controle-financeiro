import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  buildDueNotification,
  calendarDayDifference,
  classifyDueReminder,
  dueReminderTypes,
  localCalendarDate,
  runDueReminderJob,
  type DueTransaction,
} from "@/server/services/due-notifications";

const now = new Date("2026-10-25T15:00:00.000Z");

function transaction(overrides: Partial<DueTransaction> = {}): DueTransaction {
  return {
    id: "tx-1",
    userId: "user-1",
    type: "EXPENSE",
    status: "PENDING",
    description: "Internet",
    amount: "123.45",
    dueDate: new Date("2026-10-30T12:00:00.000Z"),
    deletedAt: null,
    user: { timezone: "America/Sao_Paulo", currency: "BRL" },
    ...overrides,
  };
}

function uniqueError() {
  return new Prisma.PrismaClientKnownRequestError("duplicate", {
    code: "P2002",
    clientVersion: "test",
    meta: { target: ["userId", "dedupeKey"] },
  });
}

describe("classificação de lembretes por data local", () => {
  it("classifica vencimento em cinco dias", () => {
    expect(classifyDueReminder(transaction(), now)).toBe(
      dueReminderTypes.fiveDays,
    );
  });

  it("classifica vencimento amanhã", () => {
    expect(
      classifyDueReminder(
        transaction({ dueDate: new Date("2026-10-26T12:00:00.000Z") }),
        now,
      ),
    ).toBe(dueReminderTypes.tomorrow);
  });

  it("classifica vencimento hoje", () => {
    expect(
      classifyDueReminder(
        transaction({ dueDate: new Date("2026-10-25T12:00:00.000Z") }),
        now,
      ),
    ).toBe(dueReminderTypes.today);
  });

  it("classifica vencimento passado como atraso único", () => {
    expect(
      classifyDueReminder(
        transaction({ dueDate: new Date("2026-10-24T12:00:00.000Z") }),
        now,
      ),
    ).toBe(dueReminderTypes.overdue);
  });

  it.each([
    ["paga", { status: "PAID" as const }],
    ["cancelada", { status: "CANCELLED" as const }],
    ["excluída", { deletedAt: new Date() }],
    ["sem vencimento", { dueDate: null }],
    ["receita", { type: "INCOME" as const }],
    ["transferência", { type: "TRANSFER" as const }],
  ])("não cria lembrete para uma conta %s", (_label, overrides) => {
    expect(classifyDueReminder(transaction(overrides), now)).toBeNull();
  });

  it("respeita a data local perto da meia-noite e fusos diferentes", () => {
    const nearMidnight = new Date("2026-10-25T02:30:00.000Z");
    expect(localCalendarDate(nearMidnight, "America/Sao_Paulo")).toBe(
      "2026-10-24",
    );
    expect(localCalendarDate(nearMidnight, "Asia/Tokyo")).toBe("2026-10-25");
    expect(
      classifyDueReminder(
        transaction({ dueDate: new Date("2026-10-29T12:00:00.000Z") }),
        nearMidnight,
      ),
    ).toBe(dueReminderTypes.fiveDays);
  });

  it.each([
    ["mudança de mês", "2026-01-30", "2026-02-02", 3],
    ["mudança de ano", "2026-12-30", "2027-01-02", 3],
    ["ano bissexto", "2024-02-28", "2024-03-01", 2],
    ["fevereiro comum", "2025-02-28", "2025-03-01", 1],
  ])("calcula diferença com %s", (_label, from, to, expected) => {
    expect(calendarDayDifference(from, to)).toBe(expected);
  });

  it("formata moeda do usuário e inclui o vencimento na chave idempotente", () => {
    const notification = buildDueNotification(
      transaction(),
      dueReminderTypes.fiveDays,
    );
    expect(notification.message.replace(/\u00a0/g, " ")).toContain("R$ 123,45");
    expect(notification.message).toContain("30/10/2026");
    expect(notification.dedupeKey).toBe(
      "transaction:tx-1:DUE_IN_5_DAYS:2026-10-30",
    );
  });
});

describe("processamento idempotente e paginado", () => {
  it("trata P2002 como duplicata quando a rotina é executada novamente", async () => {
    const createdKeys = new Set<string>();
    const store = {
      findBatch: vi.fn(async (cursorId?: string) =>
        cursorId ? [] : [transaction()],
      ),
      createNotification: vi.fn(
        async ({ dedupeKey }: { dedupeKey: string }) => {
          if (createdKeys.has(dedupeKey)) throw uniqueError();
          createdKeys.add(dedupeKey);
        },
      ),
    };

    const first = await runDueReminderJob(store, now);
    const second = await runDueReminderJob(store, now);
    expect(first.created).toBe(1);
    expect(second.duplicates).toBe(1);
  });

  it("continua após erro individual e não o confunde com duplicata", async () => {
    const error = new Error("database unavailable");
    const store = {
      findBatch: vi
        .fn()
        .mockResolvedValueOnce([
          transaction({ id: "tx-error" }),
          transaction({ id: "tx-ok" }),
        ])
        .mockResolvedValueOnce([]),
      createNotification: vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(undefined),
    };
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await runDueReminderJob(store, now, 2);
    expect(result).toMatchObject({
      checked: 2,
      created: 1,
      duplicates: 0,
      errors: 1,
    });
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });

  it("não trata outro P2002 como duplicata de notificação", async () => {
    const otherUniqueError = new Prisma.PrismaClientKnownRequestError(
      "duplicate on another index",
      {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["anotherField"] },
      },
    );
    const store = {
      findBatch: vi
        .fn()
        .mockResolvedValueOnce([transaction()])
        .mockResolvedValueOnce([]),
      createNotification: vi.fn().mockRejectedValue(otherUniqueError),
    };
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await runDueReminderJob(store, now);
    expect(result).toMatchObject({ duplicates: 0, errors: 1 });
    log.mockRestore();
  });

  it("usa cursor para avançar em lotes", async () => {
    const store = {
      findBatch: vi
        .fn()
        .mockResolvedValueOnce([transaction({ id: "tx-1" })])
        .mockResolvedValueOnce([]),
      createNotification: vi.fn().mockResolvedValue(undefined),
    };

    await runDueReminderJob(store, now, 1);
    expect(store.findBatch).toHaveBeenNthCalledWith(1, undefined, 1);
    expect(store.findBatch).toHaveBeenNthCalledWith(2, "tx-1", 1);
  });
});
