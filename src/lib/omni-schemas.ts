import { z } from "zod";
export const providers = [
  "telegram",
  "whatsapp",
  "viber",
  "instagram",
] as const;
export const channelSchema = z.enum(["website", ...providers]);
export type Provider = (typeof providers)[number];
export const connectionSchema = z
  .object({
    provider: z.enum(providers),
    label: z.string().trim().min(2).max(80),
    accessToken: z.string().min(10).max(4000),
    appSecret: z.string().max(300).default(""),
    accountId: z
      .string()
      .regex(/^[0-9]*$/)
      .max(60)
      .default(""),
    telegramMode: z.enum(["bot", "business"]).default("bot"),
    businessUserId: z
      .string()
      .regex(/^[0-9]*$/)
      .max(25)
      .default(""),
  })
  .strict()
  .superRefine((v, c) => {
    if (["whatsapp", "instagram"].includes(v.provider) && !v.accountId)
      c.addIssue({
        code: "custom",
        message: "accountId required",
      });
    if (
      v.provider === "telegram" &&
      (!/^\d+:[\w-]+$/.test(v.accessToken) ||
        (v.telegramMode === "business" && !v.businessUserId))
    )
      c.addIssue({
        code: "custom",
        message: "Invalid Telegram bot/business credentials",
      });
  });
export const outcomeSchema = z
  .object({
    version: z.number().int().positive(),
    stage: z.enum(["new", "qualified", "won", "lost"]),
    value: z.number().min(0).max(9999999999.99).multipleOf(0.01),
    grossProfit: z
      .number()
      .min(-9999999999.99)
      .max(9999999999.99)
      .multipleOf(0.01)
      .nullable(),
    currency: z.enum(["UAH", "USD", "EUR", "PLN"]),
    nextStep: z.string().trim().max(1000),
    assignedTo: z.uuid().nullable(),
  })
  .strict();
export const costSchema = z
  .object({
    channel: channelSchema,
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/),
    currency: z.enum(["UAH", "USD", "EUR", "PLN"]),
    amount: z.number().min(0).max(9999999999.99).multipleOf(0.01),
    version: z.number().int().min(0),
  })
  .strict();
export const inviteSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    role: z.enum(["admin", "agent"]),
  })
  .strict();
export type Connection = {
  id: string;
  provider: Provider;
  label: string;
  accountId: string | null;
  enabled: boolean;
  verifiedAt: string | null;
  lastWebhookAt: string | null;
  lastError: string | null;
  version: number;
  webhookUrl: string;
  verifyToken?: string;
  settings: { telegramMode?: string; businessUserId?: string };
};
export type ChannelReport = {
  channel: string;
  conversations: number;
  qualified: number;
  won: number;
  lost: number;
  currency: string;
  revenue: number;
  grossProfit: number;
  profitRecorded: number;
  cost: number;
  conversion: number;
};
export type Outcome = {
  attribution?: Record<string, string>;
  channel: string;
  leadStage: "new" | "qualified" | "won" | "lost";
  dealValue: number;
  grossProfit: number | null;
  dealCurrency: "UAH" | "USD" | "EUR" | "PLN";
  nextStep: string;
  assignedTo: string | null;
  version: number;
  notes: Array<{
    id: string;
    content: string;
    name: string;
    createdAt: string;
  }>;
  deliveries: Array<{
    id: string;
    status: string;
    lastError: string | null;
    content: string;
  }>;
};
