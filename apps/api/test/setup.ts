import { beforeEach, afterEach, afterAll, vi } from 'vitest';
import { setupHttpInterceptor, clearBlockedCalls, clearAllowedDomains } from './http-interceptor';
import { setupTestDatabase, cleanupTestDatabase, cleanupTemplateDatabase } from './database-setup';

// Catch unmocked external API calls
setupHttpInterceptor();

beforeEach(async () => {
  // One database per test
  await setupTestDatabase();
});

afterEach(async () => {
  await cleanupTestDatabase();
  
  // Clear all mocks between tests to ensure clean state
  vi.clearAllMocks();
  
  // Clear blocked calls history from the http interceptor
  clearBlockedCalls();
  
  // Clear allowed domains to prevent cross-test contamination
  clearAllowedDomains();
});

afterAll(async () => {
  await cleanupTemplateDatabase();
});