import { z } from "zod";

export const extractDocsContextSchema = z.object({
  url: z.string().url(),
  goal: z.string().min(3),
  stack: z.string().optional(),
  maxChars: z.number().int().positive().max(50000).optional()
});

export type ExtractDocsContextSchemaInput = z.infer<typeof extractDocsContextSchema>;
