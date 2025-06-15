import { WebSocketServer } from 'ws';
import http from 'http';
import express from 'express';

export function setupWebSocket(app: express.Express, server: http.Server) {
  const wss = new WebSocketServer({ 
    server,
    // Add proper error handling
    clientTracking: true,
    perMessageDeflate: false
  });

  wss.on('connection', (ws, req) => {
    // Set up ping/pong to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('message', (message) => {
      try {
        // Handle incoming messages
        ws.send(`Echo: ${message}`);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
    });

    // Send initial connection message
    if (ws.readyState === ws.OPEN) {
      ws.send('WebSocket connection established!');
    }
  });

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  return wss;
}
