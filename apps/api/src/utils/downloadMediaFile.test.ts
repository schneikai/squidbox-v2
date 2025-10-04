import '../../test/setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPrisma } from '../prisma';

// Mock file downloader to avoid network
vi.mock('./downloadMediaFile', () => ({
  downloadMediaFile: vi.fn().mockResolvedValue('/tmp/dl-file.jpg'),
}));

describe('downloadMediaFile', () => {
  let mediaId: string;

  beforeEach(async () => {
    const media = await getPrisma().media.create({
      data: { type: 'image', url: `https://ex.com/${Date.now()}.jpg` },
    });
    mediaId = media.id;
  });

  it('downloads file and returns local path', async () => {
    const { downloadMediaFile } = await import('./downloadMediaFile');
    const local = await downloadMediaFile('https://ex.com/a.jpg', mediaId);
    expect(local).toBe('/tmp/dl-file.jpg');
  });

  it('throws error on download failure', async () => {
    const { downloadMediaFile } = await import('./downloadMediaFile');
    vi.mocked(downloadMediaFile).mockRejectedValueOnce(new Error('boom'));
    await expect(downloadMediaFile('https://ex.com/a.jpg', mediaId)).rejects.toThrow('boom');
  });
});


