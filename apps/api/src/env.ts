import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get absolute path to the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Infer environment
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'development' ? '.env' : `.env.${nodeEnv}`;

// Always resolve relative to the apps/api directory
const envPath = path.resolve(__dirname, '..', envFile);

config({ path: envPath, override: true });