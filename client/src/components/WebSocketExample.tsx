import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../services/websocket';

interface Message {
  id: string;
  content: string;
  timestamp: string;
}

export function WebSocketExample() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const { sendMessage, subscribe } = useWebSocket();

  useEffect(() => {
    // Subscribe to 'message' events
    const unsubscribe = subscribe('message', (data: Message) => {
      setMessages(prev => [...prev, data]);
    });

    // Cleanup subscription on component unmount
    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      sendMessage('message', {
        content: inputMessage,
        timestamp: new Date().toISOString(),
      });
      setInputMessage('');
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">WebSocket Chat</h2>
        <div className="border rounded-lg p-4 h-64 overflow-y-auto mb-4">
          {messages.map((message) => (
            <div key={message.id} className="mb-2">
              <p className="text-sm text-gray-500">{new Date(message.timestamp).toLocaleTimeString()}</p>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type a message..."
          />
          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
} 