#!/bin/bash

# TrackMyFlight Build Script
# This script automates the build process for iOS and Android

set -e

echo "🛫 TrackMyFlight Build Script"
echo "================================"

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if logged in to Expo
if ! eas whoami &> /dev/null; then
    echo "🔐 Please log in to Expo:"
    eas login
fi

# Function to build for a platform
build_platform() {
    local platform=$1
    local profile=$2
    
    echo ""
    echo "🏗️  Building for $platform (profile: $profile)..."
    echo "----------------------------------------"
    
    eas build -p $platform --profile $profile
    
    if [ $? -eq 0 ]; then
        echo "✅ $platform build completed successfully!"
    else
        echo "❌ $platform build failed!"
        exit 1
    fi
}

# Function to submit to app store
submit_platform() {
    local platform=$1
    
    echo ""
    echo "📤 Submitting to $platform store..."
    echo "-----------------------------------"
    
    eas submit -p $platform
    
    if [ $? -eq 0 ]; then
        echo "✅ $platform submission completed successfully!"
    else
        echo "❌ $platform submission failed!"
        exit 1
    fi
}

# Parse command line arguments
PLATFORM=""
PROFILE="production"
SUBMIT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        --submit)
            SUBMIT=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --platform PLATFORM    Build platform (ios, android, or all)"
            echo "  --profile PROFILE       Build profile (development, preview, or production)"
            echo "  --submit               Submit to app store after build"
            echo "  --help                 Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --platform ios --profile production"
            echo "  $0 --platform all --profile production --submit"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate environment variables
if [ -z "$EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN" ]; then
    echo "⚠️  Warning: EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN not set"
fi

if [ -z "$EXPO_PUBLIC_FLIGHTAWARE_API_KEY" ]; then
    echo "⚠️  Warning: EXPO_PUBLIC_FLIGHTAWARE_API_KEY not set"
fi

# Run linting
echo ""
echo "🔍 Running code quality checks..."
echo "--------------------------------"
npm run lint

if [ $? -ne 0 ]; then
    echo "❌ Linting failed! Please fix issues before building."
    exit 1
fi

# Run type checking
echo ""
echo "🔍 Running type checks..."
echo "-------------------------"
npm run type-check

if [ $? -ne 0 ]; then
    echo "❌ Type checking failed! Please fix issues before building."
    exit 1
fi

# Build based on platform
case $PLATFORM in
    ios)
        build_platform "ios" "$PROFILE"
        if [ "$SUBMIT" = true ]; then
            submit_platform "ios"
        fi
        ;;
    android)
        build_platform "android" "$PROFILE"
        if [ "$SUBMIT" = true ]; then
            submit_platform "android"
        fi
        ;;
    all|"")
        echo "🏗️  Building for all platforms..."
        build_platform "ios" "$PROFILE"
        build_platform "android" "$PROFILE"
        
        if [ "$SUBMIT" = true ]; then
            submit_platform "ios"
            submit_platform "android"
        fi
        ;;
    *)
        echo "❌ Invalid platform: $PLATFORM"
        echo "Valid platforms: ios, android, all"
        exit 1
        ;;
esac

echo ""
echo "🎉 Build process completed successfully!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Test the builds on your devices"
echo "2. If everything looks good, submit to app stores"
echo "3. Monitor the review process"
echo "4. Release to users once approved"
echo ""
echo "For support, visit: https://trackmyflight.app/support"