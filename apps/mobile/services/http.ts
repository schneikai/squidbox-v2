type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type RequestOptions = Readonly<{
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: string | FormData;
}>;

export type ApiResponse<T = unknown> = Readonly<{
  data: T;
  status: number;
  statusText: string;
}>;

export type ApiError = Readonly<{
  message: string;
  status?: number;
  statusText?: string;
}>;

// Configuration
const getDefaultHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
});

// Core request function
const makeRequest = async <T = unknown>(
  url: string,
  options: RequestOptions,
): Promise<ApiResponse<T>> => {
  const headers = {
    ...getDefaultHeaders(),
    ...options.headers,
  };

  const config: RequestInit = {
    method: options.method,
    headers,
  };

  if (options.body && options.method !== 'GET') {
    config.body = options.body;
  }

  try {
    const response = await fetch(url, config);

    let data: T;
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = (await response.text()) as T;
    }

    if (!response.ok) {
      const error: ApiError = {
        message:
          data && typeof data === 'object' && 'message' in data
            ? (data as { message: string }).message
            : `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        statusText: response.statusText,
      };
      throw error;
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'message' in error) {
      throw error as ApiError;
    }

    throw {
      message: error instanceof Error ? error.message : 'Network error occurred',
    } as ApiError;
  }
};

// HTTP method functions
export const httpGet = async <T = unknown>(
  url: string,
  headers?: Record<string, string>,
): Promise<ApiResponse<T>> => {
  return makeRequest<T>(url, {
    method: 'GET',
    headers,
  });
};

export const httpPost = async <T = unknown>(
  url: string,
  data?: unknown,
  headers?: Record<string, string>,
): Promise<ApiResponse<T>> => {
  return makeRequest<T>(url, {
    method: 'POST',
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
};

export const httpPut = async <T = unknown>(
  url: string,
  data?: unknown,
  headers?: Record<string, string>,
): Promise<ApiResponse<T>> => {
  return makeRequest<T>(url, {
    method: 'PUT',
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
};

export const httpDelete = async <T = unknown>(
  url: string,
  headers?: Record<string, string>,
): Promise<ApiResponse<T>> => {
  return makeRequest<T>(url, {
    method: 'DELETE',
    headers,
  });
};

export const httpPatch = async <T = unknown>(
  url: string,
  data?: unknown,
  headers?: Record<string, string>,
): Promise<ApiResponse<T>> => {
  return makeRequest<T>(url, {
    method: 'PATCH',
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
};
