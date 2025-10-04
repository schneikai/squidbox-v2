import { Worker, Job } from 'bullmq';

/**
 * Start a worker and wait for it to be ready
 * 
 * @example
 * ```typescript
 * const worker = await startWorker(() => startDownloadWorker());
 * ```
 */
export async function startWorker<T = any>(
  workerFactory: () => Worker<T>,
  timeout = 1000
): Promise<Worker<T>> {
  const worker = workerFactory();
  await waitForWorker(worker, timeout);
  return worker;
}

/**
 * Wait for a worker to be ready
 */
export async function waitForWorker(worker: Worker, timeout = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Worker did not become ready within timeout'));
    }, timeout);

    // Check if worker is already ready
    if (worker.isRunning()) {
      clearTimeout(timer);
      resolve();
      return;
    }

    // Wait for ready event
    worker.once('ready', () => {
      clearTimeout(timer);
      resolve();
    });

    worker.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Wait for a job to reach a specific state
 */
export async function waitForJobState(
  job: Job,
  targetState: string,
  options: {
    timeout?: number;
    pollInterval?: number;
  } = {}
): Promise<void> {
  const { timeout = 10000, pollInterval = 200 } = options;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const currentState = await job.getState();
    if (currentState === targetState) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(`Job did not reach state '${targetState}' within ${timeout}ms. Current state: ${await job.getState()}`);
}

/**
 * Wait for a job to complete (either completed or failed)
 */
export async function waitForJobCompletion(
  job: Job,
  options: {
    timeout?: number;
    pollInterval?: number;
  } = {}
): Promise<string> {
  const { timeout = 10000, pollInterval = 200 } = options;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const state = await job.getState();
    if (state === 'completed' || state === 'failed') {
      return state;
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(`Job did not complete within ${timeout}ms. Current state: ${await job.getState()}`);
}

/**
 * Create job options optimized for testing (fast retries)
 */
export function createTestJobOptions(overrides: any = {}) {
  return {
    attempts: 3,
    backoff: { type: 'fixed', delay: 100 },
    ...overrides,
  };
}
