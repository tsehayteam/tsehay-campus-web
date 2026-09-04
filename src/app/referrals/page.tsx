export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import ReferralsClient from './ReferralsClient';

export default function ReferralsLandingPage() {
  return <ReferralsClient />;
}
