import { z } from "zod";

export const Platform = z.enum(["twitter", "bluesky", "onlyfans", "jff"]);
export type Platform = z.infer<typeof Platform>;

export const OAuthTokensCreate = z.object({
  platform: Platform,
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresIn: z.number().int().positive(),
  username: z.string().min(1),
  userId: z.string().min(1)
});
export type OAuthTokensCreate = z.infer<typeof OAuthTokensCreate>;

export const ApiSuccess = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ success: z.literal(true), message: z.string().optional(), data });
export const ApiError = z.object({ error: z.unknown() });


