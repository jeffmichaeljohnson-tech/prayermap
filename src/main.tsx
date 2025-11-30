import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from "./App.tsx";
import "./index.css";

// Configure React Query client with optimized settings for PrayerMap
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds (good for real-time prayer data)
      staleTime: 30 * 1000,
      // Cache retention time - 5 minutes (keeps data available for offline viewing)
      gcTime: 5 * 60 * 1000, // formerly cacheTime in v4
      // Refetch when window regains focus (keep data fresh)
      refetchOnWindowFocus: true,
      // Refetch when network reconnects (sync after offline)
      refetchOnReconnect: true,
      // Retry failed requests (helps with spotty mobile connections)
      retry: 2,
      // Exponential backoff for retries (1s, 2s, max 10s)
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      // Retry mutations once (prayer submissions are important)
      retry: 1,
      // Shorter retry delay for mutations (user is waiting)
      retryDelay: 1000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
