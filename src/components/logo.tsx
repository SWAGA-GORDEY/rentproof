type LogoProps = {
  tone?: "dark" | "light";
  className?: string;
};

export function Logo({ tone = "dark", className }: LogoProps) {
  const plate = tone === "light" ? "#F4F7FB" : "#0C2340";
  const mark = tone === "light" ? "#0C2340" : "#F7F8FB";
  const word = tone === "light" ? "#F4F7FB" : "#172033";
  const accent = tone === "light" ? "#D5E4F6" : "#1A4F8B";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <svg viewBox="0 0 36 36" aria-hidden="true" className="h-9 w-9 shrink-0">
        <path
          d="M18 2.8 31.2 7.6v10.2c0 7.6-5.4 13-13.2 16.1C10.2 30.8 4.8 25.4 4.8 17.8V7.6L18 2.8Z"
          fill={plate}
        />
        <path
          d="M12.2 18.4 16.3 22.4 24.2 13.4"
          fill="none"
          stroke={mark}
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 25.2h14"
          fill="none"
          stroke={accent}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span
        className="font-display text-[1.05rem] leading-none font-semibold tracking-tight sm:text-lg"
        style={{ color: word }}
      >
        Rent<span style={{ color: accent }}>Proof</span>
      </span>
    </span>
  );
}
