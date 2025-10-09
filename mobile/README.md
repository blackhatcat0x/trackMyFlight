TrackMyFlight 

A modern, ad-free flight tracking application built with React Native and Expo. Track flights in real-time, receive alerts, and explore aviation with a beautiful, intuitive interface. 
Features 
Core Functionality 

     Real-time Flight Tracking: Live aircraft positions on interactive maps
     Flight Search: Search by flight number, route, or airline with autocomplete
     Push Notifications: Custom alerts for departures, arrivals, delays, and gate changes
     Share & Collaborate: Share live flight tracking links with family and friends
     Weather Overlays: Real-time weather data on flight maps
     AR Mode: Identify planes overhead using your device camera (Phase 2)
     

User Experience 

     Ad-Free: Clean, uninterrupted experience
     Privacy First: No mandatory accounts, minimal data collection
     Offline Support: Cached data for recently viewed flights
     Accessibility: Voice commands, screen reader support, high contrast themes
     Cross-Platform: Single codebase for iOS and Android
     

Technology Stack 
Frontend 

     React Native with Expo for cross-platform development
     TypeScript for type safety
     Expo Router for navigation
     Mapbox SDK for interactive maps
     Zustand for state management
     TanStack Query for server state
     

APIs & Services 

     ADSBExchange + Airplanes.live: Real-time flight positions (completely free, multi-source)
     AviationStack: Flight schedules, airlines, airports (free tier)
     Open-Meteo: Weather information (completely free, no API key)
     Expo Notifications: Push notifications
     Mapbox: Mapping and geospatial services
     

Development Tools 

     EAS Build: Automated iOS and Android builds
     TypeScript: Static type checking
     ESLint: Code quality and consistency
     

Getting Started 
Prerequisites 

     Node.js 18+ 
     Expo CLI (npm install -g @expo/cli)
     iOS: Xcode 14+ (for iOS development)
     Android: Android Studio with Android SDK (for Android development)
     

Installation 

     

    Clone the repository 

    git clone <repository-url>
cd trackmyflight


Install dependencies
cd mobile
npm install


Set up environment variables
cp .env.example .env

Edit .env and add your API keys:
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
EXPO_PUBLIC_AVIATIONSTACK_API_KEY=your_aviationstack_key


Note: ADSBExchange and Open-Meteo are completely free - no API keys required! 
 

Start the development server 
npm start


Run on device/simulator
# iOS
npm run ios

# Android
npm run android

# Web (limited functionality)
npm run web

API Setup 
Required APIs 

     

    Mapbox (Primary API key needed) 
         Sign up at mapbox.com 
         Create a new access token
         Add to EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
         
     

    AviationStack (Free tier available) 
         Sign up at aviationstack.com 
         Get your API key instantly (no verification required)
         Add to EXPO_PUBLIC_AVIATIONSTACK_API_KEY
         
     

Free APIs (No setup required) 

     

    ADSBExchange + Airplanes.live - Real-time Flight Positions 
         Multiple free, open-source flight tracking sources
         No API keys required
         Community-collected ADS-B data from different networks
         Automatic failover between sources
         Real-time aircraft positions with redundancy
         
     

    Open-Meteo - Weather Data 
         Completely free weather API
         No API key required
         Global weather coverage
         Aviation-specific weather parameters
         
     

Optional APIs 

     FlightAero: Additional flight data source
     PostHog: Analytics and usage tracking
     Stripe: Premium subscription payments
     

Building for Production 
EAS Build Setup 

     

    Install EAS CLI 

npm install -g eas-cli


Login to Expo
eas login


Configure project
eas build:configure


Build for iOS
eas build -p ios --profile production


Build for Android
eas build -p android --profile production


App Store Submission 

     

    iOS App Store 

    eas submit -p ios


Google Play Store
eas submit -p android

Development Workflow 
Code Quality 

# Run ESLint
npm run lint

# Type checking
npm run type-check



Testing
# Run tests (when implemented)
npm test


Development Builds
# Create development build
eas build -p ios --profile development
eas build -p android --profile development



Project Structure
mobile/
├── src/
│   ├── app/                 # Expo Router pages
│   │   ├── (tabs)/         # Tab navigation screens
│   │   ├── flight/         # Flight detail screens
│   │   └── _layout.tsx     # Root layout
│   ├── components/         # Reusable UI components
│   ├── services/          # API services
│   ├── store/             # State management
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── hooks/             # Custom React hooks
├── assets/                # Images, fonts, icons
├── app.json              # Expo configuration
├── eas.json              # EAS build configuration
└── package.json          # Dependencies and scripts



Configuration 
App Configuration (app.json) 

     App name, version, and identifiers
     Permissions (location, camera, notifications)
     Icons and splash screen
     Build settings
     

EAS Configuration (eas.json) 

     Build profiles for different environments
     Store submission settings
     Signing and certificate management
     

Features Implementation Status 
✅ Completed 

     Real-time flight tracking with Mapbox
     Flight search with autocomplete
     Flight status display
     Push notifications for alerts
     State management with Zustand
     Cross-platform navigation
     Settings and preferences
     Offline data caching
     

🚧 In Progress 

     Weather overlays on maps
     Share functionality for live tracking
     Calendar integration
     Premium features
     

📋 Planned (Phase 2) 

     AR plane identification
     Historical flight data
     Advanced analytics
     Calendar sync
     SMS/email alerts
     

Troubleshooting 
Common Issues 

     

    Metro bundler issues 

npx expo start --clear

     

    Location permissions 
         Ensure location permissions are granted in device settings
         Check that API keys are correctly configured
         
     

    Map rendering issues 
         Verify Mapbox token is valid
         Check network connectivity
         
     

    Build failures 
         Ensure all environment variables are set
         Check EAS configuration
         Verify API keys and certificates
         
     

Debug Mode 

Enable debug mode by setting: 
EXPO_PUBLIC_DEV_MODE=true


Contributing 

     Fork the repository
     Create a feature branch
     Make your changes
     Add tests if applicable
     Submit a pull request
     

License 

This project is licensed under the MIT License - see the LICENSE file for details. 
Support 

For support and questions: 

     Email: support@trackmyflight.app 
     Documentation: trackmyflight.app/docs 
     Issues: GitHub Issues 
     

Acknowledgments 

     ADSBExchange for free, open-source real-time flight positions
     Airplanes.live for additional ADS-B data source and redundancy
     AviationStack for flight schedules, airlines, and airport data
     Open-Meteo for free weather data
     Mapbox for mapping services
     Expo for the development platform
     


     












