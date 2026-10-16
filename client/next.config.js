/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL || "http://localhost:4000";

module.exports = {
  reactStrictMode: true,
  // The browser only ever talks to this Next.js app. Requests to /api/* are forwarded to the
  // Express server, so the session cookie stays first-party (no CORS, no third-party cookie issues).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};
