"use client";

import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove any extension-added classes during hydration
  useEffect(() => {
    // This runs only on the client after hydration
    document.body.className = "antialiased";
  }, []);

  return (
    <>
      <div className="min-h-screen flex flex-col antialiased">
        <main className="flex-1">{children}</main>
        <footer className="bg-gray-50 border-t border-gray-200 py-4">
          <div className="container mx-auto px-4 text-center text-sm text-gray-600">
            <p>浙ICP备2025178318号</p>
          </div>
        </footer>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#9333ea",
              secondary: "#fff",
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </>
  );
}
