"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md border-0 text-center shadow-lg">
        <CardHeader className="pb-2 pt-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-red-600"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-8 pb-8">
          <div>
            <h1 className="font-kannada text-xl font-bold text-slate-800">
              ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ
            </h1>
            <p className="text-lg font-semibold text-slate-600">
              Access Denied
            </p>
          </div>

          <p className="text-sm text-slate-500">
            You do not have permission to access this page. Please contact your
            administrator if you believe this is an error.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="w-full"
            >
              Go Back
            </Button>
            <Button
              onClick={() => router.replace(ROUTES.LOGIN)}
              className="w-full"
              style={{ backgroundColor: "#1A3C6B" }}
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
