import { z } from 'zod';

// ============================================================================
// USER DATABASE TYPES
// ============================================================================

export const User = z.object({
  id: z.string(),
  email: z.string(),
  passwordHash: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof User>;

// ============================================================================
// USER API TYPES
// ============================================================================

// UserResponse is a subset of User (no passwordHash, timestamps)
export const UserResponse = User.pick({
  id: true,
  email: true,
});
export type UserResponse = z.infer<typeof UserResponse>;