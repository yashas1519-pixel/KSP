import type { Metadata } from "next";
import { Inter, Noto_Sans_Kannada } from "next/font/google";
import { cn } from "@/lib/utils";
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
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
