export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import MentorshipClient from './MentorshipClient';

export default function MentorshipPage() {
  return <MentorshipClient />;
}
