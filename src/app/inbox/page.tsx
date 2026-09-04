export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import InboxClient from './InboxClient';

export default function InboxPage() {
  return <InboxClient />;
}
