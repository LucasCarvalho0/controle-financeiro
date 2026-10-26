import { Prisma } from "@prisma/client";

export const dueReminderTypes = {
  fiveDays: "DUE_IN_5_DAYS",
  tomorrow: "DUE_TOMORROW",
  today: "DUE_TODAY",
  overdue: "OVERDUE",
} as const;

export type DueReminderType =
  (typeof dueReminderTypes)[keyof typeof dueReminderTypes];

export type DueTransaction = {
  id: string;
  userId: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  status: "PENDING" | "PAID" | "CANCELLED";
  description: string;
  amount: { toString(): string } | string | number;
  dueDate: Date | null;
  deletedAt: Date | null;
  user: { timezone: string; currency: string };
};

export type DueNotificationInput = {
  userId: string;
  type: DueReminderType;
  title: string;
  message: string;
  dedupeKey: string;
  scheduledFor: null;
};

export type DueReminderResult = {
  checked: number;
  created: number;
  duplicates: number;
  errors: number;
};

type DueReminderStore = {
  findBatch(
    cursorId: string | undefined,
    limit: number,
  ): Promise<DueTransaction[]>;
  createNotification(input: DueNotificationInput): Promise<unknown>;
};

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
const DEFAULT_CURRENCY = "BRL";
const DAY_MS = 86_400_000;

function validTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export function localCalendarDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    timeZone: validTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function storedCalendarDate(date: Date): string {
  return [
    date.getUTCFullYear().toString().padStart(4, "0"),
    (date.getUTCMonth() + 1).toString().padStart(2, "0"),
    date.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
}

export function calendarDayDifference(from: string, to: string): number {
  const toUtcDay = (value: string) => {
    const parts = value.split("-").map(Number);
    const year = parts[0] ?? Number.NaN;
    const month = parts[1] ?? Number.NaN;
    const day = parts[2] ?? Number.NaN;
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      throw new RangeError("Invalid calendar date");
    }
    return Date.UTC(year, month - 1, day);
  };
  return (toUtcDay(to) - toUtcDay(from)) / DAY_MS;
}

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

function formatAmount(amount: DueTransaction["amount"], currency: string) {
  const value = Number(amount.toString());
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || DEFAULT_CURRENCY,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: DEFAULT_CURRENCY,
    }).format(value);
  }
}

export function classifyDueReminder(
  transaction: DueTransaction,
  now: Date,
): DueReminderType | null {
  if (
    transaction.type !== "EXPENSE" ||
    transaction.status !== "PENDING" ||
    transaction.deletedAt !== null ||
    !transaction.dueDate ||
    Number.isNaN(transaction.dueDate.getTime())
  ) {
    return null;
  }

  const today = localCalendarDate(now, transaction.user.timezone);
  const dueDate = storedCalendarDate(transaction.dueDate);
  const daysUntilDue = calendarDayDifference(today, dueDate);

  if (daysUntilDue === 5) return dueReminderTypes.fiveDays;
  if (daysUntilDue === 1) return dueReminderTypes.tomorrow;
  if (daysUntilDue === 0) return dueReminderTypes.today;
  if (daysUntilDue < 0) return dueReminderTypes.overdue;
  return null;
}

export function buildDueNotification(
  transaction: DueTransaction,
  type: DueReminderType,
): DueNotificationInput {
  const dueDate = storedCalendarDate(transaction.dueDate!);
  const dueDateLabel = formatDate(dueDate);
  const amount = formatAmount(transaction.amount, transaction.user.currency);
  const content: Record<DueReminderType, { title: string; message: string }> = {
    DUE_IN_5_DAYS: {
      title: "Conta vencendo em 5 dias",
      message: `A conta ${transaction.description}, no valor de ${amount}, vence em cinco dias, no dia ${dueDateLabel}.`,
    },
    DUE_TOMORROW: {
      title: "Conta vence amanhã",
      message: `A conta ${transaction.description}, no valor de ${amount}, vence amanhã, dia ${dueDateLabel}.`,
    },
    DUE_TODAY: {
      title: "Conta vence hoje",
      message: `A conta ${transaction.description}, no valor de ${amount}, vence hoje. Confira seu planejamento financeiro.`,
    },
    OVERDUE: {
      title: "Conta em atraso",
      message: `A conta ${transaction.description}, no valor de ${amount}, venceu em ${dueDateLabel} e ainda está pendente.`,
    },
  };

  return {
    userId: transaction.userId,
    type,
    ...content[type],
    dedupeKey: `transaction:${transaction.id}:${type}:${dueDate}`,
    scheduledFor: null,
  };
}

function isUniqueConstraintError(error: unknown) {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }
  const target = error.meta?.target;
  return (
    (Array.isArray(target) &&
      target.includes("userId") &&
      target.includes("dedupeKey")) ||
    (typeof target === "string" &&
      target.includes("Notification_userId_dedupeKey_key"))
  );
}

function safeErrorCode(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code
    : "UNEXPECTED";
}

export async function runDueReminderJob(
  store: DueReminderStore,
  now = new Date(),
  batchSize = 100,
): Promise<DueReminderResult> {
  const result: DueReminderResult = {
    checked: 0,
    created: 0,
    duplicates: 0,
    errors: 0,
  };
  let cursorId: string | undefined;

  while (true) {
    let batch: DueTransaction[];
    try {
      batch = await store.findBatch(cursorId, batchSize);
    } catch (error) {
      result.errors += 1;
      console.error("[notifications cron] batch query failed", {
        code: safeErrorCode(error),
      });
      break;
    }
    if (batch.length === 0) break;

    for (const transaction of batch) {
      result.checked += 1;
      const reminderType = classifyDueReminder(transaction, now);
      if (!reminderType) continue;

      try {
        await store.createNotification(
          buildDueNotification(transaction, reminderType),
        );
        result.created += 1;
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          result.duplicates += 1;
          continue;
        }
        result.errors += 1;
        console.error("[notifications cron] notification create failed", {
          transactionId: transaction.id,
          code: safeErrorCode(error),
        });
      }
    }

    const lastId = batch[batch.length - 1]?.id;
    if (!lastId || lastId === cursorId) {
      result.errors += 1;
      console.error("[notifications cron] batch cursor did not advance");
      break;
    }
    cursorId = lastId;
    if (batch.length < batchSize) break;
  }

  return result;
}
