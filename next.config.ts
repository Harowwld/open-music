import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['youtube-dl-exec', 'ffmpeg-static'],
};

export default nextConfig;
