import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from './logger';
import { getPrisma } from './prisma';

type JwtPayload = {
  userId: string;
};

// Extend Request type to include user
export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string };
}

export function signJwt(payload: JwtPayload) {
  const options: jwt.SignOptions = {};
  
  if (process.env.JWT_EXPIRES_IN) {
    options.expiresIn = isNaN(Number(process.env.JWT_EXPIRES_IN))
      ? process.env.JWT_EXPIRES_IN as any // TODO: correct type would be StringValue
      : Number(process.env.JWT_EXPIRES_IN);
  }
  
  return jwt.sign(payload, process.env.JWT_SECRET as jwt.Secret, options);
}

function verifyJwt(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET as jwt.Secret) as JwtPayload;
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

async function requireAuthorization(
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
    const user = await getPrisma().user.findUnique({
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

/**
 * Authentication middleware that adds user to request object
 * Use this for routes that require authentication
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = await requireAuthorization(req, res);

  if (user) {
    (req as AuthenticatedRequest).user = user;
    next();
  }
  // If user is null, requireAuthorization already sent the response
};
