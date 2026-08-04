import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "**.instagram.com",
      },
      {
        protocol: "https",
        hostname: "nhcubnlnnzmbkwuykwfa.supabase.co",
        pathname: "/storage/v1/object/public/product-images/**"
      },
    ],
  },
};

export default nextConfig;
