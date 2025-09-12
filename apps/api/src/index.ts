import { startApi } from './api';
import { startWorker } from './worker';

async function main() {
  // Start both services and keep them running
  await Promise.all([startApi(), startWorker()]);

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
