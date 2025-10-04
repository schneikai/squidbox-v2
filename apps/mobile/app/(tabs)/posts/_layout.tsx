import { Stack } from 'expo-router';
import React from 'react';

export default function PostsLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Posts',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="[postId]" 
        options={{ 
          title: 'Post Details',
          headerShown: true 
        }} 
      />
    </Stack>
  );
}
