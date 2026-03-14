/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─── Performance ──────────────────────────────────────────────────
  // Optimize package imports to reduce bundle size and compile times
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
  // Prevent server-only modules from being bundled client-side
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
