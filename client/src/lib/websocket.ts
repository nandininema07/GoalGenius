export function createWebSocket(token: string) {
  if (!token) {
    console.warn('No token provided for WebSocket connection');
    return null;
  }

  // Use the current host and port
  const port = window.location.port || '5000';
  const ws = new WebSocket(`ws://${window.location.hostname}:${port}/?token=${token}`);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received:', data);
    } catch (error) {
      console.log('Received:', event.data);
    }
  };

  ws.onclose = (event) => {
    console.log('WebSocket disconnected:', event.code, event.reason);
    // Implement reconnection logic here if needed
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
  };

  return ws;
}
