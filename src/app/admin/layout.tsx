"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { ConfirmProvider } from "@/components/ConfirmDialog";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user && pathname !== "/admin") {
        router.push("/admin");
      } else {
        setAuthenticated(!!user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && pathname !== "/admin") {
        router.push("/admin");
      }
      setAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  if (pathname === "/admin") {
    return <>{children}</>;
  }

  if (authenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <ConfirmProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
        </main>
      </div>
    </ConfirmProvider>
  );
}
