"use client";

import { FolderOpen, HardDrive, Download, Activity } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface StatsCardsProps {
  stats: {
    totalTransfers: number;
    activeTransfers: number;
    totalStorage: number;
    totalDownloads: number;
  } | null;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Total transfers",
      value: stats?.totalTransfers ?? "—",
      icon: FolderOpen,
    },
    {
      label: "Active transfers",
      value: stats?.activeTransfers ?? "—",
      icon: Activity,
    },
    {
      label: "Storage used",
      value: stats ? formatBytes(stats.totalStorage) : "—",
      icon: HardDrive,
    },
    {
      label: "Total downloads",
      value: stats?.totalDownloads ?? "—",
      icon: Download,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-gray-500 dark:text-gray-400">{card.label}</p>
            <card.icon className="h-4 w-4 text-gray-400 dark:text-gray-500" strokeWidth={1.75} />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50 u-tnum">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
