import { useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  payload: any;
}

class WebSocketService {
  private static instance: WebSocketService | null = null;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 3000;
  private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting = false;
  private token: string | null = null;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  setToken(token: string) {
    this.token = token;
    if (this.ws) {
      this.disconnect();
    }
    this.connect();
  }

  private getWebSocketUrl(): string {
    const port = window.location.port || '5000';
    return `ws://${window.location.hostname}:${port}/?token=${this.token}`;
  }

  connect() {
    if (this.isConnecting || !this.token) {
      return;
    }

    try {
      this.isConnecting = true;
      this.ws = new WebSocket(this.getWebSocketUrl());

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          const handlers = this.messageHandlers.get(message.type);
          if (handlers) {
            handlers.forEach(handler => handler(message.payload));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.token) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectTimeout);
    } else {
      console.error('Max reconnection attempts reached or no token available');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnecting = false;
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  subscribe(type: string, handler: (data: any) => void) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)?.add(handler);
  }

  unsubscribe(type: string, handler: (data: any) => void) {
    this.messageHandlers.get(type)?.delete(handler);
  }
}

// Create a singleton instance
const wsService = WebSocketService.getInstance();

// React hook for using WebSocket
export function useWebSocket() {
  const wsRef = useRef(wsService);

  const sendMessage = useCallback((type: string, payload: any) => {
    wsRef.current.send({ type, payload });
  }, []);

  const subscribe = useCallback((type: string, handler: (data: any) => void) => {
    wsRef.current.subscribe(type, handler);
    return () => wsRef.current.unsubscribe(type, handler);
  }, []);

  return {
    sendMessage,
    subscribe,
  };
}

export default wsService; 