import { z } from 'zod';

export const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
