import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["imapflow", "nodemailer", "mailparser"],
};

export default nextConfig;
