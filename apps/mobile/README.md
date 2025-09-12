# SquidboxSocial - Expo React Native App

SquidboxSocial is an Expo React Native application that automates social media posts on X (Twitter) and Bluesky. The app allows users to create posts with photos and videos, providing a streamlined interface for managing multiple social media accounts.

## Features

- **Multi-Platform Support**: Connect to Twitter, Bluesky, OnlyFans, and JFF
- **OAuth2 Authentication**: Secure token storage with backend synchronization
- **Media Support**: Upload photos and videos to your posts
- **Cross-Platform Posting**: Post to multiple platforms simultaneously
- **Modern UI**: Built with React Native Elements and Expo Router

## Authentication Setup

To use the Twitter authentication feature, you'll need to set up OAuth2 credentials:

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Backend Configuration
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000

# Development Configuration (optional)
EXPO_PUBLIC_DEV_USER_EMAIL=dev@example.com
EXPO_PUBLIC_DEV_USER_PASSWORD=devpassword123

# Twitter OAuth 2.0 Configuration
EXPO_PUBLIC_TWITTER_CLIENT_ID=your_twitter_client_id_here
EXPO_PUBLIC_TWITTER_CLIENT_SECRET=your_twitter_client_secret_here
EXPO_PUBLIC_TWITTER_CALLBACK_URL=squidboxsocial://auth
```

#### Development Features

When running in development mode (`__DEV__`), you can use these optional environment variables to prefill the login form:

- `EXPO_PUBLIC_DEV_USER_EMAIL` - Email for the development user
- `EXPO_PUBLIC_DEV_USER_PASSWORD` - Password for the development user

If both variables are present, the login form will be automatically prefilled with these credentials, making development faster and easier.

### Twitter App Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app or use an existing one
3. Enable OAuth 2.0 and set the callback URL to `squidboxsocial://auth`
4. Copy the Client ID and Client Secret to your `.env` file

## Tech Stack

- **Framework**: Expo React Native with TypeScript
- **Navigation**: Expo Router (file-based routing)
- **UI Components**: React Native Elements
- **Authentication**: Expo Auth Session with OAuth2
- **Storage**: Expo Secure Store for token management

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
