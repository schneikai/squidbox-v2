// Twitter API functions organized by category

// Authentication
export { exchangeCodeForTokens, initializeTwitterAuth } from './auth';

// OAuth 1.0a helpers
export { createOAuthHeader, generateOAuthSignature } from './oauth1';

// User management
export { getTwitterUser } from './user';
export type { TwitterUser } from './user';

// Posting
export { createTweet } from './posts';
export type { TwitterPostResult } from './posts';

// Media upload
export {
  uploadImageToTwitter,
  uploadVideoToTwitter,
  uploadMediaToTwitter,
  type MediaUploadResult,
} from './media';
