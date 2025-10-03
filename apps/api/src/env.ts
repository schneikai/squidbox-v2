process.env.DOTENV_CONFIG_QUIET = 'true'; // Suppress dotenv tips

import { config } from 'dotenv';

// Default to development if NODE_ENV is not set, and use .env for development
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'development' ? '.env' : `.env.${nodeEnv}`;

config({ path: envFile });
