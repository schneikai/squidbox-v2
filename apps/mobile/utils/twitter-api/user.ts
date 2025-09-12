export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

/**
 * Get Twitter user profile using OAuth 2.0
 */
export const getTwitterUser = async (accessToken: string): Promise<TwitterUser> => {
  const response = await fetch('https://api.twitter.com/2/users/me', {
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

  const data = await response.json();
  return data.data;
};
