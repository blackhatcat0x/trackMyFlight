import { Server } from 'socket.io';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Flight tracking subscriptions
    socket.on('subscribe_flight', (data: { flightId: string }) => {
      console.log(`Client ${socket.id} subscribed to flight ${data.flightId}`);
      socket.join(`flight_${data.flightId}`);
      
      // Send initial position if available
      socket.emit('flight_subscribed', { 
        flightId: data.flightId,
        status: 'subscribed',
        timestamp: new Date().toISOString()
      });
    });

    socket.on('unsubscribe_flight', (data: { flightId: string }) => {
      console.log(`Client ${socket.id} unsubscribed from flight ${data.flightId}`);
      socket.leave(`flight_${data.flightId}`);
      
      socket.emit('flight_unsubscribed', { 
        flightId: data.flightId,
        status: 'unsubscribed',
        timestamp: new Date().toISOString()
      });
    });

    // Handle messages
    socket.on('message', (msg: { text: string; senderId: string }) => {
      // Echo: broadcast message only the client who send the message
      socket.emit('message', {
        text: `Echo: ${msg.text}`,
        senderId: 'system',
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Send welcome message
    socket.emit('message', {
      text: 'Welcome to TrackMyFlight WebSocket Server!',
      senderId: 'system',
      timestamp: new Date().toISOString(),
    });
  });

  // Simulate real-time flight position updates
  setInterval(() => {
    // This would normally fetch real flight data from an API
    const mockFlightUpdate = {
      flightId: 'flight_123', // This would be dynamic
      position: {
        latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
        longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
        altitude: 35000 + (Math.random() - 0.5) * 2000,
        speed: 450 + (Math.random() - 0.5) * 50,
        heading: Math.random() * 360,
        timestamp: new Date(),
      },
    };

    // Broadcast to clients subscribed to this flight
    io.to(`flight_${mockFlightUpdate.flightId}`).emit('flight_position_update', mockFlightUpdate);
  }, 5000); // Update every 5 seconds
};

// Helper function to broadcast flight updates
export const broadcastFlightUpdate = (io: Server, flightId: string, position: any) => {
  io.to(`flight_${flightId}`).emit('flight_position_update', {
    flightId,
    position,
    timestamp: new Date().toISOString(),
  });
};
