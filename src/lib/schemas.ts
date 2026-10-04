import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(12).max(128);
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  companyName: z.string().trim().min(2).max(160),
  email: emailSchema, password: passwordSchema,
}).strict();
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).strict();
export const aiSettingsSchema = z.object({
  systemPrompt: z.string().max(6000),
  tone: z.enum(['friendly', 'formal', 'concise', 'consultative']),
  offHoursMessage: z.string().max(1000),
}).strict();
export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(160),
  industry: z.string().trim().max(200),
  timezone: z.string().max(80).refine(value => {
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
  }),
  currency: z.enum(['UAH', 'USD', 'EUR', 'PLN']),
  aiSettings: aiSettingsSchema,
  version: z.number().int().positive(),
}).strict();
export const knowledgeSchema = z.object({
  kind: z.enum(['service', 'product', 'rule']),
  title: z.string().trim().min(2).max(200),
  content: z.string().trim().min(1).max(12000),
  price: z.number().finite().min(0).max(9999999999.99).multipleOf(0.01).nullable(),
  currency: z.enum(['UAH', 'USD', 'EUR', 'PLN']),
  durationMinutes: z.number().int().min(1).max(10080).nullable(),
  sku: z.string().trim().max(100),
}).strict();
export const knowledgeUpdateSchema = knowledgeSchema.extend({ version: z.number().int().positive() });
export const leadSchema = z.object({
  name: z.string().trim().min(2).max(100), email: emailSchema,
  phone: z.string().trim().min(3).max(100),
  businessType: z.string().trim().max(200), plan: z.enum(['start', 'pro', 'enterprise']),
  locale: z.enum(['uk', 'ru', 'en']), consent: z.literal(true),
  website: z.string().max(200).optional(),
}).strict();
export type KnowledgeInput = z.infer<typeof knowledgeSchema>;
export type KnowledgeEntry = KnowledgeInput & { id: string; version: number; updatedAt: string };
export type OrganizationSettings = z.infer<typeof settingsSchema>;
export type Workspace = {
  user: { id: string; name: string; email: string; role: 'owner' | 'admin' | 'agent' };
  organization: OrganizationSettings;
  entries: KnowledgeEntry[];
  team: Array<{ id: string; name: string; email: string; role: string }>;
};
