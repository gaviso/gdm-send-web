"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  LogOut,
  UserCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import Logo from "@/components/Logo";
import Avatar from "@/components/admin/Avatar";
import ThemeToggle from "@/components/ThemeToggle";
import pkg from "../../../package.json";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/transfers", label: "Transfers", icon: FolderOpen },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/profile", label: "Profile", icon: UserCircle },
];

interface ProfileSummary {
  email: string;
  full_name: string;
  avatar_url: string | null;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile({
            email: data.email,
            full_name: data.full_name || "",
            avatar_url: data.avatar_url,
          });
        }
      } catch {
        // ignore
      }
    };
    load();
    const onUpdate = () => load();
    window.addEventListener("profile-updated", onUpdate);
    return () => window.removeEventListener("profile-updated", onUpdate);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin";
  };

  return (
    <aside className="flex h-screen w-[248px] flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-2.5 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <div className="flex flex-col leading-tight">
            <span className="text-[14px] font-semibold tracking-tight text-gray-950 dark:text-gray-50">
              GDM Send
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Admin</span>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {nav.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-gray-100 text-gray-950 dark:bg-gray-800 dark:text-gray-50"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-50"
              }`}
            >
              <item.icon
                className={`h-[18px] w-[18px] ${isActive ? "text-gray-950 dark:text-gray-50" : "text-gray-500 dark:text-gray-400"}`}
                strokeWidth={1.75}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-2">
        <Link
          href="/admin/profile"
          className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors duration-150"
        >
          <Avatar
            url={profile?.avatar_url}
            name={profile?.full_name}
            email={profile?.email}
            size={32}
          />
          <div className="flex-1 min-w-0 leading-tight">
            <p className="truncate text-[13px] font-medium text-gray-950 dark:text-gray-50">
              {profile?.full_name || profile?.email || "Admin"}
            </p>
            {profile?.full_name && profile?.email && (
              <p className="truncate text-[11px] text-gray-500 dark:text-gray-400 u-mono">
                {profile.email}
              </p>
            )}
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-50 transition-colors duration-150"
        >
          <LogOut className="h-[18px] w-[18px] text-gray-500 dark:text-gray-400" strokeWidth={1.75} />
          Sign out
        </button>
        <div className="px-3 py-1 text-[11px] text-gray-400 dark:text-gray-500 u-mono">
          v{pkg.version}
        </div>
      </div>
    </aside>
  );
}
