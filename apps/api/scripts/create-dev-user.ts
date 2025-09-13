#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth';

const prisma = new PrismaClient();

// Get dev user credentials from environment variables with fallbacks
const DEV_USER_EMAIL = process.env.EXPO_PUBLIC_DEV_USER_EMAIL || 'dev@example.com';
const DEV_USER_PASSWORD = process.env.EXPO_PUBLIC_DEV_USER_PASSWORD || 'devpassword123';

async function createDevUser() {
  try {
    console.log('🔍 Checking if dev user already exists...');
    console.log('📧 Using email:', DEV_USER_EMAIL);
    console.log('🔑 Using password:', DEV_USER_PASSWORD);
    
    // Check if dev user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: DEV_USER_EMAIL },
    });

    if (existingUser) {
      console.log('✅ Dev user already exists!');
      return;
    }

    console.log('👤 Creating dev user...');
    
    // Create the dev user
    const passwordHash = await hashPassword(DEV_USER_PASSWORD);
    const user = await prisma.user.create({
      data: {
        email: DEV_USER_EMAIL,
        passwordHash,
      },
    });

    console.log('✅ Dev user created successfully!');
    console.log('🆔 User ID:', user.id);
    
  } catch (error) {
    console.error('❌ Error creating dev user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createDevUser();
