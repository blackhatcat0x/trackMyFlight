// components/CockpitView.tsx
'use client';

import { Flight, FlightPosition } from '@/types/flight';
import React, { useEffect, useRef, useState } from 'react';

interface CockpitViewProps {
  flight: Flight;
  interpolatedPosition: FlightPosition | null;
  isSimulated?: boolean;
  className?: string;
}

export const CockpitView: React.FC<CockpitViewProps> = ({ 
  flight, 
  interpolatedPosition,
  className = '' 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cockpit' | 'chase'>('cockpit');
    const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const lastUpdateRef = useRef<number>(0);


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
        setError('Failed to load Mapbox token. Check server configuration.');
        setIsLoading(false);
      });
  }, []);

  // Initialize Mapbox
  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken) return;

    const initializeMapbox = async () => {
      try {
        const mapboxgl = await import('mapbox-gl');
        
        const container = mapContainerRef.current;
        if (!container) return;

        mapboxgl.default.accessToken = mapboxToken;

        const initialPosition = interpolatedPosition || flight.currentPosition;
        if (!initialPosition) {
          throw new Error('No position data available');
        }

        const map = new mapboxgl.default.Map({
          container: container,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: [initialPosition.longitude, initialPosition.latitude],
          zoom: 14,
          pitch: 75, // Tilted view for 3D effect
          bearing: initialPosition.heading,
          antialias: true
        });

        map.on('load', () => {
          // Add 3D terrain
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.terrain-rgb',
            tileSize: 512,
            maxzoom: 14
          });
          
          map.setTerrain({ 
            source: 'mapbox-dem', 
            exaggeration: 1.2 // Reduced exaggeration to minimize jitter
          });

          // Add sky layer for atmosphere
          map.addLayer({
            id: 'sky',
            type: 'sky',
            paint: {
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0.0, 90.0],
              'sky-atmosphere-sun-intensity': 15
            }
          });

          mapRef.current = map;
          setIsLoading(false);
        });

      } catch (err) {
        console.error('❌ Failed to initialize Mapbox:', err);
        setError(err instanceof Error ? err.message : 'Failed to load 3D view');
        setIsLoading(false);
      }
    };

    initializeMapbox();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapboxToken]);

  // Update camera position
  useEffect(() => {
    if (!mapRef.current || !interpolatedPosition) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < 50) return; // Fast updates for visible movement
    lastUpdateRef.current = now;

    const map = mapRef.current;
    const position = interpolatedPosition;

    // Calculate zoom to approximate the actual altitude view
    // At zoom 0, you see the whole world (~40,075 km at equator)
    // Each zoom level doubles the scale (halves the distance)
    // Formula: zoom ≈ log2(planet_circumference_meters / (altitude_meters * viewport_width_degrees))
    
    const altitudeMeters = position.altitude * 0.3048; // Convert feet to meters
    
    // Simplified zoom calculation based on altitude
    // This approximates what you'd see at that height
    // Higher altitude = lower zoom number
    const zoom = Math.max(1, Math.min(18, 
      17.5 - Math.log2(altitudeMeters / 100)
    ));

    if (viewMode === 'cockpit') {
      // Cockpit view - camera at aircraft position
      map.jumpTo({ // Use jumpTo instead of easeTo for immediate updates
        center: [position.longitude, position.latitude],
        bearing: position.heading,
        pitch: 70,
        zoom: zoom
      });
    } else {
      // Chase cam - position slightly behind
      const offsetDistance = 0.015;
      const headingRad = (position.heading * Math.PI) / 180;
      
      const chaseLon = position.longitude - offsetDistance * Math.sin(headingRad);
      const chaseLat = position.latitude - offsetDistance * Math.cos(headingRad);

      map.jumpTo({
        center: [chaseLon, chaseLat],
        bearing: position.heading,
        pitch: 65,
        zoom: zoom - 0.5
      });
    }

  }, [interpolatedPosition, viewMode]);

  if (error) {
    return (
      <div className={`${className} bg-gradient-to-br from-red-900 to-red-800 rounded-lg overflow-hidden`}>
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-white mb-2">Cockpit View Unavailable</h3>
            <p className="text-red-200 mb-4">{error}</p>
            {error.includes('token') && (
              <div className="text-left bg-black/30 rounded p-3 text-sm text-red-100">
                <p className="font-bold mb-2">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Sign up at mapbox.com (free)</li>
                  <li>Get your access token</li>
                  <li>Add to .env.local:</li>
                </ol>
                <code className="block mt-2 bg-black/50 p-2 rounded text-xs">
                  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token_here
                </code>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const displayPosition = interpolatedPosition || flight.currentPosition;

  return (
    <div className={`relative ${className}`}>
      {/* Mapbox Container */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full absolute inset-0"
        style={{ minHeight: '500px' }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
            <p className="text-white">Loading 3D Mapbox View...</p>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      {!isLoading && displayPosition && (
        <>
          {/* View Mode Toggle */}
          <div className="absolute top-4 right-4 flex gap-2 z-50 pointer-events-auto">
            <button
              onClick={() => setViewMode('cockpit')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'cockpit'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
              }`}
            >
              🪟 Cockpit View
            </button>
            <button
              onClick={() => setViewMode('chase')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'chase'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
              }`}
            >
              🔹 Chase Cam
            </button>
          </div>

          {/* Flight Info HUD */}
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white border border-white/20 z-50 pointer-events-none">
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div>
                <div className="text-blue-300 text-xs mb-1">ALTITUDE</div>
                <div className="text-xl font-bold">
                  {Math.round(displayPosition.altitude).toLocaleString()}
                </div>
                <div className="text-xs opacity-75">feet</div>
              </div>
              <div>
                <div className="text-blue-300 text-xs mb-1">SPEED</div>
                <div className="text-xl font-bold">
                  {Math.round(displayPosition.speed)}
                </div>
                <div className="text-xs opacity-75">knots</div>
              </div>
              <div>
                <div className="text-blue-300 text-xs mb-1">HEADING</div>
                <div className="text-xl font-bold">
                  {Math.round(displayPosition.heading)}°
                </div>
                <div className="text-xs opacity-75">
                  {getCardinalDirection(displayPosition.heading)}
                </div>
              </div>
              <div>
                <div className="text-blue-300 text-xs mb-1">LATITUDE</div>
                <div className="text-lg font-bold font-mono">
                  {displayPosition.latitude.toFixed(4)}°
                </div>
                <div className="text-xs opacity-75">N/S</div>
              </div>
              <div>
                <div className="text-blue-300 text-xs mb-1">LONGITUDE</div>
                <div className="text-lg font-bold font-mono">
                  {displayPosition.longitude.toFixed(4)}°
                </div>
                <div className="text-xs opacity-75">E/W</div>
              </div>
            </div>
          </div>

          {/* Flight Path Indicator */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
            <div className="relative">
              <div className="w-8 h-8 border-2 border-green-400 rounded-full opacity-60"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
          </div>

          {/* Route Info */}
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-white border border-white/20 z-50 pointer-events-none">
            <div className="flex items-center gap-3 text-sm">
              <div className="text-center">
                <div className="text-xs text-blue-300">FROM</div>
                <div className="font-bold">{flight.origin.code}</div>
              </div>
              <div className="text-blue-400">→</div>
              <div className="text-center">
                <div className="text-xs text-blue-300">TO</div>
                <div className="font-bold">{flight.destination.code}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function getCardinalDirection(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
}

export default CockpitView;
