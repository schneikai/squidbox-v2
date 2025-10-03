import '../../test/setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startDownloadWorker } from './downloadWorker';
import { getPrisma } from '../prisma';
import { downloadMedia } from '../utils/downloadMedia';
import { twitterQueue } from '../queue';
import { existsSync } from 'fs';

// Mock dependencies
vi.mock('../utils/downloadMedia');
vi.mock('../queue', () => ({
  createWorker: vi.fn(),
  QUEUE_NAMES: { download: 'media-download' },
  twitterQueue: {
    add: vi.fn(),
  },
}));
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

const mockDownloadMedia = vi.mocked(downloadMedia);
const mockExistsSync = vi.mocked(existsSync);
const mockTwitterQueueAdd = vi.mocked(twitterQueue.add);

describe('downloadWorker', () => {
  let mockJob: any;
  let mockProcessor: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock job with updateProgress method
    mockJob = {
      data: { groupId: 'test-group-1' },
      updateProgress: vi.fn(),
    };

    // Mock the createWorker function to capture the processor
    const { createWorker } = await import('../queue');
    vi.mocked(createWorker).mockImplementation((queueName, processor) => {
      mockProcessor = processor;
      return {} as any;
    });

    // Start the worker to capture the processor
    startDownloadWorker();
  });

  afterEach(async () => {
    // Clean up any test data
    await getPrisma().postResult.deleteMany();
    await getPrisma().postMedia.deleteMany();
    await getPrisma().media.deleteMany();
    await getPrisma().post.deleteMany();
    await getPrisma().user.deleteMany();
  });

  describe('basic functionality', () => {
    it('should process posts and download media successfully', async () => {
      // Create test data
      const user = await getPrisma().user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed-password',
        },
      });

      const media1 = await getPrisma().media.create({
        data: {
          type: 'image',
          url: 'https://example.com/image1.jpg',
        },
      });

      const media2 = await getPrisma().media.create({
        data: {
          type: 'image',
          url: 'https://example.com/image2.jpg',
        },
      });

      const post1 = await getPrisma().post.create({
        data: {
          userId: user.id,
          platform: 'twitter',
          text: 'Test post 1',
          status: 'pending',
          groupId: 'test-group-1',
        },
      });

      const post2 = await getPrisma().post.create({
        data: {
          userId: user.id,
          platform: 'twitter',
          text: 'Test post 2',
          status: 'pending',
          groupId: 'test-group-1',
        },
      });

      await getPrisma().postMedia.createMany({
        data: [
          { postId: post1.id, mediaId: media1.id, order: 0 },
          { postId: post2.id, mediaId: media2.id, order: 0 },
        ],
      });

      // Mock file system - files don't exist
      mockExistsSync.mockReturnValue(false);
      
      // Mock successful downloads
      mockDownloadMedia.mockResolvedValue('/path/to/downloaded/file.jpg');

      // Execute the processor
      const result = await mockProcessor(mockJob);

      // Verify progress updates were called
      expect(mockJob.updateProgress).toHaveBeenCalledWith({
        phase: 'starting',
        groupId: 'test-group-1',
        retryOnly: false,
      });

      expect(mockJob.updateProgress).toHaveBeenCalledWith({
        phase: 'downloading',
        groupId: 'test-group-1',
        completed: 0,
        total: 2,
        percent: 0,
      });

      expect(mockJob.updateProgress).toHaveBeenCalledWith({
        phase: 'finished',
        groupId: 'test-group-1',
        completed: 2,
        total: 2,
        percent: 100,
      });

      // Verify downloads were called
      expect(mockDownloadMedia).toHaveBeenCalledTimes(2);
      expect(mockDownloadMedia).toHaveBeenCalledWith(media1.id, media1.url);
      expect(mockDownloadMedia).toHaveBeenCalledWith(media2.id, media2.url);

      // Verify Twitter queue jobs were added
      expect(mockTwitterQueueAdd).toHaveBeenCalledTimes(2);
      expect(mockTwitterQueueAdd).toHaveBeenCalledWith('post:twitter', {
        userId: user.id,
        postId: post1.id,
        text: post1.text,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });

      // Verify return value
      expect(result).toEqual({ ok: true, postsProcessed: 2 });
    });

    it('should handle retryOnly mode correctly', async () => {
      // Create test data with failed posts
      const user = await getPrisma().user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed-password',
        },
      });

      const media = await getPrisma().media.create({
        data: {
          type: 'image',
          url: 'https://example.com/image.jpg',
        },
      });

      const post = await getPrisma().post.create({
        data: {
          userId: user.id,
          platform: 'twitter',
          text: 'Failed post',
          status: 'failed', // This should be included in retryOnly
          groupId: 'test-group-1',
        },
      });

      await getPrisma().postMedia.create({
        data: {
          postId: post.id,
          mediaId: media.id,
          order: 0,
        },
      });

      // Set retryOnly mode
      mockJob.data.retryOnly = true;
      mockExistsSync.mockReturnValue(false);
      mockDownloadMedia.mockResolvedValue('/path/to/downloaded/file.jpg');

      // Execute the processor
      const result = await mockProcessor(mockJob);

      // Verify it processed the failed post
      expect(result).toEqual({ ok: true, postsProcessed: 1 });
      expect(mockDownloadMedia).toHaveBeenCalledWith(media.id, media.url);
    });

    it('should skip download when file already exists', async () => {
      // Create test data
      const user = await getPrisma().user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed-password',
        },
      });

      const media = await getPrisma().media.create({
        data: {
          type: 'image',
          url: 'https://example.com/image.jpg',
          localPath: '/existing/path/image.jpg',
        },
      });

      const post = await getPrisma().post.create({
        data: {
          userId: user.id,
          platform: 'twitter',
          text: 'Test post',
          status: 'pending',
          groupId: 'test-group-1',
        },
      });

      await getPrisma().postMedia.create({
        data: {
          postId: post.id,
          mediaId: media.id,
          order: 0,
        },
      });

      // Mock file exists
      mockExistsSync.mockReturnValue(true);

      // Execute the processor
      const result = await mockProcessor(mockJob);

      // Verify download was skipped
      expect(mockDownloadMedia).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: true, postsProcessed: 1 });
    });

    it('should handle non-Twitter platforms by creating failed results', async () => {
      // Create test data with non-Twitter platform
      const user = await getPrisma().user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed-password',
        },
      });

      const post = await getPrisma().post.create({
        data: {
          userId: user.id,
          platform: 'bluesky', // Non-Twitter platform
          text: 'Test post',
          status: 'pending',
          groupId: 'test-group-1',
        },
      });

      mockExistsSync.mockReturnValue(false);

      // Execute the processor
      const result = await mockProcessor(mockJob);

      // Verify no Twitter queue jobs were added
      expect(mockTwitterQueueAdd).not.toHaveBeenCalled();

      // Verify failed result was created
      const postResult = await getPrisma().postResult.findFirst({
        where: { postId: post.id },
      });

      expect(postResult).toBeTruthy();
      expect(postResult?.status).toBe('failed');
      expect(postResult?.statusText).toBe('bluesky posting not yet implemented');

      // Verify post status was updated to failed
      const updatedPost = await getPrisma().post.findUnique({
        where: { id: post.id },
      });
      expect(updatedPost?.status).toBe('failed');

      expect(result).toEqual({ ok: true, postsProcessed: 1 });
    });

    it('should handle empty group gracefully', async () => {
      // Execute with no posts in group
      const result = await mockProcessor(mockJob);

      // Verify progress updates
      expect(mockJob.updateProgress).toHaveBeenCalledWith({
        phase: 'starting',
        groupId: 'test-group-1',
        retryOnly: false,
      });

      expect(mockJob.updateProgress).toHaveBeenCalledWith({
        phase: 'downloading',
        groupId: 'test-group-1',
        completed: 0,
        total: 0,
        percent: 0,
      });

      expect(mockJob.updateProgress).toHaveBeenCalledWith({
        phase: 'finished',
        groupId: 'test-group-1',
        completed: 0,
        total: 0,
        percent: 100,
      });

      expect(result).toEqual({ ok: true, postsProcessed: 0 });
    });
  });

  describe('progress tracking', () => {
    it('should update progress correctly for multiple media items', async () => {
      // Create test data with multiple media items
      const user = await getPrisma().user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed-password',
        },
      });

      const media1 = await getPrisma().media.create({
        data: {
          type: 'image',
          url: 'https://example.com/image1.jpg',
        },
      });

      const media2 = await getPrisma().media.create({
        data: {
          type: 'image',
          url: 'https://example.com/image2.jpg',
        },
      });

      const post = await getPrisma().post.create({
        data: {
          userId: user.id,
          platform: 'twitter',
          text: 'Test post',
          status: 'pending',
          groupId: 'test-group-1',
        },
      });

      await getPrisma().postMedia.createMany({
        data: [
          { postId: post.id, mediaId: media1.id, order: 0 },
          { postId: post.id, mediaId: media2.id, order: 1 },
        ],
      });

      mockExistsSync.mockReturnValue(false);
      mockDownloadMedia.mockResolvedValue('/path/to/downloaded/file.jpg');

      // Execute the processor
      await mockProcessor(mockJob);

      // Verify progress updates for each media item
      expect(mockJob.updateProgress).toHaveBeenCalledWith({
        phase: 'downloading',
        groupId: 'test-group-1',
        postId: post.id,
        mediaId: media1.id,
        completed: 0,
        total: 2,
        percent: 0,
      });

      expect(mockJob.updateProgress).toHaveBeenCalledWith({
        phase: 'downloading',
        groupId: 'test-group-1',
        postId: post.id,
        mediaId: media1.id,
        completed: 1,
        total: 2,
        percent: 50,
      });

      expect(mockJob.updateProgress).toHaveBeenCalledWith({
        phase: 'downloading',
        groupId: 'test-group-1',
        postId: post.id,
        mediaId: media2.id,
        completed: 1,
        total: 2,
        percent: 50,
      });

      expect(mockJob.updateProgress).toHaveBeenCalledWith({
        phase: 'downloading',
        groupId: 'test-group-1',
        postId: post.id,
        mediaId: media2.id,
        completed: 2,
        total: 2,
        percent: 100,
      });
    });
  });
});
