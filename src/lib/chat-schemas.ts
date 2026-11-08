import { z } from "zod";
export const chatConfigSchema = z
  .object({
    enabled: z.boolean(),
    autoReply: z.boolean(),
    welcome: z.string().trim().max(500),
    dailyLimit: z.number().int().min(1).max(1000),
    version: z.number().int().positive(),
  })
  .strict();
export const startChatSchema = z
  .object({
    publicId: z.uuid(),
    name: z.string().trim().min(2).max(100),
    contact: z.string().trim().max(150),
    locale: z.enum(["ru", "uk", "en"]),
    consent: z.literal(true),
    website: z.string().max(200).optional(),
    attribution: z
      .object({
        utmSource: z.string().max(120).optional(),
        utmMedium: z.string().max(120).optional(),
        utmCampaign: z.string().max(120).optional(),
        referrer: z.string().max(500).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export const visitorMessageSchema = z
  .object({
    conversationId: z.uuid(),
    clientId: z.uuid(),
    text: z.string().trim().min(1).max(2000),
  })
  .strict();
export const conversationActionSchema = z
  .object({
    version: z.number().int().positive(),
    action: z.enum(["takeover", "resume", "close", "reopen"]),
  })
  .strict();
export const operatorReplySchema = z
  .object({ clientId: z.uuid(), text: z.string().trim().min(1).max(4000) })
  .strict();
export type ChatConfig = z.infer<typeof chatConfigSchema> & {
  publicId: string;
  appUrl: string;
  aiConfigured: boolean;
  companyName: string;
};
export type ChatMessage = {
  id: string;
  sender: "visitor" | "assistant" | "operator" | "system";
  content: string;
  sources: Array<{ id: string; title: string }>;
  createdAt: string;
};
export type Thread = {
  id: string;
  channel: "website" | "telegram" | "whatsapp" | "viber" | "instagram";
  assignedTo: string | null;
  leadStage: "new" | "qualified" | "won" | "lost";
  visitorName: string;
  visitorContact?: string;
  locale: "ru" | "uk" | "en";
  status: "open" | "closed";
  mode: "ai" | "human";
  version: number;
  busy: boolean;
  updatedAt: string;
  messages: ChatMessage[];
};
export type ThreadSummary = Omit<Thread, "messages"> & { lastMessage: string };
export type ChatStats = {
  enabledConnections: number;
  total: number;
  open: number;
  waiting: number;
  closed: number;
  messages: number;
  aiReplies: number;
  attemptsToday: number;
  inputTokens: number;
  outputTokens: number;
  dailyLimit: number;
  channelEnabled: boolean;
};
