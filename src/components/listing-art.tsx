import type { CategoryId } from "@/lib/catalog";

const frame = {
  fill: "none",
  stroke: "#0C2340",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ListingArt({ category }: { category: string }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-[#e7eef6]">
      <div className="blueprint absolute inset-0 opacity-80" />
      <svg viewBox="0 0 320 200" aria-hidden="true" className="absolute inset-0 h-full w-full">
        <circle cx="250" cy="42" r="46" fill="#d5e3f4" />
        <Scene category={sceneFor(category)} />
      </svg>
    </div>
  );
}

function sceneFor(category: string): CategoryId {
  if (category === "cars" || category === "motorcycles") {
    return "transport";
  }
  if (category === "electronics" || category === "appliances") {
    return "events";
  }
  if (category === "camping") {
    return "space";
  }
  if (category === "other") {
    return "special";
  }
  if (
    category === "construction" ||
    category === "tools" ||
    category === "photo" ||
    category === "transport" ||
    category === "events" ||
    category === "sport" ||
    category === "space" ||
    category === "special"
  ) {
    return category;
  }
  return "special";
}

function Scene({ category }: { category: CategoryId }) {
  switch (category) {
    case "construction":
      return (
        <g {...frame}>
          <path d="M38 150h150" />
          <path d="M58 150V92h62l18 22h48v36" />
          <path d="M138 114h46l16 18" />
          <circle cx="86" cy="150" r="12" />
          <circle cx="168" cy="150" r="12" />
          <path d="M78 92V74h28" />
        </g>
      );
    case "tools":
      return (
        <g {...frame}>
          <path d="M196 58a34 34 0 0 0-46 42L86 164l28 22 64-64a34 34 0 0 0 42-46l-24 22-22-18 22-22Z" />
          <path d="M104 146l22 18" />
        </g>
      );
    case "photo":
      return (
        <g {...frame}>
          <rect x="70" y="68" width="180" height="92" rx="10" />
          <path d="M118 68 132 50h56l14 18" />
          <circle cx="160" cy="114" r="24" />
          <circle cx="160" cy="114" r="10" />
          <path d="M214 86h16" />
        </g>
      );
    case "transport":
      return (
        <g {...frame}>
          <path d="M42 132V86h108l28 28h62v18" />
          <path d="M42 132h198" />
          <path d="M150 86v46" />
          <circle cx="92" cy="146" r="14" />
          <circle cx="214" cy="146" r="14" />
        </g>
      );
    case "events":
      return (
        <g {...frame}>
          <path d="M78 132V78l92-22v98l-92-22Z" />
          <path d="M170 90h28a30 30 0 0 1 0 60h-28" />
          <path d="M104 132v22" />
          <path d="M146 142v22" />
          <path d="M86 154h84" />
        </g>
      );
    case "sport":
      return (
        <g {...frame}>
          <circle cx="92" cy="132" r="28" />
          <circle cx="214" cy="132" r="28" />
          <path d="M92 132h48l22-46h52" />
          <path d="M128 86 112 58" />
          <path d="M112 58h28" />
        </g>
      );
    case "space":
      return (
        <g {...frame}>
          <rect x="78" y="42" width="164" height="120" rx="6" />
          <path d="M78 86h164" />
          <path d="M160 86v76" />
          <path d="M110 108h28" />
          <path d="M186 126h28" />
          <path d="M186 64h24" />
        </g>
      );
    case "special":
      return (
        <g {...frame}>
          <path d="M46 156h92" />
          <path d="M78 156V78h28" />
          <path d="M106 78h118l18 28" />
          <path d="M196 106v28" />
          <path d="M176 134h40" />
          <circle cx="70" cy="156" r="10" />
          <circle cx="118" cy="156" r="10" />
        </g>
      );
    default:
      return null;
  }
}
