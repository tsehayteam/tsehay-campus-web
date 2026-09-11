import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/maintenance', '/admin', '/api/', '/dashboard/'],
      },
    ],
    sitemap: 'https://www.tsehaycampus.com/sitemap.xml',
  };
}
