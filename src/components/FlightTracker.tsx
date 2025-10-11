'use client';

import { Flight, FlightPosition } from '@/types/flight';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface FlightTrackerProps {
  flight: Flight;
  showRoute?: boolean;
  className?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export const FlightTracker = React.forwardRef<any, FlightTrackerProps>(({
  flight,
  showRoute = true,
  className = '',
}, ref) => {
  const [currentPosition, setCurrentPosition] = useState<FlightPosition | null>(
    flight.currentPosition || null
  );
  const [isTracking, setIsTracking] = useState(true);
  const [showRouteState, setShowRouteState] = useState(showRoute);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/light-v11');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);

  // Initialize Mapbox map
  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current || mapRef.current) return;

    const initializeMap = async () => {
      try {
        // Dynamically import mapboxgl to avoid SSR issues
        const mapboxglModule = await import('mapbox-gl');
        const mapboxgl = mapboxglModule.default;
        mapboxgl.accessToken = MAPBOX_TOKEN;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: mapStyle,
          center: [currentPosition?.longitude || flight.origin.longitude, currentPosition?.latitude || flight.origin.latitude],
          zoom: 6,
          attributionControl: false,
        });

        map.on('load', () => {
          setMapLoaded(true);
          mapRef.current = map;

          // Add navigation controls
          map.addControl(new mapboxgl.NavigationControl(), 'top-right');

          // Add aircraft marker if we have position
          if (currentPosition) {
            addAircraftMarker(map, currentPosition);
          }

          // Fit map to show route
          fitMapToBounds(map);
        });

        map.on('error', (e) => {
          console.error('Mapbox error:', e);
          setMapError('Failed to load map. Please check your Mapbox token.');
        });

      } catch (error) {
        console.error('Failed to initialize Mapbox:', error);
        setMapError('Mapbox not available. Showing demo view.');
      }
    };

    initializeMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [MAPBOX_TOKEN, mapStyle]);

  // Add aircraft marker to map
  const addAircraftMarker = async (map: any, position: FlightPosition) => {
    if (!map || markerRef.current) return;

    try {
      const mapboxglModule = await import('mapbox-gl');
      const mapboxgl = mapboxglModule.default;

      // Create custom aircraft icon
      const el = document.createElement('div');
      el.className = 'aircraft-marker';
      el.innerHTML = `
        <div style="
          width: 30px;
          height: 30px;
          background: #3B82F6;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transform: rotate(${position.heading}deg);
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>
      `;

      markerRef.current = new mapboxgl.Marker(el)
        .setLngLat([position.longitude, position.latitude])
        .addTo(map);
    } catch (error) {
      console.error('Failed to add aircraft marker:', error);
    }
  };

  // Update aircraft position
  useEffect(() => {
    if (!mapRef.current || !currentPosition) return;

    if (markerRef.current) {
      markerRef.current.setLngLat([currentPosition.longitude, currentPosition.latitude]);
      
      // Update rotation
      const markerEl = markerRef.current.getElement();
      const aircraftIcon = markerEl.querySelector('.aircraft-marker > div');
      if (aircraftIcon) {
        aircraftIcon.style.transform = `rotate(${currentPosition.heading}deg)`;
      }
    } else {
      addAircraftMarker(mapRef.current, currentPosition);
    }

    // Update route line
    updateRouteLine(mapRef.current);
  }, [currentPosition]); // Only depend on currentPosition, not flight.currentPosition

  // Update route line
  const updateRouteLine = (map: any) => {
    if (!map || !showRouteState || !currentPosition) return;

    const routeCoordinates = [
      [flight.origin.longitude, flight.origin.latitude],
      [currentPosition.longitude, currentPosition.latitude],
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
    } else {
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
          'line-color': '#3B82F6',
          'line-width': 3,
          'line-opacity': 0.7
        }
      });
    }
  };

  // Fit map to show entire route
  const fitMapToBounds = useCallback(async (map: any) => {
    try {
      const mapboxglModule = await import('mapbox-gl');
      const mapboxgl = mapboxglModule.default;

      const coordinates = [
        [flight.origin.longitude, flight.origin.latitude],
        [flight.destination.longitude, flight.destination.latitude],
      ];

      if (currentPosition) {
        coordinates.push([currentPosition.longitude, currentPosition.latitude]);
      }

      const bounds = new mapboxgl.LngLatBounds();
      coordinates.forEach(coord => bounds.extend(coord as [number, number]));

      map.fitBounds(bounds, {
        padding: 60,
        maxZoom: 10,
      });
    } catch (error) {
      console.error('Failed to fit map bounds:', error);
    }
  }, [flight.origin, flight.destination, currentPosition]);

  // Toggle route visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    if (showRouteState && currentPosition) {
      updateRouteLine(mapRef.current);
    } else if (mapRef.current.getLayer('route')) {
      mapRef.current.removeLayer('route');
      mapRef.current.removeSource('route');
    }
  }, [showRouteState, currentPosition, mapLoaded]);

  // Change map style
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      mapRef.current.setStyle(mapStyle);
    }
  }, [mapStyle, mapLoaded]);

  // If Mapbox token is missing, show demo view
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
              {mapError || 'Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your environment variables'}
            </p>
            
            {currentPosition && (
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
                    <span className="ml-1 font-medium text-green-600">Live</span>
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
      
      {/* Loading indicator */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map controls overlay */}
      {mapLoaded && (
        <div className="absolute top-4 left-4 flex flex-col gap-2">
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
      )}

      {/* Real-time info overlay */}
      {currentPosition && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-white/20">
          <div className="text-sm font-medium text-gray-900 mb-2">Live Position</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-gray-500">Altitude:</span>
              <span className="ml-1 font-medium">
                {Math.round(currentPosition.altitude)}ft
              </span>
            </div>
            <div>
              <span className="text-gray-500">Speed:</span>
              <span className="ml-1 font-medium">
                {Math.round(currentPosition.speed)}kts
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
