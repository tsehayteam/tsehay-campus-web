export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import CoursesClient from './CoursesClient';

export default function CoursesPage() {
  return <CoursesClient />;
}

