import { z } from 'zod';

// ============================================================================
// AUTH API TYPES
// ============================================================================

export const RegisterRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const AuthResponse = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
  }),
});
export type AuthResponse = z.infer<typeof AuthResponse>;
