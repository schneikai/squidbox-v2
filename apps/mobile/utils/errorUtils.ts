/**
 * Extracts a user-friendly error message from any error type
 */
export const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: string }).message;

    // Convert common HTTP error messages to user-friendly ones
    if (message.includes('HTTP 401')) {
      return 'Authentication failed. Please log in again.';
    }
    if (message.includes('HTTP 403')) {
      return "Access denied. You don't have permission to perform this action.";
    }
    if (message.includes('HTTP 404')) {
      return 'The requested resource was not found.';
    }
    if (message.includes('HTTP 429')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (message.includes('HTTP 500')) {
      return 'Server error. Please try again later.';
    }
    if (
      message.includes('HTTP 502') ||
      message.includes('HTTP 503') ||
      message.includes('HTTP 504')
    ) {
      return 'Service temporarily unavailable. Please try again later.';
    }
    if (message.includes('Network error') || message.includes('fetch')) {
      return 'Network connection failed. Please check your internet connection.';
    }
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    return message;
  }
  return 'Unknown error';
};
