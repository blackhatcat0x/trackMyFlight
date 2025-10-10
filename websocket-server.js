const { createServer } = require('http');
const { Server } = require('socket.io');

const PORT = 3001;
const HOST = '0.0.0.0';

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Flight tracking data store
const flightSubscriptions = new Map();
const flightData = new Map();

// Mock flight position generator
function generateMockPosition(flightId) {
  const basePosition = flightData.get(flightId) || {
    latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
    longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
    altitude: 30000 + Math.random() * 10000,
    speed: 400 + Math.random() * 200,
    heading: Math.random() * 360,
    timestamp: new Date()
  };

  // Update position with realistic movement
  const newPosition = {
    ...basePosition,
    latitude: basePosition.latitude + (Math.random() - 0.5) * 0.01,
    longitude: basePosition.longitude + (Math.random() - 0.5) * 0.01,
    altitude: Math.max(1000, basePosition.altitude + (Math.random() - 0.5) * 1000),
    speed: Math.max(200, Math.min(600, basePosition.speed + (Math.random() - 0.5) * 50)),
    heading: (basePosition.heading + (Math.random() - 0.5) * 10) % 360,
    timestamp: new Date()
  };

  flightData.set(flightId, newPosition);
  return newPosition;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Subscribe to flight updates
  socket.on('subscribe_flight', (data) => {
    const { flightId } = data;
    console.log(`Client ${socket.id} subscribed to flight ${flightId}`);
    
    // Add socket to flight subscription
    if (!flightSubscriptions.has(flightId)) {
      flightSubscriptions.set(flightId, new Set());
    }
    flightSubscriptions.get(flightId).add(socket.id);
    
    // Join socket room for this flight
    socket.join(`flight_${flightId}`);
    
    // Send initial position if available
    const position = flightData.get(flightId);
    if (position) {
      socket.emit('flight_position_update', {
        flightId,
        position
      });
    }
  });

  // Unsubscribe from flight updates
  socket.on('unsubscribe_flight', (data) => {
    const { flightId } = data;
    console.log(`Client ${socket.id} unsubscribed from flight ${flightId}`);
    
    // Remove socket from flight subscription
    if (flightSubscriptions.has(flightId)) {
      flightSubscriptions.get(flightId).delete(socket.id);
    }
    
    // Leave socket room
    socket.leave(`flight_${flightId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    // Remove from all flight subscriptions
    for (const [flightId, subscribers] of flightSubscriptions.entries()) {
      subscribers.delete(socket.id);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Start mock flight position updates
setInterval(() => {
  for (const flightId of flightSubscriptions.keys()) {
    const subscribers = flightSubscriptions.get(flightId);
    if (subscribers && subscribers.size > 0) {
      const position = generateMockPosition(flightId);
      
      // Broadcast to all subscribers of this flight
      io.to(`flight_${flightId}`).emit('flight_position_update', {
        flightId,
        position
      });
      
      console.log(`Updated position for flight ${flightId}:`, {
        lat: position.latitude.toFixed(4),
        lng: position.longitude.toFixed(4),
        alt: Math.round(position.altitude),
        speed: Math.round(position.speed),
        heading: Math.round(position.heading)
      });
    }
  }
}, 5000); // Update every 5 seconds

// Start the server
httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 WebSocket server running on http://${HOST}:${PORT}`);
  console.log(`📡 Socket.IO server ready for connections`);
  console.log(`🛩️  Flight tracking service active`);
});

// Handle server errors
httpServer.on('error', (error) => {
  console.error('Server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket server...');
  httpServer.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});
