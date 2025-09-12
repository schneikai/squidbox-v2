import CryptoJS from 'crypto-js';

// Twitter OAuth 1.0a configuration
const TWITTER_API_KEY = process.env.EXPO_PUBLIC_TWITTER_API_KEY || '';
const TWITTER_API_SECRET = process.env.EXPO_PUBLIC_TWITTER_API_SECRET || '';
const TWITTER_ACCESS_TOKEN = process.env.EXPO_PUBLIC_TWITTER_ACCESS_TOKEN || '';
const TWITTER_ACCESS_TOKEN_SECRET = process.env.EXPO_PUBLIC_TWITTER_ACCESS_TOKEN_SECRET || '';

/**
 * Generate OAuth 1.0a signature for Twitter API
 */
export const generateOAuthSignature = (
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = '',
): string => {
  // Create parameter string
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // Generate HMAC-SHA1 signature using CryptoJS
  console.log('OAuth 1.0a - Signature base string:', signatureBaseString);
  console.log('OAuth 1.0a - Signing key:', signingKey);

  const hmac = CryptoJS.HmacSHA1(signatureBaseString, signingKey);
  const signature = CryptoJS.enc.Base64.stringify(hmac);

  console.log('OAuth 1.0a - Generated signature:', signature);
  return signature;
};

/**
 * Create OAuth 1.0a authorization header
 */
export const createOAuthHeader = (
  method: string,
  url: string,
  params: Record<string, string> = {},
): string => {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2) + timestamp;

  const oauthParams = {
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: TWITTER_ACCESS_TOKEN,
    oauth_version: '1.0',
    ...params,
  };

  // Create OAuth signature
  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN_SECRET,
  );

  // Create Authorization header
  const authHeader =
    'OAuth ' +
    Object.entries(oauthParams)
      .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
      .join(', ') +
    `, oauth_signature="${encodeURIComponent(signature)}"`;

  console.log('OAuth 1.0a - Authorization header:', authHeader);
  return authHeader;
};
