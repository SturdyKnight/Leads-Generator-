/**
 * Live updates over SSE.
 *
 * Two things the previous version got wrong. The connection status was computed
 * and then discarded, so a dropped stream looked exactly like "nothing is
 * happening". And the discovery progress payload was received but never read,
 * so a determinate process was shown as an indefinite spinner. Both are exposed
 * here through context.
 */

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DiscoveryProgress } from '@bmatrix/shared';
import { API_BASE_URL } from '../lib/api-client';

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting';

interface LiveContextValue {
  status: ConnectionStatus;
  /** Progress of the currently running discovery run, keyed by session id. */
  progress: Record<string, DiscoveryProgress>;
}

const LiveContext = createContext<LiveContextValue>({ status: 'connecting', progress: {} });

export const useLive = () => useContext(LiveContext);

const INITIAL_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

export function LiveProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [progress, setProgress] = useState<Record<string, DiscoveryProgress>>({});

  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    let active = true;

    const invalidate = (keys: string[][]) => {
      keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    };

    const parse = <T,>(event: Event): T | undefined => {
      try {
        return JSON.parse((event as MessageEvent).data) as T;
      } catch {
        return undefined;
      }
    };

    function connect() {
      const source = new EventSource(`${API_BASE_URL}/events`);
      sourceRef.current = source;

      source.onopen = () => {
        if (!active) return;
        attemptRef.current = 0;
        setStatus('live');
      };

      source.addEventListener('campaign:updated', () => {
        invalidate([['campaigns'], ['campaign'], ['dashboard']]);
      });

      source.addEventListener('session:updated', () => {
        invalidate([['sessions'], ['campaign'], ['campaigns']]);
      });

      source.addEventListener('lead:created', () => {
        invalidate([['leads'], ['campaign'], ['dashboard']]);
      });

      source.addEventListener('lead:updated', () => {
        invalidate([['leads'], ['lead'], ['campaign'], ['campaigns'], ['dashboard']]);
      });

      source.addEventListener('discovery:progress', (event) => {
        const data = parse<DiscoveryProgress>(event);
        if (!data || !active) return;

        // Progress arrives per task; the lead list refreshes on lead:created,
        // so this only needs to drive the progress readout.
        setProgress((current) => ({ ...current, [data.sessionId]: data }));
      });

      source.addEventListener('discovery:complete', (event) => {
        const data = parse<{ sessionId: string }>(event);

        if (data && active) {
          setProgress((current) => {
            const next = { ...current };
            delete next[data.sessionId];
            return next;
          });
        }

        invalidate([['campaigns'], ['campaign'], ['sessions'], ['leads'], ['dashboard']]);
      });

      source.onerror = () => {
        source.close();
        if (!active) return;

        setStatus('reconnecting');

        const delay = Math.min(INITIAL_RETRY_MS * 2 ** attemptRef.current, MAX_RETRY_MS);
        attemptRef.current += 1;
        retryRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      active = false;
      sourceRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [queryClient]);

  const value = useMemo(() => ({ status, progress }), [status, progress]);

  return createElement(LiveContext.Provider, { value }, children);
}
