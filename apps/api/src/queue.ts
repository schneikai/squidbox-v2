import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// To add new Queue and Worker
// 1. Add a queue configuration to QUEUE_CONFIG
// 2. Create a worker in src/workers folder
// 3. Start the worker in src/worker.ts

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
} as const;

// Queue configuration - this is now the single source of truth
export const QUEUE_CONFIG = {
  mediaDownload: {
    concurrency: 4,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  },
  postTwitter: {
    concurrency: 1,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  },
  postBluesky: {
    concurrency: 1,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  },
  postOnlyfans: {
    concurrency: 1,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  },
  postJff: {
    concurrency: 1,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  },
} as const;

// Generate queue names from config - auto-generated from QUEUE_CONFIG keys
export const QUEUE_NAMES = Object.fromEntries(
  Object.keys(QUEUE_CONFIG).map(key => [key, key])
) as Record<keyof typeof QUEUE_CONFIG, keyof typeof QUEUE_CONFIG>;

export type QueueName = keyof typeof QUEUE_CONFIG;

// Setup Redis connection
export const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  // BullMQ requires this to be null for blocking commands used by Workers
  maxRetriesPerRequest: null,
});

// Create queues
export const queues = new Map<QueueName, Queue>();

for (const [queueName, config] of Object.entries(QUEUE_CONFIG)) {
  const queue = new Queue(queueName, {
    connection,
    ...config,
  });
  queues.set(queueName as QueueName, queue);
}

// Export individual queues for backward compatibility
export const downloadQueue = queues.get('mediaDownload')!;
export const twitterQueue = queues.get('postTwitter')!;
export const blueskyQueue = queues.get('postBluesky')!;
export const onlyfansQueue = queues.get('postOnlyfans')!;
export const jffQueue = queues.get('postJff')!;


export function closeQueues() {
  return Promise.all([
    ...Array.from(queues.values()).map(queue => queue.close()),
    connection.quit(),
  ]);
}

