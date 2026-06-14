import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/auth/', '/dashboard', '/settings/','/cpd/', '/pdp/', '/profile/', '/settings/', '/api/'],
    },
    sitemap: 'https://umbil.co.uk/sitemap.xml',
  };
}