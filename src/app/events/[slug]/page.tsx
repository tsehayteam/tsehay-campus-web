export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import EventDetailClient from './EventDetailClient';

export default function EventDetailPage() {
  return <EventDetailClient />;
}
