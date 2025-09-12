import jwt from 'jsonwebtoken';

import { PrismaClient } from '../generated/prisma';
import { hashPassword } from '../src/auth';
import { env } from '../src/env';

// Just a little helper file for local dev to create a dev user with fixed if and token
// so we dont have to change it in the Expo App.
// Has to be replaced by proper register/login of course

const prisma = new PrismaClient();

const DEV_USER = {
  email: 'dev@example.com',
  password: 'devpassword123',
  id: 'cmfgmvug80000tejlxenm871s', // Fixed ID to match your desired token
};

// Fixed timestamp to generate the exact same token every time
const FIXED_TIMESTAMP = 1757669241; // This matches the 'iat' in your desired token

async function createDevUser() {
  try {
    console.log('🔧 Setting up dev user...');

    // Delete existing dev user if it exists
    await prisma.user.deleteMany({
      where: { email: DEV_USER.email },
    });

    // Create dev user with fixed ID
    const passwordHash = await hashPassword(DEV_USER.password);
    const user = await prisma.user.create({
      data: {
        id: DEV_USER.id,
        email: DEV_USER.email,
        passwordHash,
      },
    });

    // Generate token with fixed timestamp for consistency
    const token = jwt.sign(
      {
        userId: user.id,
        iat: FIXED_TIMESTAMP,
        exp: FIXED_TIMESTAMP + 7 * 24 * 60 * 60, // 7 days from fixed timestamp
      },
      env.JWT_SECRET,
    );

    console.log('✅ Dev user created successfully!');
    console.log('');
    console.log('📧 Email:', DEV_USER.email);
    console.log('🔑 Password:', DEV_USER.password);
    console.log('🆔 User ID:', user.id);
    console.log('');
    console.log('🎫 JWT Token:');
    console.log(token);
    console.log('');
    console.log('🔗 Use this token in your frontend:');
    console.log(`Authorization: Bearer ${token}`);
    console.log('');
    console.log('🧪 Test the token:');
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:8080/api/users/me`);
  } catch (error) {
    console.error('❌ Error creating dev user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDevUser();
