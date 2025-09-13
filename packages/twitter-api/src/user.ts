import type { TwitterUser } from './types';

/**
 * Get Twitter user information
 */
export const getTwitterUser = async (
  accessToken: string,
  userId?: string,
  username?: string,
): Promise<TwitterUser> => {
  let url = 'https://api.twitter.com/2/users/me';
  const params = new URLSearchParams({
    'user.fields': 'id,username,name,profile_image_url,public_metrics',
  });

  if (userId) {
    url = `https://api.twitter.com/2/users/${userId}`;
  } else if (username) {
    url = `https://api.twitter.com/2/users/by/username/${username}`;
  }

  const response = await fetch(`${url}?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Twitter API error response:', errorText);
    
    if (response.status === 401) {
      throw new Error('unauthorized');
    } else if (response.status === 429) {
      throw new Error('rate_limit');
    } else {
      throw new Error(`Twitter API error: ${response.status} - ${errorText}`);
    }
  }

  const data = await response.json() as { data: TwitterUser };
  return data.data;
};
