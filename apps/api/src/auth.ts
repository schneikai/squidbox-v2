import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';

import { env } from './env';
import { logger } from './logger';
import { prisma } from './prisma';

export type JwtPayload = {
  userId: string;
};

export function signJwt(payload: JwtPayload) {
  return jwt.sign(payload, env.JWT_SECRET as Secret, {
    expiresIn: env.JWT_EXPIRES_IN as unknown as any,
  });
}

export function verifyJwt(token: string) {
  return jwt.verify(token, env.JWT_SECRET as Secret) as JwtPayload;
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function requireAuthorization(
  req: Request,
  res: Response,
): Promise<{ id: string; email: string } | null> {
  // Validate JWT token in Authorization header
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return null;
  }

  const token = auth.replace('Bearer ', '');
  try {
    const payload = verifyJwt(token);

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return null;
    }

    return user;
  } catch (e) {
    logger.warn({ err: e }, 'invalid token');
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}
