import './setup';
import { describe, it, expect, afterEach } from 'vitest';
import {getBlockedCalls } from './http-interceptor';
import nock from 'nock';
import { getTwitterUser } from '@squidbox/twitter-api';

describe('HTTP Interceptor', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should block unmocked external API calls', async () => {
    // This should throw an error because we're making an unmocked external call
    try {
      await fetch('https://api.twitter.com/2/users/me');
      expect.fail('Expected fetch to throw an error');
    } catch (error: any) {
      expect(error.message).toContain('🚫 UNMOCKED EXTERNAL API CALL BLOCKED');
    }
    
    // Check that the call was tracked
    const blockedCalls = getBlockedCalls();
    expect(blockedCalls).toHaveLength(1);
    expect(blockedCalls[0]?.url).toBe('https://api.twitter.com/2/users/me');
  });

  it('should allow mocked API calls', async () => {
    // Allow the domain for this test first
    const { allowDomain } = await import('./http-interceptor');
    allowDomain('api.twitter.com');

    // Simple nock mock for Twitter API
    nock('https://api.twitter.com')
      .get('/2/users/me')
      .query({ 'user.fields': 'id,username,name,profile_image_url,public_metrics' })
      .reply(200, {
        data: {
          id: '123456789',
          username: 'testuser',
          name: 'Test User'
        }
      });

    // This should work because we mocked it
    const response = await fetch('https://api.twitter.com/2/users/me?user.fields=id,username,name,profile_image_url,public_metrics');
    const data = await response.json() as any;
    
    expect(response.ok).toBe(true);
    expect(data.data.username).toBe('testuser');
  });

  it('should block localhost calls and suggest supertest', async () => {
    try {
      await fetch('http://localhost:3000/api/test');
      expect.fail('Expected fetch to throw an error');
    } catch (error: any) {
      expect(error.message).toContain('Unmocked localhost request');
    }
  });

  it('should provide helpful error messages', async () => {
    try {
      await fetch('https://api.example.com/data');
    } catch (error: any) {
      expect(error.message).toContain('🚫 UNMOCKED EXTERNAL API CALL BLOCKED');
      expect(error.message).toContain('https://api.example.com/data');
      expect(error.message).toContain('nock(');
      expect(error.message).toContain('vi.mock()');
    }
  });

  it('should block Twitter API package calls when unmocked', async () => {
    // This should throw an error because we're using the real Twitter API package
    // without mocking the underlying HTTP calls
    try {
      await getTwitterUser('fake_access_token');
      expect.fail('Expected Twitter API call to be blocked');
    } catch (error: any) {
      // The interceptor should block this call
      expect(error.message).toContain('🚫 UNMOCKED EXTERNAL API CALL BLOCKED');
      expect(error.message).toContain('api.twitter.com');
    }
  });

  it('should allow Twitter API package calls when mocked', async () => {
    // Allow the domain for this test
    const { allowDomain } = await import('./http-interceptor');
    allowDomain('api.twitter.com');

    // Mock the Twitter API call that getTwitterUser makes
    nock('https://api.twitter.com')
      .get('/2/users/me')
      .query({ 'user.fields': 'id,username,name,profile_image_url,public_metrics' })
      .reply(200, {
        data: {
          id: '123456789',
          username: 'testuser',
          name: 'Test User',
          profile_image_url: 'https://example.com/avatar.jpg',
          public_metrics: {
            followers_count: 100,
            following_count: 50,
            tweet_count: 200
          }
        }
      });

    // This should work because we mocked the underlying HTTP call
    const user = await getTwitterUser('fake_access_token');
    expect(user.username).toBe('testuser');
    expect(user.id).toBe('123456789');
  });
});
