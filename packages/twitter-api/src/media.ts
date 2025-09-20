import type { UploadMediaRequest } from './types';

const MEDIA_UPLOAD_BASE = 'https://api.twitter.com/2/media/upload';
const DEFAULT_CHUNK_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB

/**
 * Upload media (image or video) to X via v2 chunked endpoint.
 * Uses initialize/append/finalize flow, polling STATUS if processing is async.
 */
export const uploadMedia = async (
  accessToken: string,
  request: UploadMediaRequest,
): Promise<string> => {
  const { mediaType } = request;
  const mediaCategory = inferMediaCategory(mediaType);

  // Normalize to Uint8Array for chunking
  const bytes = await normalizeToBytes(request.file);
  const totalBytes = bytes.byteLength;

  // INITIALIZE
  const initPayload = {
    media_type: mediaType,
    total_bytes: totalBytes,
    media_category: mediaCategory,
  };

  const initResp = await fetch(`${MEDIA_UPLOAD_BASE}/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(initPayload),
  });
  if (!initResp.ok) {
    const errText = await initResp.text();
    throw new Error(`INITIALIZE failed: ${initResp.status} - ${errText}`);
  }
  const initData = await initResp.json() as { data: { id: string } };
  const mediaId = initData?.data?.id;
  if (!mediaId) {
    throw new Error('INITIALIZE succeeded but no media id returned');
  }

  // APPEND - chunked upload (images can be single-chunk)
  const chunkSize = DEFAULT_CHUNK_SIZE_BYTES;
  let segmentIndex = 0;
  for (let offset = 0; offset < totalBytes; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, totalBytes);
    const chunk = bytes.subarray(offset, end);
    const appendForm = new FormData();
    appendForm.append('segment_index', String(segmentIndex));
    // Ensure BlobPart is a plain ArrayBuffer to satisfy DOM typings
    const ab = copyToArrayBuffer(chunk);
    appendForm.append('media', new Blob([ab], { type: mediaType }));

    const appendResp = await fetch(`${MEDIA_UPLOAD_BASE}/${mediaId}/append`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: appendForm,
    });
    if (!appendResp.ok) {
      const errText = await appendResp.text();
      throw new Error(`APPEND failed (segment ${segmentIndex}): ${appendResp.status} - ${errText}`);
    }
    segmentIndex++;
  }

  // FINALIZE
  const finalizeResp = await fetch(`${MEDIA_UPLOAD_BASE}/${mediaId}/finalize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!finalizeResp.ok) {
    const errText = await finalizeResp.text();
    throw new Error(`FINALIZE failed: ${finalizeResp.status} - ${errText}`);
  }
  const finalizeData = await finalizeResp.json() as { data: { processing_info?: { state: string; check_after_secs?: number } } };

  // If processing_info present, poll STATUS until succeeded/failed
  if (finalizeData?.data?.processing_info) {
    await ensureMediaProcessingSucceeded(accessToken, mediaId);
  }

  return mediaId;
};

function inferMediaCategory(mediaType: UploadMediaRequest['mediaType']): 'tweet_image' | 'tweet_gif' | 'tweet_video' {
  switch (mediaType) {
    case 'video/mp4':
      return 'tweet_video';
    case 'image/gif':
      return 'tweet_gif';
    case 'image/jpeg':
    case 'image/png':
      return 'tweet_image';
    default:
      // Fail fast for unsupported/unknown media types
      throw new Error(`Unsupported media type for X upload: ${mediaType}`);
  }
}

async function normalizeToBytes(file: File | Blob | Buffer): Promise<Uint8Array> {
  if (Buffer.isBuffer(file)) {
    return new Uint8Array(file);
  }
  const blob = file as Blob;
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}

async function ensureMediaProcessingSucceeded(
  accessToken: string,
  mediaId: string,
  maxAttempts: number = 30,
): Promise<void> {
  let attempts = 0;
  let nextDelayMs = 1000; // default 1s
  while (attempts < maxAttempts) {
    const url = `${MEDIA_UPLOAD_BASE}/${mediaId}`;
    const statusResp = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!statusResp.ok) {
      const errText = await statusResp.text();
      throw new Error(`STATUS failed: ${statusResp.status} - ${errText}`);
    }
    const statusData = await statusResp.json() as { data: { processing_info?: { state: string; check_after_secs?: number } } };
    const proc = statusData?.data?.processing_info;
    if (!proc || proc.state === 'succeeded') return;
    if (proc.state === 'failed') throw new Error('Media processing failed');
    nextDelayMs = (proc.check_after_secs ?? 1) * 1000;
    await delay(nextDelayMs);
    attempts++;
  }
  throw new Error('Timed out waiting for media processing');
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function copyToArrayBuffer(view: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(view.byteLength);
  const dest = new Uint8Array(out);
  dest.set(view);
  return out;
}
