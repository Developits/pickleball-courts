import { useState, useEffect, useRef } from 'react';

export function useSSE(url, options = {}) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!url) return;

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setError('No auth token found');
      return;
    }

    // Add token to URL
    const fullUrl = `${url}?token=${token}`;

    const eventSource = new EventSource(fullUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onconnected = (event) => {
      console.log('SSE Connected:', event);
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      setConnected(false);
      setError('Connection error');
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        eventSource.close();
        // Optionally trigger reconnect here
      }, 5000);
    };

    eventSource.addEventListener('update', (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        setData(parsedData);
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    });

    eventSource.addEventListener('error', (event) => {
      try {
        const errorData = JSON.parse(event.data);
        console.error('Server error:', errorData);
      } catch (err) {
        console.error('Error parsing error event:', err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [url]);

  return { data, connected, error };
}
