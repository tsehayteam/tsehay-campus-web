'use client';

import useSWR from 'swr';
import { useEffect } from 'react';
import { getCachedCourses, saveCachedCourses, DEFAULT_COURSES } from '@/lib/courseCache';
import { swrFetcher, globalSWRConfig } from '@/lib/swrConfig';

export function useCoursesSWR() {
  const initialCached = typeof window !== 'undefined' ? getCachedCourses() : DEFAULT_COURSES;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    '/api/courses',
    swrFetcher,
    {
      ...globalSWRConfig,
      fallbackData: { success: true, count: initialCached.length, courses: initialCached },
      onSuccess: (responseData) => {
        if (responseData?.courses && Array.isArray(responseData.courses) && responseData.courses.length > 0) {
          saveCachedCourses(responseData.courses);
        }
      },
    }
  );

  const courses: any[] = data?.courses && Array.isArray(data.courses) && data.courses.length > 0
    ? data.courses
    : initialCached;

  return {
    courses,
    isLoading: isLoading && courses.length === 0,
    isValidating,
    isError: Boolean(error),
    error,
    mutateCourses: mutate,
  };
}
