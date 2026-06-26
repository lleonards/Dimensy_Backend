import { z } from 'zod';

export const companySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80),
  description: z.string().max(1000).optional().default(''),
  city: z.string().max(120).optional().default(''),
  phone: z.string().max(30).optional().default(''),
  whatsapp: z.string().max(30).optional().default(''),
  email: z.string().email().or(z.literal('')).optional().default(''),
  business_hours: z.string().max(160).optional().default(''),
  response_time_hours: z.coerce.number().int().refine((value) => [2, 6, 12, 24].includes(value)),
  intro_message: z.string().max(500).optional().default(''),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  logo_path: z.string().max(255).optional().default(''),
  cover_path: z.string().max(255).optional().default(''),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(120),
  example_text: z.string().max(500).optional().default(''),
});

export const publicLeadSchema = z.object({
  customer_name: z.string().min(2).max(120),
  whatsapp: z.string().min(8).max(30),
  city: z.string().min(2).max(120),
  category_id: z.string().uuid(),
  summary: z.string().min(4).max(200),
  details: z.string().max(1000).optional().default(''),
  website: z.string().max(200).optional().default(''),
});

export const leadUpdateSchema = z.object({
  customer_name: z.string().min(2).max(120),
  whatsapp: z.string().min(8).max(30),
  city: z.string().min(2).max(120),
  category_name: z.string().min(2).max(120),
  summary: z.string().min(4).max(200),
  details: z.string().max(1000).optional().default(''),
});

export const leadStatusSchema = z.object({
  status: z.enum(['novo', 'em_atendimento', 'concluido', 'descartado']),
});

export const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    expirationTime: z.union([z.string(), z.number(), z.null()]).optional().nullable(),
    keys: z.object({
      p256dh: z.string().min(10),
      auth: z.string().min(10),
    }),
  }),
});
