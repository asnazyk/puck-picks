// src/middleware.ts (Clerk v6)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public pages (no auth required)
const isPublicRoute = createRouteMatcher([
  '/',                // home
  '/standings',       // standings
  '/matchups',        // matchups
  '/sign-in(.*)',     // Clerk auth pages
  '/sign-up(.*)',
  '/favicon.ico',     // favicon
  '/_next/static/(.*)',
  '/_next/image/(.*)',
]);

export default clerkMiddleware((auth, req) => {
  // Allow public routes through
  if (isPublicRoute(req)) return;
  // Everything else requires auth
  auth().protect();
});

// Make sure middleware runs on app routes but skips static assets
export const config = {
  matcher: [
    // Skip files in /_next, all static files, and the favicon
    '/((?!(?:_next|.*\\..*|favicon.ico)).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
};
