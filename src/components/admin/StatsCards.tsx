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
      label: "Total Transfers",
      value: stats?.totalTransfers ?? "—",
      icon: FolderOpen,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Active Transfers",
      value: stats?.activeTransfers ?? "—",
      icon: Activity,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Storage Used",
      value: stats ? formatBytes(stats.totalStorage) : "—",
      icon: HardDrive,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Total Downloads",
      value: stats?.totalDownloads ?? "—",
      icon: Download,
      color: "text-orange-600 bg-orange-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="card">
          <div className="flex items-center gap-4">
            <div className={`rounded-lg p-2.5 ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
