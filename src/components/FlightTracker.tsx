'use client';

import { Flight, FlightPosition } from '@/types/flight';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface FlightTrackerProps {
  flight: Flight;
  showRoute?: boolean;
  onPositionUpdate?: (position: FlightPosition) => void;
  className?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export const FlightTracker = React.forwardRef<any, FlightTrackerProps>(({
  flight,
  showRoute = true,
  onPositionUpdate,
  className = '',
}, ref) => {
  const [currentPosition, setCurrentPosition] = useState<FlightPosition | null>(
    flight.currentPosition || null
  );
  const [isTracking, setIsTracking] = useState(true);
  const [showRouteState, setShowRouteState] = useState(showRoute);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/light-v11');
  const mapRef = useRef<any>(null);

  // Handle position updates
  const handlePositionUpdate = useCallback((position: FlightPosition) => {
    setCurrentPosition(position);
    onPositionUpdate?.(position);
  }, [onPositionUpdate]);

  // Get map bounds to show origin, destination, and current position
  const getMapBounds = useCallback(() => {
    const coordinates = [
      [flight.origin.longitude, flight.origin.latitude],
      [flight.destination.longitude, flight.destination.latitude],
    ];

    if (currentPosition) {
      coordinates.push([currentPosition.longitude, currentPosition.latitude]);
    }

    // Calculate bounds
    const lons = coordinates.map(coord => coord[0]);
    const lats = coordinates.map(coord => coord[1]);
    
    const bounds: [number, number, number, number] = [
      Math.min(...lons), // west
      Math.min(...lats), // south
      Math.max(...lons), // east
      Math.max(...lats), // north
    ];

    return bounds;
  }, [flight.origin, flight.destination, currentPosition]);

  // Update map view when bounds change
  useEffect(() => {
    if (mapRef.current && currentPosition) {
      const bounds = getMapBounds();
      mapRef.current.fitBounds(bounds, {
        padding: 60,
        duration: 1000,
      });
    }
  }, [getMapBounds, currentPosition]);

  // Route line data
  const routeData = showRouteState && flight.route?.points ? {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: flight.route.points.map((point: [number, number]) => [point[1], point[0]]),
    },
    properties: {},
  } : null;

  // Current path to destination
  const currentPathData = currentPosition ? {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [currentPosition.longitude, currentPosition.latitude],
        [flight.destination.longitude, flight.destination.latitude],
      ],
    },
    properties: {},
  } : null;

  // Demo markers (not actual map markers, just for show)
  const AircraftDemo = () => {
    if (!currentPosition) return null;
    return null; // We'll show this in the demo interface
  };

  const OriginDemo = () => null;
  const DestinationDemo = () => null;

  // Create a simple demo map without Mapbox for now
  return (
    <div className={`relative ${className} bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg overflow-hidden`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">✈️</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Flight Tracking Demo</h3>
          <p className="text-gray-600 mb-4">Real-time flight tracking map</p>
          
          {/* Demo flight info */}
          <div className="bg-white rounded-lg p-4 shadow-lg max-w-sm mx-auto">
            <div className="text-sm font-medium text-gray-900 mb-2">Live Position</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <span className="text-gray-500">Flight:</span>
                <span className="ml-1 font-medium">{flight.flightNumber}</span>
              </div>
              <div>
                <span className="text-gray-500">Route:</span>
                <span className="ml-1 font-medium">{flight.origin.code} → {flight.destination.code}</span>
              </div>
              {currentPosition && (
                <>
                  <div>
                    <span className="text-gray-500">Altitude:</span>
                    <span className="ml-1 font-medium">
                      {Math.round(currentPosition.altitude * 0.3048)}m
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Speed:</span>
                    <span className="ml-1 font-medium">
                      {Math.round(currentPosition.speed * 1.852)} km/h
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Heading:</span>
                    <span className="ml-1 font-medium">
                      {Math.round(currentPosition.heading)}°
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-1 font-medium text-green-600">Tracking</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {/* Tracking toggle */}
        <button
          onClick={() => setIsTracking(!isTracking)}
          className={`p-2 rounded-lg shadow-lg border-2 border-white transition-all ${
            isTracking 
              ? 'bg-blue-500 text-white' 
              : 'bg-white text-gray-700'
          }`}
          title={isTracking ? 'Stop tracking' : 'Start tracking'}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
          </svg>
        </button>

        {/* Route toggle */}
        <button
          onClick={() => setShowRouteState(!showRouteState)}
          className={`p-2 rounded-lg shadow-lg border-2 border-white transition-all ${
            showRouteState 
              ? 'bg-blue-500 text-white' 
              : 'bg-white text-gray-700'
          }`}
          title={showRouteState ? 'Hide route' : 'Show route'}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z"/>
          </svg>
        </button>

        {/* Map style toggle */}
        <button
          onClick={() => {
            setMapStyle(prev => 
              prev === 'mapbox://styles/mapbox/light-v11'
                ? 'mapbox://styles/mapbox/dark-v11'
                : 'mapbox://styles/mapbox/light-v11'
            );
          }}
          className="p-2 rounded-lg shadow-lg border-2 border-white bg-white text-gray-700 transition-all"
          title="Toggle map style"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
          </svg>
        </button>
      </div>

      {/* Real-time info overlay */}
      {currentPosition && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-white/20">
          <div className="text-sm font-medium text-gray-900 mb-2">Live Position</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-gray-500">Altitude:</span>
              <span className="ml-1 font-medium">
                {Math.round(currentPosition.altitude * 0.3048)}m
              </span>
            </div>
            <div>
              <span className="text-gray-500">Speed:</span>
              <span className="ml-1 font-medium">
                {Math.round(currentPosition.speed * 1.852)} km/h
              </span>
            </div>
            <div>
              <span className="text-gray-500">Heading:</span>
              <span className="ml-1 font-medium">
                {Math.round(currentPosition.heading)}°
              </span>
            </div>
            <div>
              <span className="text-gray-500">Updated:</span>
              <span className="ml-1 font-medium">
                {new Date(currentPosition.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

FlightTracker.displayName = 'FlightTracker';

export default FlightTracker;
