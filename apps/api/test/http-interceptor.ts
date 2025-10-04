import { vi } from 'vitest';
import nock from 'nock';

/**
 * HTTP Call Interceptor for Tests
 * 
 * This module provides centralized HTTP call interception to ensure
 * all external API calls are properly mocked in tests.
 */

// Track allowed domains for debugging
const allowedDomains = new Set<string>();
const blockedCalls: Array<{ url: string; method: string; timestamp: Date }> = [];

// Store original fetch
let originalFetch: typeof global.fetch;

/**
 * Initialize HTTP call interception
 * Call this in your test setup to block unmocked external API calls
 */
export function setupHttpInterceptor() {
  // Clear previous state
  allowedDomains.clear();
  blockedCalls.length = 0;

  // Store original fetch if not already stored
  if (!originalFetch) {
    originalFetch = global.fetch;
  }

  // Global fetch mock
  global.fetch = vi.fn().mockImplementation((url: string | URL, options?: RequestInit) => {
    const urlString = url.toString();
    const urlObj = new URL(urlString);
    const domain = urlObj.hostname;
    const method = options?.method || 'GET';
    
    
    // Allow localhost and internal URLs (for your API tests)
    if (isLocalhost(domain)) {
      return Promise.reject(new Error(
        `Unmocked localhost request: ${urlString}\n` +
        `Use supertest for testing your own API endpoints instead of fetch.`
      ));
    }
    
    // Check if this domain is explicitly allowed (e.g., by nock)
    if (allowedDomains.has(domain)) {
      // Let nock handle the request if it's allowed
      // Use the original fetch so nock can intercept
      return originalFetch(url, options);
    }
    
    // Block external API calls
    const error = new Error(
      `🚫 UNMOCKED EXTERNAL API CALL BLOCKED\n` +
      `URL: ${urlString}\n` +
      `Method: ${method}\n` +
      `Domain: ${domain}\n\n` +
      `This test is trying to make a real HTTP request to an external service.\n` +
      `Please mock this API call using one of these methods:\n` +
      `1. vi.mock() for the module making the call\n` +
      `2. nock() for HTTP request interception\n` +
      `3. Add the domain to allowedDomains if it's a test dependency\n\n` +
      `Example:\n` +
      `nock('${urlObj.origin}')\n` +
      `  .${method.toLowerCase()}('${urlObj.pathname}${urlObj.search}')\n` +
      `  .reply(200, { mock: 'response' });`
    );
    
    // Track blocked calls for debugging
    blockedCalls.push({ url: urlString, method, timestamp: new Date() });
    
    throw error;
  });

  // Mock Node.js http/https modules as fallback
  vi.mock('node:http', () => ({
    request: vi.fn().mockImplementation((options: any, callback?: any) => {
      const url = `http://${options.hostname}:${options.port}${options.path}`;
      throw new Error(`🚫 UNMOCKED HTTP REQUEST BLOCKED: ${url}\nUse nock or vi.mock() to mock this request.`);
    })
  }));

  vi.mock('node:https', () => ({
    request: vi.fn().mockImplementation((options: any, callback?: any) => {
      const url = `https://${options.hostname}:${options.port}${options.path}`;
      throw new Error(`🚫 UNMOCKED HTTPS REQUEST BLOCKED: ${url}\nUse nock or vi.mock() to mock this request.`);
    })
  }));
}

/**
 * Allow a domain for HTTP requests (useful for test dependencies)
 */
export function allowDomain(domain: string) {
  allowedDomains.add(domain);
}

/**
 * Get statistics about blocked calls
 */
export function getBlockedCalls() {
  return [...blockedCalls];
}

/**
 * Clear blocked calls history
 */
export function clearBlockedCalls() {
  blockedCalls.length = 0;
}

export function clearAllowedDomains() {
  allowedDomains.clear();
}

/**
 * Check if a domain is localhost
 */
function isLocalhost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.')
  );
}

/**
 * Enhanced nock setup that automatically allows domains
 * This is a utility function for advanced usage
 */
export function setupNockWithInterceptor() {
  // Simple wrapper that allows domains when nock is used
  return (domain: string) => {
    allowDomain(domain);
    return nock(domain);
  };
}
