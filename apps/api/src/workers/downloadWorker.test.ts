import '../../test/setup';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startDownloadWorker } from './downloadWorker';
import { getPrisma } from '../prisma';
import { downloadQueue } from '../queue';
import { Worker } from 'bullmq';
import { promises as fs } from 'fs';
import path from 'path';
import { startWorker, waitForJobState, waitForJobCompletion, createTestJobOptions } from '../../test/worker-utils';

// Mock the downloadMediaFile function to avoid actual HTTP requests
vi.mock('../utils/downloadMediaFile', () => ({
  downloadMediaFile: vi.fn().mockResolvedValue('/fake/path/to/downloaded/file.jpg'),
}));

// We'll override the queue options directly in the test

describe('downloadWorker', () => {
  let worker: Worker;

  beforeEach(async () => {
    // Clean up any existing jobs before each test
    await downloadQueue.obliterate({ force: true });
    
    // Start worker after database is set up (database setup happens in test/setup.ts)
    // This ensures the worker uses the same database connection as the test
  });

  afterEach(async () => {
    // Clean up worker after each test
    if (worker) {
      await worker.close();
    }
    
    // Clean up any remaining jobs
    await downloadQueue.obliterate({ force: true });
  });

  it('should process a download job successfully', async () => {
    // Start the actual worker (after database is set up)
    worker = await startWorker(() => startDownloadWorker());

    // Create test media record (without localPath to trigger download)
    await getPrisma().media.create({
      data: {
        id: 'test-media-1',
        type: 'image',
        url: 'https://example.com/image.jpg',
      },
    });

    // Add a job to the queue
    const job = await downloadQueue.add('download:media', {
      mediaId: 'test-media-1',
      groupId: 'test-group-1',
    });

    // Wait for job to complete
    await waitForJobState(job, 'completed');

    // Verify download result was created in database
    const downloadResult = await getPrisma().mediaDownloadResult.findUnique({
      where: { mediaId: 'test-media-1' },
    });
    expect(downloadResult).toBeTruthy();
    expect(downloadResult?.status).toBe('success');

    // Verify media record was updated with localPath
    const updatedMedia = await getPrisma().media.findUnique({
      where: { id: 'test-media-1' },
    });
    expect(updatedMedia?.localPath).toBe('/fake/path/to/downloaded/file.jpg');
  });

  it('should skip download when file already exists', async () => {
    // Start the actual worker (after database is set up)
    worker = await startWorker(() => startDownloadWorker());

    // Create a test file that already exists
    const mediaDir = path.join(process.cwd(), 'uploads', 'media');
    await fs.mkdir(mediaDir, { recursive: true });
    
    const testFilePath = path.join(mediaDir, 'test-media-2.jpg');
    await fs.writeFile(testFilePath, 'test content');

    // Create test media record with localPath already set
    await getPrisma().media.create({
      data: {
        id: 'test-media-2',
        type: 'image',
        url: 'https://example.com/image2.jpg',
        localPath: testFilePath,
      },
    });

    // Verify the file actually exists
    const { existsSync } = await import('fs');
    expect(existsSync(testFilePath)).toBe(true);

    // Add a job to the queue
    const job = await downloadQueue.add('download:media', {
      mediaId: 'test-media-2',
      groupId: 'test-group-2',
    });

    // Wait for job to complete
    await waitForJobState(job, 'completed');

    // Verify download result was created in database
    const downloadResult = await getPrisma().mediaDownloadResult.findUnique({
      where: { mediaId: 'test-media-2' },
    });
    expect(downloadResult).toBeTruthy();
    expect(downloadResult?.status).toBe('success');
    expect(downloadResult?.statusText).toBe('File already exists');
  });

  it('should handle download failures and retries', async () => {
    // Start the actual worker (after database is set up)
    worker = await startWorker(() => startDownloadWorker());

    // Create test media record
    await getPrisma().media.create({
      data: {
        id: 'test-media-fail',
        type: 'image',
        url: 'https://example.com/fail.jpg',
      },
    });

    // Mock downloadMediaFile to always throw an error
    const { downloadMediaFile } = await import('../utils/downloadMediaFile');
    vi.mocked(downloadMediaFile).mockRejectedValue(new Error('Network error: Connection timeout'));

    // Add a job to the queue with faster retry options for testing
    const job = await downloadQueue.add('download:media', {
      mediaId: 'test-media-fail',
      groupId: 'test-group-fail',
    }, createTestJobOptions());

    // Wait for job to fail
    await waitForJobState(job, 'failed');

    // Verify download result shows failure
    const downloadResult = await getPrisma().mediaDownloadResult.findUnique({
      where: { mediaId: 'test-media-fail' },
    });
    expect(downloadResult).toBeTruthy();
    expect(downloadResult?.status).toBe('failed');
    expect(downloadResult?.statusText).toContain('Network error: Connection timeout');

    // Verify the job was retried (should have been called multiple times)
    expect(downloadMediaFile).toHaveBeenCalledTimes(3); // Default retry attempts
  });
});
