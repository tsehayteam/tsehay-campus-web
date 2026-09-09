'use client';

import useSWR from 'swr';
import { getCachedEvents, saveCachedEvents, DEFAULT_EVENTS, TsehayEvent } from '@/lib/eventCache';
import { swrFetcher, globalSWRConfig } from '@/lib/swrConfig';

export function useEventsSWR() {
  const initialCached = typeof window !== 'undefined' ? getCachedEvents() : DEFAULT_EVENTS;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    '/api/events',
    swrFetcher,
    {
      ...globalSWRConfig,
      fallbackData: { success: true, count: initialCached.length, events: initialCached },
      onSuccess: (responseData) => {
        if (responseData?.events && Array.isArray(responseData.events) && responseData.events.length > 0) {
          saveCachedEvents(responseData.events);
        }
      },
    }
  );

  const events: TsehayEvent[] = data?.events && Array.isArray(data.events) && data.events.length > 0
    ? data.events
    : initialCached;

  return {
    events,
    isLoading: isLoading && events.length === 0,
    isValidating,
    isError: Boolean(error),
    error,
    mutateEvents: mutate,
  };
}
