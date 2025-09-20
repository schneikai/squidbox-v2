import type { CreateTweetRequest } from './types';

/**
 * Create a tweet using OAuth 2.0 Bearer Token
 */
export const createTweet = async (
  accessToken: string,
  request: CreateTweetRequest,
): Promise<string> => {
  const tweetData: any = {
    text: request.text,
  };

  if (request.mediaIds && request.mediaIds.length > 0) {
    tweetData.media = {
      media_ids: request.mediaIds,
    };
  }

  if (request.replyToTweetId) {
    tweetData.reply = {
      in_reply_to_tweet_id: request.replyToTweetId,
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
    throw new Error(`Twitter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as { data: { id: string } };
  console.log('Twitter API success response:', data);

  return data.data.id;
};

/**
 * Delete a tweet by ID
 */
export const deleteTweet = async (
  accessToken: string,
  tweetId: string,
): Promise<boolean> => {
  const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Twitter API error response:', errorText);
    throw new Error(`Twitter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as { data: { deleted: boolean } };
  return data.data.deleted;
};
