interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 28, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="6" fill="#ff3d33" />
      <g
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 12 H18" />
        <path d="M15 8.5 L19.5 12 L15 15.5" />
        <path d="M11 20 H22" />
        <path d="M19 16.5 L23.5 20 L19 23.5" />
      </g>
    </svg>
  );
}
