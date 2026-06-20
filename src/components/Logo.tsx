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
      <rect width="32" height="32" rx="8" fill="#09090b" />
      <path
        d="M11 11.5C11 10.6716 11.6716 10 12.5 10H15.5C16.3284 10 17 10.6716 17 11.5V14.5C17 15.3284 16.3284 16 15.5 16H12.5C11.6716 16 11 15.3284 11 14.5V11.5Z"
        fill="white"
      />
      <path
        d="M15 17.5C15 16.6716 15.6716 16 16.5 16H19.5C20.3284 16 21 16.6716 21 17.5V20.5C21 21.3284 20.3284 22 19.5 22H16.5C15.6716 22 15 21.3284 15 20.5V17.5Z"
        fill="#3b6cf4"
      />
    </svg>
  );
}
