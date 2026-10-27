import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка в отдельную папку .next/standalone для хостинга Timeweb Cloud
  output: "standalone",
};

export default nextConfig;
