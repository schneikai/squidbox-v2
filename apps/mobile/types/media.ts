export type MediaType = 'image' | 'video';

export type MediaItem = Readonly<{
  id: string;
  uri: string;
  type: MediaType;
}>;

export type MediaList = readonly MediaItem[];
