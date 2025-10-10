import { FlightPosition } from '@/types/flight';

export interface WebSocketMessage {
  type: 'flight_update' | 'position_update' | 'error' | 'connected' | 'disconnected';
  data?: any;
  timestamp: Date;
  flightId?: string;
}

export interface WebSocketOptions {
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<WebSocketOptions>;
  private reconnectCount = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isManualDisconnect = false;
  private messageQueue: WebSocketMessage[] = [];
  private subscriptions = new Map<string, Set<(position: FlightPosition) => void>>();

  constructor(url: string, options: WebSocketOptions = {}) {
    this.url = url;
    this.options = {
      reconnectAttempts: options.reconnectAttempts || 5,
      reconnectInterval: options.reconnectInterval || 3000,
      heartbeatInterval: options.heartbeatInterval || 30000,
      onConnect: options.onConnect || (() => {}),
      onDisconnect: options.onDisconnect || (() => {}),
      onError: options.onError || (() => {}),
      onMessage: options.onMessage || (() => {}),
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || this.isConnected()) {
        resolve();
        return;
      }

      this.isConnecting = true;
      this.isManualDisconnect = false;

      try {
        console.log(`Connecting to WebSocket: ${this.url}`);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectCount = 0;
          this.startHeartbeat();
          this.processMessageQueue();
          this.options.onConnect();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.options.onDisconnect();
          
          if (!this.isManualDisconnect && this.reconnectCount < this.options.reconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.options.onError(new Error('WebSocket connection error'));
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        this.options.onError(error as Error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(message: WebSocketMessage): void {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp.toISOString(),
      }));
    } else {
      // Queue message for later delivery
      this.messageQueue.push(message);
      console.warn('WebSocket not connected, message queued');
    }
  }

  subscribeToFlight(flightId: string, callback: (position: FlightPosition) => void): () => void {
    if (!this.subscriptions.has(flightId)) {
      this.subscriptions.set(flightId, new Set());
    }
    
    this.subscriptions.get(flightId)!.add(callback);

    // Send subscription message
    this.send({
      type: 'flight_update',
      flightId,
      timestamp: new Date(),
    });

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(flightId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(flightId);
          // Send unsubscribe message
          this.send({
            type: 'flight_update',
            flightId,
            timestamp: new Date(),
          });
        }
      }
    };
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      message.timestamp = new Date(message.timestamp);
      
      this.options.onMessage(message);

      // Handle position updates
      if (message.type === 'position_update' && message.flightId && message.data) {
        const callbacks = this.subscriptions.get(message.flightId);
        if (callbacks) {
          callbacks.forEach(callback => callback(message.data as FlightPosition));
        }
      }

    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      this.options.onError(error as Error);
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!;
      this.send(message);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'connected',
          timestamp: new Date(),
        });
      } else {
        this.stopHeartbeat();
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectCount++;
    const delay = this.options.reconnectInterval * Math.pow(2, this.reconnectCount - 1);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectCount} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isManualDisconnect) {
        this.connect().catch(error => {
          console.error('Reconnect failed:', error);
        });
      }
    }, delay);
  }

  // Mock WebSocket implementation for development
  static createMock(url: string, options: WebSocketOptions = {}): WebSocketService {
    const mockService = new WebSocketService(url, options);
    
    // Override connect method for mock
    mockService.connect = () => {
      return new Promise((resolve) => {
        console.log('Mock WebSocket connected');
        
        // Simulate connection
        setTimeout(() => {
          mockService.options.onConnect();
          
          // Simulate periodic position updates
          const mockInterval = setInterval(() => {
            if (!mockService.isManualDisconnect) {
              const mockPosition: FlightPosition = {
                latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
                longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
                altitude: 35000 + (Math.random() - 0.5) * 2000,
                speed: 450 + (Math.random() - 0.5) * 50,
                heading: Math.random() * 360,
                timestamp: new Date(),
              };

              // Send to all subscribers
              mockService.subscriptions.forEach((callbacks) => {
                callbacks.forEach(callback => callback(mockPosition));
              });
            } else {
              clearInterval(mockInterval);
            }
          }, 5000);
          
          resolve();
        }, 1000);
      });
    };

    mockService.isConnected = () => true;
    mockService.send = () => {}; // No-op for mock
    mockService.disconnect = () => {
      mockService.isManualDisconnect = true;
      mockService.options.onDisconnect();
    };

    return mockService;
  }
}

// Create singleton instance
let wsInstance: WebSocketService | null = null;

export const getWebSocketService = (url?: string, options?: WebSocketOptions): WebSocketService => {
  if (!wsInstance) {
    const wsUrl = url || process.env.EXPO_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080';
    
    // Use mock WebSocket if no real URL is provided
    if (!url && !process.env.EXPO_PUBLIC_WEBSOCKET_URL) {
      console.log('Using mock WebSocket service');
      wsInstance = WebSocketService.createMock(wsUrl, options);
    } else {
      wsInstance = new WebSocketService(wsUrl, options);
    }
  }
  return wsInstance;
};

export default WebSocketService;
