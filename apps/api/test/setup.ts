import '../src/env';
import { initDatabaseForWorker, registerPerTestHooks } from './db';

const workerId = process.env.VITEST_WORKER_ID ?? '0';

// run once per worker (because this file is imported once per worker by Vitest)
await initDatabaseForWorker(workerId);

// install beforeEach/afterAll hooks for cleanup
registerPerTestHooks();