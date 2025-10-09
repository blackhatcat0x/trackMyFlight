# TrackMyFlight - Mobile Flight Tracking App

A comprehensive React Native flight tracking application built with Expo and TypeScript, featuring real-time flight data from multiple sources.

## Features

- **Real-time Flight Tracking**: Track flights worldwide with live position updates
- **Multi-source API Architecture**: Integrates AviationStack, ADSB Exchange, and OpenSky Network
- **Search Functionality**: Search flights by number, route, or airport
- **Flight Details**: Comprehensive flight information including aircraft, status, and timing
- **Responsive Design**: Optimized for mobile devices with React Native
- **Offline Support**: Caching and error handling for poor connectivity
- **Dark/Light Theme**: Automatic theme detection

## Installation

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your API keys
   \`\`\`

3. Start the development server:
   \`\`\`bash
   npm start
   \`\`\`

## API Configuration

### AviationStack API
- Sign up at [aviationstack.com](https://aviationstack.com/)
- Get your free API key
- Add to .env file

### ADSB Exchange API
- Register at [adsbexchange.com](https://www.adsbexchange.com/)
- API key required for enhanced features
- Add to .env file

## Available Scripts
- \`npm start\` - Start Expo development server
- \`npm run android\` - Run on Android device/emulator
- \`npm run ios\` - Run on iOS device/simulator
- \`npm run web\` - Run in web browser

## License
MIT License
