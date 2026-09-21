import type { Metadata } from "next";
import { Inter, Noto_Sans_Kannada } from "next/font/google";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const notoSansKannada = Noto_Sans_Kannada({
  subsets: ["kannada"],
  variable: "--font-kannada",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KSP Fitness",
  description:
    "Karnataka State Police Staff Fitness & Health Management Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(inter.variable, notoSansKannada.variable)}
    >
      <body className="font-sans antialiased">
        {/* One-time cleanup of corrupted Firestore persistent cache */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof indexedDB !== 'undefined' && !localStorage.getItem('_fs_cache_cleared_v1')) {
                    var dbs = ['firestore/[DEFAULT]/ksp-fitness/main',
                               'firebaseLocalStorageDb',
                               'firebase-heartbeat-database'];
                    if (indexedDB.databases) {
                      indexedDB.databases().then(function(dbList) {
                        dbList.forEach(function(db) {
                          if (db.name && (db.name.indexOf('firestore') !== -1 || db.name.indexOf('firebase') !== -1)) {
                            indexedDB.deleteDatabase(db.name);
                          }
                        });
                        localStorage.setItem('_fs_cache_cleared_v1', '1');
                      });
                    } else {
                      dbs.forEach(function(name) { indexedDB.deleteDatabase(name); });
                      localStorage.setItem('_fs_cache_cleared_v1', '1');
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
