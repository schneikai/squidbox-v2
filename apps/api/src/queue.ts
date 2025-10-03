import { Queue, Worker, FlowProducer, QueueEvents, type Processor } from 'bullmq';
import IORedis from 'ioredis';
import './env'; // Load environment variables
import { logger } from './logger';

// Redis connection
export const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  // BullMQ requires this to be null for blocking commands used by QueueEvents/Workers
  maxRetriesPerRequest: null,
});

// Queue names
export const QUEUE_NAMES = {
  // Use hyphens to satisfy BullMQ queue name constraints (no colons allowed)
  download: 'media-download',
  twitter: 'post-twitter',
  bluesky: 'post-bluesky',
  onlyfans: 'post-onlyfans',
  jff: 'post-jff',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// Queues
export const downloadQueue = new Queue(QUEUE_NAMES.download, { connection });
export const twitterQueue = new Queue(QUEUE_NAMES.twitter, { connection });
export const blueskyQueue = new Queue(QUEUE_NAMES.bluesky, { connection });
export const onlyfansQueue = new Queue(QUEUE_NAMES.onlyfans, { connection });
export const jffQueue = new Queue(QUEUE_NAMES.jff, { connection });

// Queue events (used for SSE broadcasting)
export const downloadEvents = new QueueEvents(QUEUE_NAMES.download, { connection });
export const twitterEvents = new QueueEvents(QUEUE_NAMES.twitter, { connection });
export const blueskyEvents = new QueueEvents(QUEUE_NAMES.bluesky, { connection });
export const onlyfansEvents = new QueueEvents(QUEUE_NAMES.onlyfans, { connection });
export const jffEvents = new QueueEvents(QUEUE_NAMES.jff, { connection });

// Flow producer for job dependencies
export const flowProducer = new FlowProducer({ connection });

// Helper to create a worker
export function createWorker<T = unknown>(queueName: QueueName, processor: Processor<T, unknown>) {
  const worker = new Worker<T>(queueName, processor, {
    connection,
    // Reasonable defaults; can be tuned per queue later
    concurrency: queueName === QUEUE_NAMES.twitter ? 2 : 4,
  });

  worker.on('error', (err) => {
    logger.error({ err, queueName }, 'Worker error');
  });

  return worker;
}

export function closeQueues() {
  return Promise.all([
    downloadQueue.close(),
    twitterQueue.close(),
    blueskyQueue.close(),
    onlyfansQueue.close(),
    jffQueue.close(),
    downloadEvents.close(),
    twitterEvents.close(),
    blueskyEvents.close(),
    onlyfansEvents.close(),
    jffEvents.close(),
    flowProducer.close(),
    connection.quit(),
  ]);
}

