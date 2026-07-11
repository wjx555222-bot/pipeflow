import { useRef, useCallback, useEffect } from 'react';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  autoReconnect?: boolean;
  maxRetries?: number;
  baseDelay?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    autoReconnect = true,
    maxRetries = 5,
    baseDelay = 1000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const urlRef = useRef<string>('');
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    retriesRef.current = 0;
  }, []);

  const connect = useCallback(
    (url: string) => {
      disconnect();
      urlRef.current = url;

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mountedRef.current) return;
          retriesRef.current = 0;
        };

        ws.onmessage = (event) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            onMessage?.(data);
          } catch {
            onMessage?.(event.data);
          }
        };

        ws.onerror = () => {
        };

        ws.onclose = (event) => {
          if (!mountedRef.current) return;

          if (event.code !== 1000 && retriesRef.current < maxRetries && autoReconnect) {
            const delay = baseDelay * Math.pow(2, retriesRef.current);
            retriesRef.current++;

            reconnectTimerRef.current = setTimeout(() => {
              if (mountedRef.current) {
                connect(urlRef.current);
              }
            }, delay);
          }
        };
      } catch {
      }
    },
    [disconnect, onMessage, autoReconnect, maxRetries, baseDelay]
  );

  const send = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  return { connect, disconnect, send };
}
