import { SWRConfiguration } from 'swr';

export const swrFetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const error: any = new Error('An error occurred while fetching the data.');
    error.status = res.status;
    try {
      error.info = await res.json();
    } catch (e) {}
    throw error;
  }
  return res.json();
};

export const globalSWRConfig: SWRConfiguration = {
  fetcher: swrFetcher,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  dedupingInterval: 10000, // 10s deduplication window
  focusThrottleInterval: 15000,
  errorRetryCount: 3,
  errorRetryInterval: 4000,
  keepPreviousData: true,
};
