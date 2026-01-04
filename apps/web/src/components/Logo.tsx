interface LogoProps {
  size?: number;
  className?: string;
}

// Simple icon version for navbar - clean glass pill design
export function LogoIcon({ size = 32, className = '' }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8"/>
          <stop offset="100%" stopColor="#0284c7"/>
        </linearGradient>
        <linearGradient id="logoShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>
      </defs>
      
      {/* Background */}
      <rect width="64" height="64" rx="16" fill="url(#logoBg)"/>
      
      {/* Glass shine */}
      <rect x="4" y="4" width="56" height="28" rx="12" fill="url(#logoShine)"/>
      
      {/* Pill - simple capsule */}
      <g transform="translate(32,32) rotate(-45) translate(-32,-32)">
        {/* White top half */}
        <rect x="24" y="16" width="16" height="16" rx="8" ry="8" fill="white"/>
        <rect x="24" y="24" width="16" height="8" fill="white"/>
        
        {/* Yellow bottom half */}
        <rect x="24" y="32" width="16" height="8" fill="#fbbf24"/>
        <rect x="24" y="32" width="16" height="16" rx="8" ry="8" fill="#fbbf24"/>
        <rect x="24" y="32" width="16" height="8" fill="#fbbf24"/>
      </g>
    </svg>
  );
}

// Full logo with text
export function Logo({ size = 40, className = '' }: LogoProps) {
  return <LogoIcon size={size} className={className} />;
}
