/** @type {import('next').NextConfig} */
const nextConfig = {

  // ─── Performance ──────────────────────────────────────────────────
  experimental: {
    optimizePackageImports: [
      "recharts",
      "firebase",
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
      "lucide-react",
      "zod",
    ],
  },

  // Disable source maps in production for smaller bundles
  productionBrowserSourceMaps: false,

  // ─── Firebase / Server-only fixes ─────────────────────────────────
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
