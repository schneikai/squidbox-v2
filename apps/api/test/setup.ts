import { beforeEach, afterEach, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { getPrisma, resetPrisma } from '../src/prisma';


// This file is used to setup the database for the tests.
// It will create a template db and then use it to create a new db for each test.
// This way each test uses its own database.

// With the template db this is already quite fast. But it could be optimized further
// if a template db is created each time we are updating and pushing the schema with prisma.


// resolve Prisma CLI JS (no shell shim)
const requireHere = createRequire(import.meta.url);
const prismaPkg = requireHere.resolve('prisma/package.json');
const prismaCliJs = path.join(path.dirname(prismaPkg), 'build', 'index.js');

// resolve schema path: ../prisma/schema.prisma
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '..', 'prisma', 'schema.prisma');

// get base database url from env
const BASE_URL = process.env.DATABASE_URL!;

// set admin db url. we need to switch to another db when dropping a database.
const ADMIN_URL = withDb(BASE_URL, 'postgres');

// set template db name. we use the template to push the schema once and then reuse it for each test.
const baseName = dbNameOf(BASE_URL);
const TEMPLATE_DB = `${baseName}_tmpl_${crypto.randomUUID().slice(0, 8)}`;
let templateReady: Promise<void> | null = null;

let currentDbName: string | null = null;

// create the template db
await ensureTemplateDb();

beforeEach(async () => {
  currentDbName = `${baseName}_t_${crypto.randomUUID().slice(0, 8)}`;
  await execAdmin(`CREATE DATABASE "${currentDbName}" TEMPLATE "${TEMPLATE_DB}";`);

  process.env.DATABASE_URL = withDb(BASE_URL, currentDbName);
  await resetPrisma();
});

afterEach(async () => {
  await getPrisma().$disconnect();

  if (currentDbName) {
    await dropDbIfExists(currentDbName);
    currentDbName = null;
    process.env.DATABASE_URL = BASE_URL;
  }
});

afterAll(async () => {
  await getPrisma().$disconnect();
  await dropDbIfExists(TEMPLATE_DB);
});



// helpers

function withDb(urlStr: string, db: string) {
  const u = new URL(urlStr);
  u.pathname = `/${db}`;
  return u.toString();
}

function dbNameOf(urlStr: string) {
  return new URL(urlStr).pathname.replace(/^\//, '');
}

async function execAdmin(sql: string) {
  const admin = new PrismaClient({ datasources: { db: { url: ADMIN_URL } } });
  try { await admin.$executeRawUnsafe(sql); }
  finally { await admin.$disconnect(); }
}

function pushSchemaTo(url: string) {
  execFileSync(
    process.execPath,
    [prismaCliJs, 'db', 'push', '--schema', schemaPath, '--skip-generate'],
    { stdio: 'ignore', env: { ...process.env, DATABASE_URL: url } }
  );
}

async function dropDbIfExists(name: string) {
  try {
    await execAdmin(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${name}' AND pid <> pg_backend_pid();
    `);
    try { await execAdmin(`DROP DATABASE "${name}" WITH (FORCE);`); }
    catch { await execAdmin(`DROP DATABASE IF EXISTS "${name}";`); }
  } catch { /* ignore */ }
}

async function ensureTemplateDb() {
  if (templateReady) return templateReady;
  templateReady = (async () => {
    await dropDbIfExists(TEMPLATE_DB);
    await execAdmin(`CREATE DATABASE "${TEMPLATE_DB}";`);
    pushSchemaTo(withDb(BASE_URL, TEMPLATE_DB));
    await execAdmin(`REVOKE CONNECT ON DATABASE "${TEMPLATE_DB}" FROM PUBLIC;`);
    await execAdmin(`ALTER DATABASE "${TEMPLATE_DB}" IS_TEMPLATE true;`);
  })();
  return templateReady;
}