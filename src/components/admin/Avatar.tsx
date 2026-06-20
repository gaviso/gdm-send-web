"use client";

interface AvatarProps {
  url?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
}

function initials(name?: string | null, email?: string | null): string {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).slice(0, 2);
  if (parts.length === 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return src.slice(0, 2).toUpperCase();
}

export default function Avatar({
  url,
  name,
  email,
  size = 32,
  className = "",
}: AvatarProps) {
  const dimension = `${size}px`;
  const fontSize = Math.max(10, Math.floor(size * 0.4));

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={name || email || "Avatar"}
        className={`rounded-full object-cover bg-gray-100 dark:bg-gray-800 ${className}`}
        style={{ width: dimension, height: dimension }}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-medium select-none ${className}`}
      style={{ width: dimension, height: dimension, fontSize }}
      aria-label={name || email || "Avatar"}
    >
      {initials(name, email)}
    </div>
  );
}
