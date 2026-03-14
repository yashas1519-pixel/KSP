"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for monitoring (replace with logger utility in production)
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("Global error:", error);
    }
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-sm text-center">
        {/* Shield icon */}
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "#1A3C6B" }}
        >
          <span className="text-2xl text-white">⚠️</span>
        </div>

        <h1 className="mt-4 font-kannada text-xl font-bold text-slate-800">
          ಏನೋ ತಪ್ಪಾಗಿದೆ
        </h1>
        <p className="text-sm text-slate-500">Something went wrong</p>
        <p className="mt-2 text-xs text-slate-400">
          {error.message || "An unexpected error occurred."}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            onClick={reset}
            className="w-full text-white"
            style={{ backgroundColor: "#1A3C6B" }}
          >
            <span className="font-kannada">ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ</span>
            <span className="ml-1 text-xs opacity-75">Try Again</span>
          </Button>

          <Link href="/login" className="text-sm text-slate-500 underline hover:text-slate-700">
            <span className="font-kannada">ಲಾಗಿನ್ ಪುಟಕ್ಕೆ ಹೋಗಿ</span>
            <span className="ml-1">Go to Login</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
