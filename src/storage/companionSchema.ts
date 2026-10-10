import { z } from 'zod';
const id = z.string().min(1).max(100);
const cents = z.number().int().min(0).max(100000000);
export const companionSchema = z
  .object({
    budgets: z
      .record(
        z.iso.date(),
        z
          .object({ totalCents: cents, extrasCents: cents })
          .refine((b) => b.extrasCents <= b.totalCents),
      )
      .default({}),
    prices: z
      .record(
        id,
        z.object({
          cents,
          packageGrams: z.number().finite().positive().max(10000000),
          recordedOn: z.iso.date(),
          source: z.string().trim().min(1).max(100),
        }),
      )
      .default({}),
    expenses: z
      .array(
        z.object({
          id,
          date: z.iso.date(),
          cents,
          store: z.string().trim().min(1).max(100),
          note: z.string().max(300),
        }),
      )
      .max(5000)
      .default([]),
    staples: z
      .array(
        z.object({
          id,
          name: z.string().trim().min(1).max(100),
          quantity: z.number().finite().positive().max(1000000),
          unit: z.enum(['adet', 'paket', 'g', 'ml']),
        }),
      )
      .max(100)
      .default([]),
    pantryDates: z
      .record(id, z.object({ date: z.iso.date(), kind: z.enum(['expiry', 'opened']) }))
      .default({}),
    feedback: z.record(id, z.enum(['prefer', 'avoid'])).default({}),
    cooking: z
      .record(
        id,
        z.object({
          fingerprint: z.string().max(200000),
          step: z.number().int().min(0).max(1000),
          servings: z.number().int().min(1).max(12),
          deadline: z.number().finite().min(0).nullable(),
          seconds: z.number().int().min(0).max(36000),
        }),
      )
      .default({}),
    prepChecks: z.record(z.iso.date(), z.array(z.string().max(200000)).max(1000)).default({}),
  })
  .superRefine((value, ctx) => {
    for (const list of [value.staples, value.expenses])
      if (new Set(list.map((v) => v.id)).size !== list.length)
        ctx.addIssue({ code: 'custom', message: 'Kayıt kimlikleri yinelenemez.' });
  });
