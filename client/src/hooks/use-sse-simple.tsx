import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SSEOptions {
  endpoint: string;
  onNewOrder?: (order: any) => void;
  onOrderStatusUpdate?: (order: any) => void;
  onPaymentStatusUpdate?: (order: any) => void;
}

export function useSSESimple({ endpoint, onNewOrder, onOrderStatusUpdate, onPaymentStatusUpdate }: SSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log(`🔌 Setting up SSE connection to ${endpoint}`);
    
    const eventSource = new EventSource(endpoint, {
      withCredentials: true
    });

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✅ SSE connection opened successfully');
    };

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 SSE message received:', message);

        switch (message.type) {
          case 'connected':
            console.log('🤝 SSE connection confirmed');
            break;
          
          case 'order.new':
            console.log('🔔 NEW ORDER NOTIFICATION RECEIVED!', message.data);
            console.log('🎯 Triggering onNewOrder callback...');
            if (onNewOrder && message.data) {
              onNewOrder(message.data);
              toast({
                title: "🔔 New Order Received!",
                description: `Order #${message.data.id} from ${message.data.user?.first_name} ${message.data.user?.last_name} - PKR ${message.data.total_amount}`,
                duration: 8000,
              });
              console.log('✅ Order notification processing complete');
            } else {
              console.log('❌ onNewOrder callback not found or no data');
            }
            break;
          
          case 'order.update':
            console.log('📋 Order status update:', message.data);
            if (onOrderStatusUpdate && message.data) {
              onOrderStatusUpdate(message.data);
              toast({
                title: "Order Updated",
                description: `Order #${message.data.id} is now ${message.data.status}`,
                duration: 4000,
              });
            }
            break;
          
          case 'heartbeat':
            // Just log heartbeat quietly
            console.log('💓 SSE heartbeat received');
            break;
        }
      } catch (error) {
        console.error('❌ Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
    };

    return () => {
      console.log('🔌 Cleaning up SSE connection');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [endpoint]); // Only depend on endpoint, not the callback functions

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN
  };
}