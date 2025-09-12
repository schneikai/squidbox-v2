import type { Platform } from '@/contexts/PlatformContext';
import type { MediaItem } from '@/types/media';

export type Post = Readonly<{
  text: string;
  media: readonly MediaItem[];
}>;

export type PostList = readonly Post[];

export type PlatformComposerData = Readonly<{
  platformPosts: readonly PlatformPosts[];
}>;

export type PlatformPosts = Readonly<{
  platforms: readonly Platform[];
  posts: PostList;
}>;
