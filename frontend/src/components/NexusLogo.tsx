type NexusLogoProps = {
  className?: string;
  compact?: boolean;
  light?: boolean;
};

export default function NexusLogo({ className = "", compact = false, light = false }: NexusLogoProps) {
  const textColor = light ? "#FFFFFF" : "#17172F";
  const mutedColor = light ? "#B9B9D6" : "#696987";

  return (
    <div className={`inline-flex items-center gap-3 ${className}`} aria-label="Nexus360">
      <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="nexus-logo-gradient" x1="5" y1="4" x2="43" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B7CFF" />
            <stop offset="0.55" stopColor="#5B5CF0" />
            <stop offset="1" stopColor="#31C7B5" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="#20203D" />
        <path
          d="M12.5 31.5V16.8c0-2.3 2.8-3.4 4.4-1.8l14.2 14.2c1.6 1.6.5 4.3-1.8 4.3h-2.1c-.7 0-1.3-.3-1.8-.7L18.8 26v5.5a3.15 3.15 0 0 1-6.3 0Z"
          fill="url(#nexus-logo-gradient)"
        />
        <circle cx="34.5" cy="14" r="4.5" fill="#5AE7AC" />
        <path d="M29.5 14h-5.8" stroke="#8B7CFF" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {!compact && (
        <div className="leading-none">
          <div className="text-[21px] font-black tracking-[-0.04em]" style={{ color: textColor }}>
            nexus<span className="text-[#6869F2]">360</span>
          </div>
          <div className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.27em]" style={{ color: mutedColor }}>
            Performance Hub
          </div>
        </div>
      )}
    </div>
  );
}
