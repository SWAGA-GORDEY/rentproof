import type { CategoryId } from "@/lib/catalog";

type IconProps = {
  className?: string;
};

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function CategoryIcon({
  category,
  className,
}: {
  category: CategoryId;
  className?: string;
}) {
  const classNames = className ?? "h-5 w-5";
  switch (category) {
    case "construction":
      return (
        <svg {...iconProps} className={classNames}>
          <path d="M3 18h13" />
          <path d="M5 18V9h6l2 3h4v6" />
          <path d="M14 12h5l2 3" />
          <circle cx="7" cy="18" r="1.6" />
          <circle cx="15" cy="18" r="1.6" />
        </svg>
      );
    case "tools":
      return (
        <svg {...iconProps} className={classNames}>
          <path d="M14.5 5.5a3.2 3.2 0 0 0-4.4 4.1L4 15.7 8.3 20l6.1-6.1a3.2 3.2 0 0 0 4.1-4.4L16 12l-2-2 2.5-2.5Z" />
        </svg>
      );
    case "photo":
      return (
        <svg {...iconProps} className={classNames}>
          <path d="M8 8.5 9.2 6h5.6L16 8.5h3.2v9.2H4.8V8.5H8Z" />
          <circle cx="12" cy="13" r="2.6" />
        </svg>
      );
    case "transport":
      return (
        <svg {...iconProps} className={classNames}>
          <path d="M3 15V8.5h11l3 3.2H21V15" />
          <path d="M3 15h18" />
          <circle cx="7" cy="16.8" r="1.6" />
          <circle cx="17" cy="16.8" r="1.6" />
        </svg>
      );
    case "events":
      return (
        <svg {...iconProps} className={classNames}>
          <path d="M6 15V9.5L14 7v10L6 15Z" />
          <path d="M14 9.2h2.2A2.8 2.8 0 0 1 19 12a2.8 2.8 0 0 1-2.8 2.8H14" />
          <path d="M8 15.2v2.3" />
          <path d="M12 16.6v2.3" />
        </svg>
      );
    case "sport":
      return (
        <svg {...iconProps} className={classNames}>
          <circle cx="7" cy="15" r="3" />
          <circle cx="17" cy="15" r="3" />
          <path d="M7 15h4l2-5h4" />
          <path d="M10 10 8.5 7" />
        </svg>
      );
    case "space":
      return (
        <svg {...iconProps} className={classNames}>
          <rect x="4" y="4" width="16" height="16" rx="1.5" />
          <path d="M4 10h16" />
          <path d="M12 10v10" />
        </svg>
      );
    case "special":
      return (
        <svg {...iconProps} className={classNames}>
          <path d="M4 18h8" />
          <path d="M7 18V8h3" />
          <path d="M10 8h8l2 4" />
          <path d="M16 12v3.5" />
          <path d="M13.5 15.5h5" />
        </svg>
      );
    default:
      return null;
  }
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className ?? "h-4 w-4"}>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="11" r="1.8" />
    </svg>
  );
}
