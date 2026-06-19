/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Prevent browsers from MIME-sniffing the content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Block the page from being embedded in iframes (clickjacking protection).
  { key: "X-Frame-Options", value: "DENY" },
  // Enable legacy XSS filter in older browsers.
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Restrict the Referer header to the origin when navigating cross-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Enforce HTTPS for 1 year (enable only after confirming TLS is always on).
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Restrict browser feature usage. Microphone is needed for voice booking;
  // geolocation is needed for optional check-in coordinates.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(self), payment=()",
  },
  // Content-Security-Policy:
  // NOTE: 'unsafe-inline' and 'unsafe-eval' are required by Next.js during
  // development. For production, replace with nonce-based CSP after testing.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
};

module.exports = nextConfig;
