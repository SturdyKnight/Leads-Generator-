import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

/**
 * SSE drives invalidation, so queries do not poll. Polling every list every ten
 * seconds alongside live events was duplicating the same refresh.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      // A 4xx will fail again the same way; only retry genuine server trouble.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: 0 },
  },
});
