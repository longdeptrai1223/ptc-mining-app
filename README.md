# PTC Coin - Virtual Coin Mining PWA

PTC (Push-To-Click) Coin is a Progressive Web App that simulates coin mining through user engagement. Users can earn virtual coins by clicking a mining button, watching rewarded ads, and inviting friends.

## Key Features

- **Virtual Coin Mining**: Earn 0.1 PTC every 24 hours by clicking "Mine"
- **Rewarded Ad Buffs**: Watch ads to get 5x mining speed for 2 hours (stackable up to 24 hours)
- **Referral System**: Invite friends for permanent mining boosts (up to 2.0x)
- **Offline Mining**: Continue mining even when offline
- **Background Sync**: Automatically syncs data when back online
- **Push Notifications**: Get notified when mining completes
- **PWA Compatible**: Install as a native-like app on any device
- **Mobile-First Design**: Optimized for mobile experience
- **Dark Mode Support**: Comfortable viewing in any lighting condition

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Authentication (Google Sign-In)
- **Storage**: Firebase Firestore
- **Notifications**: Firebase Cloud Messaging
- **Monetization**: Google AdMob
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Firebase project with Authentication enabled
- AdMob account (optional, for monetization)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/ptc-coin.git
   cd ptc-coin
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` and fill in your credentials:
   ```
   cp .env.example .env
   ```

4. Push the database schema:
   ```
   npm run db:push
   ```

5. Start the development server:
   ```
   npm run dev
   ```

## Firebase Configuration

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Google Authentication in the Authentication section
3. Add your development and production domains to the authorized domains list
4. Create a web app in your Firebase project and copy the configuration details to your `.env` file

## Deployment

### Netlify Deployment

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add your environment variables in the Netlify console
5. Deploy!

### Android App Conversion

1. After deploying to Netlify, use PWA Builder to convert to Android app
2. Follow the PWA Builder instructions to create an APK/AAB file
3. Upload to Google Play Console

## License

[MIT License](LICENSE)

## Privacy Policy

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

## Terms of Service

See [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md)