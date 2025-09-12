import * as AuthSession from 'expo-auth-session';

// Twitter OAuth 2.0 configuration
const TWITTER_CLIENT_ID = process.env.EXPO_PUBLIC_TWITTER_CLIENT_ID || '';
const TWITTER_CLIENT_SECRET = process.env.EXPO_PUBLIC_TWITTER_CLIENT_SECRET || '';
const TWITTER_CALLBACK_URL =
  process.env.EXPO_PUBLIC_TWITTER_CALLBACK_URL || 'squidboxsocial://auth';

/**
 * Initialize Twitter OAuth 2.0 authentication
 */
export const initializeTwitterAuth = async (): Promise<AuthSession.AuthRequest> => {
  // Validate required configuration
  if (!TWITTER_CLIENT_ID) {
    throw new Error(
      'Twitter Client ID is not configured. Please set EXPO_PUBLIC_TWITTER_CLIENT_ID in your .env file.',
    );
  }

  // Use the configured callback URL or fallback to the app scheme
  const redirectUri =
    TWITTER_CALLBACK_URL ||
    AuthSession.makeRedirectUri({
      scheme: 'squidboxsocial',
      path: 'auth',
    });

  console.log('Redirect URI:', redirectUri);

  const request = new AuthSession.AuthRequest({
    clientId: TWITTER_CLIENT_ID,
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
  });

  // Generate the authorization URL and PKCE values
  await request.makeAuthUrlAsync({
    authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
  });

  return request;
};

/**
 * Exchange authorization code for access and refresh tokens
 */
export const exchangeCodeForTokens = async (
  code: string,
  codeVerifier: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> => {
  const redirectUri =
    TWITTER_CALLBACK_URL ||
    AuthSession.makeRedirectUri({
      scheme: 'squidboxsocial',
      path: 'auth',
    });

  const response = await AuthSession.exchangeCodeAsync(
    {
      clientId: TWITTER_CLIENT_ID,
      clientSecret: TWITTER_CLIENT_SECRET,
      code: code,
      redirectUri: redirectUri,
      extraParams: {
        code_verifier: codeVerifier,
      },
    },
    {
      tokenEndpoint: 'https://api.twitter.com/2/oauth2/token',
    },
  );

  if (!response.accessToken) {
    throw new Error('Failed to get access token from Twitter');
  }

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken || '',
    expiresIn: response.expiresIn || 7200,
  };
};
