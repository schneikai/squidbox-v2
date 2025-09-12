export interface TwitterPostResult {
  success: boolean;
  tweetId?: string;
  error?: string;
  errorType?: 'rate_limit' | 'unauthorized' | 'other';
}

/**
 * Create a tweet using OAuth 2.0
 */
export const createTweet = async (
  accessToken: string,
  text: string,
  mediaIds?: string[],
): Promise<TwitterPostResult> => {
  try {
    const tweetData: any = {
      text: text,
    };

    if (mediaIds && mediaIds.length > 0) {
      tweetData.media = {
        media_ids: mediaIds,
      };
    }

    console.log('Tweet data:', JSON.stringify(tweetData, null, 2));

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetData),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twitter API error response:', errorText);

      // Handle specific error types
      if (response.status === 429) {
        return {
          success: false,
          error: 'Too many requests. Please try again later.',
          errorType: 'rate_limit',
        };
      } else if (response.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please sign in again.',
          errorType: 'unauthorized',
        };
      } else {
        return {
          success: false,
          error: `Twitter API error: ${response.status} - ${errorText}`,
          errorType: 'other',
        };
      }
    }

    const data = await response.json();
    console.log('Twitter API success response:', data);

    return { success: true, tweetId: data.data.id };
  } catch (error) {
    console.error('Error creating tweet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorType: 'other',
    };
  }
};
