import { hashPassword } from '../src/auth';
import { getPrisma } from '../src/prisma';

export type TestUser = {
  id: string;
  email: string;
  password: string;
};

export async function createUser(opts?: { email?: string; password?: string }): Promise<TestUser> {
  const email = opts?.email ?? `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = opts?.password ?? 'password123';
  const user = await getPrisma().user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
    },
  });
  return { id: user.id, email, password };
}

export async function authenticateUser(user?: TestUser): Promise<{ token: string; user: TestUser }>{
  if (!user) user = await createUser();
  const { signJwt } = await import('../src/auth');
  const token = signJwt({ userId: user.id });
  return { token, user };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}


