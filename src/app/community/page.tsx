export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import CommunityClient from './CommunityClient';
import { getLiveCommunityPostsServer } from '@/lib/serverCourses';

export default async function CommunityPage() {
  const initialPosts = await getLiveCommunityPostsServer();
  return <CommunityClient initialPosts={initialPosts} />;
}

