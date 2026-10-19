import type { NextConfig } from "next";

// Every page reads live client data, so the app renders per request.
// Cache Components is left off to keep that model simple.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
