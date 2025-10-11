# Mapbox Setup for TrackMyFlight

This document explains how to set up Mapbox for the live flight tracking map feature.

## Prerequisites

You'll need a Mapbox account to get an access token. Sign up at [https://mapbox.com](https://mapbox.com).

## Setup Steps

### 1. Get Your Mapbox Access Token

1. Go to [https://mapbox.com/account/](https://mapbox.com/account/)
2. Create a free account if you don't have one
3. Navigate to your account dashboard
4. Find your "Default public token" under the "Tokens" section
5. Copy the token (it starts with `pk.`)

### 2. Add Environment Variables

Create or update your `.env` file in the project root:

```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

**Important:** The token must start with `NEXT_PUBLIC_` to be available in the browser.

### 3. Install Dependencies (if not already installed)

```bash
npm install mapbox-gl react-map-gl
```

### 4. Restart Development Server

After adding the environment variable, restart your development server:

```bash
npm run dev
```

## Features

The Mapbox integration provides:

- **Live Aircraft Position**: Real-time aircraft position on the map
- **Route Visualization**: Shows the flight path from origin to destination
- **Interactive Controls**: Zoom, pan, and style toggles
- **Aircraft Marker**: Custom airplane icon that rotates based on heading
- **Real-time Updates**: Position updates every 5 seconds from Airplanes.live API

## Usage

The flight tracking map will automatically appear on flight detail pages when:

1. A flight has current position data
2. Mapbox token is configured
3. The flight is being tracked (auto-starts after 2 seconds)

## Troubleshooting

### Map Not Loading

- Check that your Mapbox token is correctly set in `.env`
- Ensure the token starts with `pk.` (public token)
- Restart the development server after adding the token
- Check browser console for any error messages

### "Mapbox Token Required" Message

This appears when:
- No token is found in environment variables
- The token is invalid or expired
- The token doesn't have the required permissions

### Rate Limiting

Mapbox free tier includes:
- 50,000 map loads per month
- 100,000 tile requests per month

If you exceed these limits, you may need to upgrade your plan.

## Alternative Map Providers

If you prefer not to use Mapbox, the application will show a demo view with flight information when no Mapbox token is configured.

## Security Notes

- Never commit your Mapbox token to version control
- Use environment variables for all sensitive data
- Consider using different tokens for development and production
- Regular token rotation is recommended for production applications
