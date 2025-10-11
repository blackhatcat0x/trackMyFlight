'use client';

import { Flight, FlightPosition } from '@/types/flight';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface FlightTrackerProps {
  flight: Flight;
  showRoute?: boolean;
  className?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
const UPDATE_INTERVAL = 60000; // 60 seconds

const getCallsignFromFlightNumber = (flightNumber: string): string => {
  const clean = flightNumber.replace(/\s+/g, '').toUpperCase();
  if (/^[A-Z]{3}\d+[A-Z]?$/.test(clean)) return clean;
  
  const iataToIcao: Record<string, string> = {
    'U2': 'EZY', 'BA': 'BAW', 'FR': 'RYR', 'EZ': 'EZS',
  };
  
  const iataMatch = clean.match(/^([A-Z]{2})(\d+[A-Z]?)$/);
  if (iataMatch) {
    const [, iata, number] = iataMatch;
    const icao = iataToIcao[iata] || iata;
    return `${icao}${number}`;
  }
  
  return clean;
};

export const FlightTracker: React.FC<FlightTrackerProps> = ({
  flight,
  showRoute = true,
  className = '',
}) => {
  const [currentPosition, setCurrentPosition] = useState<FlightPosition | null>(
    flight.currentPosition || null
  );
  
  // Log initial state
  useEffect(() => {
    console.log('🛫 FlightTracker initialized');
    console.log('Flight:', flight.flightNumber);
    console.log('Has current position:', !!flight.currentPosition);
    if (flight.currentPosition) {
      console.log('Initial position:', flight.currentPosition);
    }
  }, []);
  
  const [isTracking, setIsTracking] = useState(true);
  const [showRouteState, setShowRouteState] = useState(showRoute);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastKnownPositionRef = useRef<FlightPosition | null>(flight.currentPosition || null);

  // Fetch live position update
  const fetchLivePosition = useCallback(async (): Promise<FlightPosition | null> => {
    if (!flight.flightNumber) return null;

    const callsign = getCallsignFromFlightNumber(flight.flightNumber);
    console.log(`🔄 Fetching live update for ${callsign}...`);

    try {
      const response = await fetch(
        `https://api.airplanes.live/v2/callsign/${encodeURIComponent(callsign)}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        console.error(`API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (data.ac && Array.isArray(data.ac) && data.ac.length > 0) {
        const aircraftData = data.ac[0];
        
        if (aircraftData.lat && aircraftData.lon) {
          const position: FlightPosition = {
            latitude: aircraftData.lat,
            longitude: aircraftData.lon,
            altitude: aircraftData.alt_baro || aircraftData.alt_geom || 0,
            speed: aircraftData.gs || 0,
            heading: aircraftData.track || 0,
            timestamp: new Date(),
          };
          
          console.log(`✅ Live position updated:`, position);
          return position;
        }
      }

      console.log(`No live data available for ${callsign}`);
      return null;
    } catch (error) {
      console.error('Failed to fetch live position:', error);
      return null;
    }
  }, [flight.flightNumber]);

  // Interpolate position for smooth animation
  const interpolatePosition = useCallback((from: FlightPosition): FlightPosition => {
    const speedKnots = from.speed;
    const speedKmPerMs = (speedKnots * 1.852) / (1000 * 3600);
    const timeSinceUpdate = Date.now() - from.timestamp.getTime();
    const distanceTraveled = speedKmPerMs * timeSinceUpdate;
    
    const earthRadius = 6371;
    const headingRad = (from.heading * Math.PI) / 180;
    const latRad = (from.latitude * Math.PI) / 180;
    
    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(distanceTraveled / earthRadius) +
      Math.cos(latRad) * Math.sin(distanceTraveled / earthRadius) * Math.cos(headingRad)
    );
    
    const lonRad = (from.longitude * Math.PI) / 180;
    const newLonRad = lonRad + Math.atan2(
      Math.sin(headingRad) * Math.sin(distanceTraveled / earthRadius) * Math.cos(latRad),
      Math.cos(distanceTraveled / earthRadius) - Math.sin(latRad) * Math.sin(newLatRad)
    );
    
    return {
      latitude: (newLatRad * 180) / Math.PI,
      longitude: (newLonRad * 180) / Math.PI,
      altitude: from.altitude,
      speed: from.speed,
      heading: from.heading,
      timestamp: new Date(),
    };
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    if (!lastKnownPositionRef.current || !isTracking || !mapRef.current) return;

    const timeSinceUpdate = Date.now() - lastKnownPositionRef.current.timestamp.getTime();
    
    if (timeSinceUpdate < UPDATE_INTERVAL * 1.5 && lastKnownPositionRef.current.speed > 50) {
      const interpolated = interpolatePosition(lastKnownPositionRef.current);
      setCurrentPosition(interpolated);
      
      // Center map on aircraft and update marker
      if (markerRef.current && mapRef.current) {
        markerRef.current.setLngLat([interpolated.longitude, interpolated.latitude]);
        mapRef.current.easeTo({
          center: [interpolated.longitude, interpolated.latitude],
          duration: 1000
        });
        
        const markerEl = markerRef.current.getElement();
        const aircraftIcon = markerEl?.querySelector('.aircraft-marker');
        if (aircraftIcon) {
          (aircraftIcon as HTMLElement).style.transform = `rotate(${interpolated.heading}deg)`;
        }
      }
      
      updateRouteLine(interpolated);
    }

    if (isTracking) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [isTracking, interpolatePosition]);

  // Initialize Mapbox map
  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current || mapRef.current) return;

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
        
        mapboxgl.accessToken = MAPBOX_TOKEN;

        const initialPos = currentPosition || flight.currentPosition;
        
        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12', // Colored map style
          center: initialPos ? [initialPos.longitude, initialPos.latitude] : [0, 0],
          zoom: initialPos ? 8 : 2,
          pitch: 0,
          bearing: 0,
        });

        map.on('load', () => {
          console.log('🗺️ Map loaded successfully');
          setMapLoaded(true);
          mapRef.current = map;

          // Add navigation controls (zoom buttons)
          const navControl = new mapboxgl.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: false
          });
          map.addControl(navControl, 'top-right');
          console.log('📍 Navigation controls added');

          if (initialPos) {
            console.log('✈️ Adding aircraft marker at:', initialPos);
            addAircraftMarker(map, initialPos);
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

  // Add aircraft marker with airplane SVG
  const addAircraftMarker = async (map: any, position: FlightPosition) => {
    if (!map) {
      console.error('❌ Map not available');
      return;
    }
    
    if (markerRef.current) {
      console.log('ℹ️ Marker already exists, updating position');
      markerRef.current.setLngLat([position.longitude, position.latitude]);
      return;
    }

    try {
      const mapboxglModule = await import('mapbox-gl');
      const mapboxgl = mapboxglModule.default;

      const el = document.createElement('div');
      el.className = 'aircraft-marker-container';
      el.style.cssText = `
        width: 50px;
        height: 50px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      el.innerHTML = `
        <div class="aircraft-marker" style="
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${position.heading}deg);
          transition: transform 0.5s linear;
        ">
          <svg width="50" height="50" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(256,256)">
              <!-- Airplane body -->
              <path d="M 0,-200 L -30,-50 L -50,50 L -30,100 L 0,120 L 30,100 L 50,50 L 30,-50 Z" 
                    fill="#1E40AF" 
                    stroke="#FFFFFF" 
                    stroke-width="8"/>
              <!-- Wings -->
              <path d="M -30,-50 L -150,-20 L -150,20 L -30,0 Z" 
                    fill="#3B82F6" 
                    stroke="#FFFFFF" 
                    stroke-width="6"/>
              <path d="M 30,-50 L 150,-20 L 150,20 L 30,0 Z" 
                    fill="#3B82F6" 
                    stroke="#FFFFFF" 
                    stroke-width="6"/>
              <!-- Tail wings -->
              <path d="M -20,70 L -60,100 L -40,110 L -20,90 Z" 
                    fill="#3B82F6" 
                    stroke="#FFFFFF" 
                    stroke-width="4"/>
              <path d="M 20,70 L 60,100 L 40,110 L 20,90 Z" 
                    fill="#3B82F6" 
                    stroke="#FFFFFF" 
                    stroke-width="4"/>
              <!-- Cockpit -->
              <circle cx="0" cy="-150" r="15" fill="#FFFFFF" opacity="0.9"/>
            </g>
          </svg>
        </div>
      `;

      console.log('✈️ Creating marker at:', [position.longitude, position.latitude]);

      markerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
        rotationAlignment: 'map',
        pitchAlignment: 'map'
      })
        .setLngLat([position.longitude, position.latitude])
        .addTo(map);

      console.log('✅ Aircraft marker added successfully');
    } catch (error) {
      console.error('❌ Failed to add aircraft marker:', error);
    }
  };

  // Add route layer
  const addRouteLayer = (map: any, position: FlightPosition) => {
    if (!map || !showRouteState) return;

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
          'line-color': '#3B82F6',
          'line-width': 3,
          'line-opacity': 0.6,
          'line-dasharray': [2, 2]
        }
      });
    }
  };

  // Update route line
  const updateRouteLine = (position: FlightPosition) => {
    const map = mapRef.current;
    if (!map || !showRouteState) return;

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

  // Setup periodic updates
  useEffect(() => {
    if (!isTracking) return;

    const updatePosition = async () => {
      const newPosition = await fetchLivePosition();
      if (newPosition) {
        lastKnownPositionRef.current = newPosition;
        setCurrentPosition(newPosition);
        setLastUpdateTime(new Date());
        
        if (markerRef.current && mapRef.current) {
          markerRef.current.setLngLat([newPosition.longitude, newPosition.latitude]);
          mapRef.current.easeTo({
            center: [newPosition.longitude, newPosition.latitude],
            duration: 1000
          });
          
          const markerEl = markerRef.current.getElement();
          const aircraftIcon = markerEl?.querySelector('.aircraft-marker');
          if (aircraftIcon) {
            (aircraftIcon as HTMLElement).style.transform = `rotate(${newPosition.heading}deg)`;
          }
        }
        
        updateRouteLine(newPosition);
      }
    };

    updatePosition();
    updateIntervalRef.current = setInterval(updatePosition, UPDATE_INTERVAL);
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isTracking, fetchLivePosition, animate]);

  // Toggle route visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    if (showRouteState) {
      if (currentPosition) {
        addRouteLayer(mapRef.current, currentPosition);
        updateRouteLine(currentPosition);
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
            {currentPosition && (
              <div className="bg-white rounded-lg p-4 shadow-lg max-w-sm mx-auto">
                <div className="text-sm font-medium text-gray-900 mb-2">Live Position</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-gray-500">Altitude:</span>
                    <span className="ml-1 font-medium">{Math.round(currentPosition.altitude)}ft</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Speed:</span>
                    <span className="ml-1 font-medium">{Math.round(currentPosition.speed)}kts</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Heading:</span>
                    <span className="ml-1 font-medium">{Math.round(currentPosition.heading)}°</span>
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
          {/* Control buttons */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <button
              onClick={() => setIsTracking(!isTracking)}
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
                if (mapRef.current && currentPosition) {
                  mapRef.current.easeTo({
                    center: [currentPosition.longitude, currentPosition.latitude],
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
          {currentPosition && (
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <div className="text-sm font-semibold text-gray-900">
                  {isTracking ? 'Live Tracking' : 'Paused'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>
                  <span className="text-gray-500">Altitude:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {Math.round(currentPosition.altitude).toLocaleString()}ft
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Speed:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {Math.round(currentPosition.speed)}kts
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Heading:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {Math.round(currentPosition.heading)}°
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Coords:</span>
                  <span className="ml-1 font-medium text-gray-900 text-[10px]">
                    {currentPosition.latitude.toFixed(2)}, {currentPosition.longitude.toFixed(2)}
                  </span>
                </div>
              </div>
              {lastUpdateTime && (
                <div className="text-xs text-gray-500 mt-2 border-t border-gray-200 pt-2">
                  Last update: {lastUpdateTime.toLocaleTimeString()}
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