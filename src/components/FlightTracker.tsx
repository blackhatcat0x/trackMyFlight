'use client';

import { Flight, FlightPosition } from '@/types/flight';
import React, { useEffect, useRef, useState } from 'react';

interface FlightTrackerProps {
  flight: Flight;
  currentPosition: FlightPosition | null;
  interpolatedPosition: FlightPosition | null;
  isTracking: boolean;
  isSimulated?: boolean; // Added
  onTrackingChange: (tracking: boolean) => void;
  showRoute?: boolean;
  className?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export const FlightTracker: React.FC<FlightTrackerProps> = ({
  flight,
  currentPosition,
  interpolatedPosition,
  isTracking,
  isSimulated = false, // Added
  onTrackingChange,
  showRoute = true,
  className = '',
}) => {
  const [showRouteState, setShowRouteState] = useState(showRoute);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const planeOverlayRef = useRef<HTMLDivElement>(null);

  // Use interpolated position for display
  const displayPosition = interpolatedPosition || currentPosition;


    // Fetch Mapbox token - try local env first, then API for Heroku
  useEffect(() => {
    const localToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    
    if (localToken) {
      console.log('✅ Using local Mapbox token');
      setMapboxToken(localToken);
      return;
    }

    console.log('⚠️ No local token, fetching from API...');
    fetch('/api/mapbox-token')
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          console.log('✅ Using API Mapbox token');
          setMapboxToken(data.token);
        } else {
          throw new Error('Mapbox token not configured on server');
        }
      })
      .catch(err => {
        console.error('Failed to fetch Mapbox token:', err);
        setMapError('Failed to load Mapbox token. Check server configuration.');
      });
  }, []);

  // Log initial state
  useEffect(() => {
    console.log('🛫 FlightTracker initialized');
    console.log('Flight:', flight.flightNumber);
    console.log('Has current position:', !!currentPosition);
    console.log('Origin:', flight.origin.code, `(${flight.origin.latitude}, ${flight.origin.longitude})`);
    console.log('Destination:', flight.destination.code, `(${flight.destination.latitude}, ${flight.destination.longitude})`);
    if (currentPosition) {
      console.log('Initial position:', currentPosition);
    }
  }, []);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) return;

    const initializeMap = async () => {
      try {
        // Load Mapbox CSS from CDN
        if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
          document.head.appendChild(link);
        }
        
        // Import Mapbox GL JS
        const mapboxglModule = await import('mapbox-gl');
        const mapboxgl = mapboxglModule.default;
        
        mapboxgl.accessToken = mapboxToken;

        const initialPos = displayPosition || flight.currentPosition;
        
        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: initialPos ? [initialPos.longitude, initialPos.latitude] : [0, 0],
          zoom: initialPos ? 9 : 2,
          pitch: 0,
          bearing: 0,
          interactive: true,
        });

        map.on('load', () => {
          console.log('🗺️ Map loaded successfully');
          setMapLoaded(true);
          mapRef.current = map;

          // Add navigation controls
          const navControl = new mapboxgl.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: false
          });
          map.addControl(navControl, 'top-right');
          console.log('📍 Navigation controls added');

          if (initialPos) {
            console.log('✈️ Initial position:', initialPos);
            addRouteLayer(map, initialPos);
          } else {
            console.warn('⚠️ No initial position available');
          }
        });

        map.on('error', (e) => {
          console.error('Mapbox error:', e);
          setMapError('Failed to load map.');
        });

      } catch (error) {
        console.error('Failed to initialize Mapbox:', error);
        setMapError('Mapbox not available.');
      }
    };

    initializeMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [MAPBOX_TOKEN]);

  // Add route layer
  const addRouteLayer = (map: any, position: FlightPosition) => {
    if (!map || !showRouteState) return;

    const hasValidRoute = 
      flight.origin.latitude !== 0 && 
      flight.origin.longitude !== 0 &&
      flight.destination.latitude !== 0 && 
      flight.destination.longitude !== 0;

    if (!hasValidRoute) {
      console.log('⚠️ No valid route data (live-only flight), skipping route line');
      return;
    }

    const routeCoordinates = [
      [flight.origin.longitude, flight.origin.latitude],
      [position.longitude, position.latitude],
      [flight.destination.longitude, flight.destination.latitude]
    ];

    if (!map.getSource('route')) {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
          }
        }
      });

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': isSimulated ? '#f59e0b' : '#3B82F6', // Orange if simulated
          'line-width': 3,
          'line-opacity': 0.6,
          'line-dasharray': isSimulated ? [2, 2] : [2, 2] // Keep dashed
        }
      });
    }
  };

  // Update route line
  const updateRouteLine = (position: FlightPosition) => {
    const map = mapRef.current;
    if (!map || !showRouteState) return;

    const hasValidRoute = 
      flight.origin.latitude !== 0 && 
      flight.origin.longitude !== 0 &&
      flight.destination.latitude !== 0 && 
      flight.destination.longitude !== 0;

    if (!hasValidRoute) return;

    const routeCoordinates = [
      [flight.origin.longitude, flight.origin.latitude],
      [position.longitude, position.latitude],
      [flight.destination.longitude, flight.destination.latitude]
    ];

    if (map.getSource('route')) {
      map.getSource('route').setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: routeCoordinates
        }
      });
    }
  };

  // Update route color when simulation state changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer('route')) {
      map.setPaintProperty('route', 'line-color', isSimulated ? '#f59e0b' : '#3B82F6');
    }
  }, [isSimulated, mapLoaded]);

  // Update map center when interpolatedPosition changes
  useEffect(() => {
    if (!mapRef.current || !interpolatedPosition || !mapLoaded) return;

    try {
      const currentCenter = mapRef.current.getCenter();
      const newCenter = [interpolatedPosition.longitude, interpolatedPosition.latitude];
      
      // Only update if position changed significantly (avoid micro-movements)
      const dist = Math.sqrt(
        Math.pow(currentCenter.lng - newCenter[0], 2) + 
        Math.pow(currentCenter.lat - newCenter[1], 2)
      );
      
      if (dist > 0.00001) { // Minimum distance threshold
        mapRef.current.setCenter(newCenter);
      }
      
      // Update plane overlay rotation
      if (planeOverlayRef.current) {
        planeOverlayRef.current.style.transform = 
          `translate(-50%, -50%) rotate(${interpolatedPosition.heading}deg)`;
      }
      
      // Update route line
      updateRouteLine(interpolatedPosition);
    } catch (error) {
      console.error('Map update error:', error);
    }
  }, [interpolatedPosition, mapLoaded]);

  // Toggle route visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    if (showRouteState) {
      if (displayPosition) {
        addRouteLayer(mapRef.current, displayPosition);
        updateRouteLine(displayPosition);
      }
    } else if (mapRef.current.getLayer('route')) {
      mapRef.current.removeLayer('route');
      mapRef.current.removeSource('route');
    }
  }, [showRouteState, mapLoaded]);

  if (!MAPBOX_TOKEN || mapError) {
    return (
      <div className={`relative ${className} bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg overflow-hidden`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">✈️</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {mapError || 'Mapbox Token Required'}
            </h3>
            <p className="text-gray-600 mb-4">
              {mapError || 'Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your environment'}
            </p>
            {displayPosition && (
              <div className="bg-white rounded-lg p-4 shadow-lg max-w-sm mx-auto">
                <div className="text-sm font-medium text-gray-900 mb-2">Live Position</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-gray-500">Altitude:</span>
                    <span className="ml-1 font-medium">{Math.round(displayPosition.altitude)}ft</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Speed:</span>
                    <span className="ml-1 font-medium">{Math.round(displayPosition.speed)}kts</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Heading:</span>
                    <span className="ml-1 font-medium">{Math.round(displayPosition.heading)}°</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className} rounded-lg overflow-hidden`}>
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Fixed airplane overlay - stays centered, map moves underneath */}
      <div
        ref={planeOverlayRef}
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60px',
          height: '60px',
          zIndex: 1000,
          pointerEvents: 'none',
          transition: 'transform 0.5s ease-out',
        }}
      >
        <img 
          src="/img/plane-map.png" 
          alt="Aircraft" 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: isSimulated 
              ? 'drop-shadow(0 4px 6px rgba(245, 158, 11, 0.6))' 
              : 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))',
          }}
        />
      </div>
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {mapLoaded && (
        <>
          {/* Simulation Warning Banner */}
          {isSimulated && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
              <div className="bg-amber-500/95 backdrop-blur-sm rounded-lg px-4 py-2 text-white border border-amber-400 shadow-lg">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="animate-pulse">⚠️</span>
                  <span>SIMULATED APPROACH - Live tracking unavailable</span>
                </div>
              </div>
            </div>
          )}

          {/* Control buttons */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            <button
              onClick={() => onTrackingChange(!isTracking)}
              className={`p-2 rounded-lg shadow-lg border-2 border-white transition-all ${
                isTracking ? 'bg-green-500 text-white' : 'bg-white text-gray-700'
              }`}
              title={isTracking ? 'Pause tracking' : 'Resume tracking'}
            >
              {isTracking ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            <button
              onClick={() => setShowRouteState(!showRouteState)}
              className={`p-2 rounded-lg shadow-lg border-2 border-white transition-all ${
                showRouteState ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
              }`}
              title={showRouteState ? 'Hide route' : 'Show route'}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z"/>
              </svg>
            </button>

            <button
              onClick={() => {
                if (mapRef.current && displayPosition) {
                  mapRef.current.easeTo({
                    center: [displayPosition.longitude, displayPosition.latitude],
                    zoom: 8,
                    duration: 1000
                  });
                }
              }}
              className="p-2 rounded-lg shadow-lg border-2 border-white bg-white text-gray-700 transition-all hover:bg-gray-100"
              title="Center on aircraft"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
              </svg>
            </button>
          </div>

          {/* Info overlay */}
          {displayPosition && (
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 max-w-xs z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${
                  isSimulated ? 'bg-amber-500 animate-pulse' : 
                  isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`}></div>
                <div className="text-sm font-semibold text-gray-900">
                  {isSimulated ? 'Simulated Approach' : isTracking ? 'Live Tracking' : 'Paused'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>
                  <span className="text-gray-500">Altitude:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {Math.round(displayPosition.altitude).toLocaleString()}ft
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Speed:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {Math.round(displayPosition.speed)}kts
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Heading:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {Math.round(displayPosition.heading)}°
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Coords:</span>
                  <span className="ml-1 font-medium text-gray-900 text-[10px]">
                    {displayPosition.latitude.toFixed(2)}, {displayPosition.longitude.toFixed(2)}
                  </span>
                </div>
              </div>
              {currentPosition && currentPosition.timestamp && (
                <div className="text-xs text-gray-500 mt-2 border-t border-gray-200 pt-2">
                  Last update: {currentPosition.timestamp.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FlightTracker;