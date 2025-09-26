import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

/**
 * Helper function to download a media file
 */
export async function downloadMediaFile(url: string, mediaId: string): Promise<string> {
  const mediaDir = path.join(process.cwd(), 'uploads', 'media');
  await fs.mkdir(mediaDir, { recursive: true });
  
  const fileExtension = path.extname(new globalThis.URL(url).pathname) || '.jpg';
  const fileName = `${mediaId}${fileExtension}`;
  const filePath = path.join(mediaDir, fileName);

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const file = createWriteStream(filePath);
    
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(filePath);
      });
      
      file.on('error', (err: Error) => {
        fs.unlink(filePath).catch(() => {}); // Clean up on error
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}
