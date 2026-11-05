import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fotos de tickets (ya achicadas en el celular)
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
