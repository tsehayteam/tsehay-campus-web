export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import AiClient from './AiClient';

export default function AiPage() {
  return <AiClient />;
}
