import type { TwitterUser } from './types';

/**
 * Get Twitter user information
 */
export const getTwitterUser = async (
  accessToken: string,
  userId?: string,
  username?: string,
): Promise<{ success: boolean; user?: TwitterUser; error?: string }> => {
  try {
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
      return {
        success: false,
        error: `Failed to get user: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json() as { data: TwitterUser };
    return {
      success: true,
      user: data.data,
    };
  } catch (error) {
    console.error('Error getting Twitter user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};
