# PTC Coin - Virtual Mining App

![PTC Coin Logo](./generated-icon.png)

A Progressive Web App (PWA) for virtual coin mining that allows users to earn PTC coins over time.

## Features

- 🪙 **Virtual Mining**: Mine 0.1 PTC per 24-hour session
- 🔌 **Offline Support**: Mining continues even when the app is closed
- 👥 **Referral System**: Each referral gives a permanent 0.1x mining speed boost (up to 2.0x total)
- 📱 **Ad Boost**: Watch ads to get 5x mining speed for 2 hours (stackable up to 24 hours)
- 🔔 **Push Notifications**: Get notified when mining sessions complete
- 📊 **Mining History**: View all your past mining sessions
- 🔒 **Google Authentication**: Secure login with Firebase
- 📱 **Mobile-First Design**: Optimized for mobile devices
- 🌐 **PWA Compatible**: Installable on any device with a modern browser

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Shadcn/UI
- **Backend**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Firestore
- **Hosting**: Netlify-compatible
- **Mobile**: PWA with Android app conversion using PWA Builder

## Setup Instructions

### Prerequisites

- Node.js v18 or later
- Firebase account
- PostgreSQL database (Neon or local)

### Environment Variables

The following environment variables need to be set:

```
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Firebase
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/ptc-coin.git
   cd ptc-coin
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up the database
   ```
   npm run db:push
   ```

4. Run the development server
   ```
   npm run dev
   ```

5. Open the application at http://localhost:3000

## Deployment

### Netlify Deployment

This app is configured for easy deployment on Netlify:

1. Connect your GitHub repository to Netlify
2. Set the build command to `npm run build`
3. Set the publish directory to `dist`
4. Add all required environment variables in Netlify's dashboard

### Android App Conversion

To convert the PWA to an Android app:

1. Deploy the app to a live URL
2. Use [PWA Builder](https://www.pwabuilder.com/) to convert the PWA to an Android app
3. Package the app using the generated APK/AAB files

## License

MIT

## Author

[Your Name]