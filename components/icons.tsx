// Friendly rounded icons - one consistent 1.75 stroke, currentColor, no fill.

type P = { className?: string; size?: number };

function base(size = 18) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export const SendIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M4.5 12h13M11 5.5l6.5 6.5L11 18.5" />
  </svg>
);

export const SparkleIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M12 3.5c.4 3.8 1.7 5.1 5.5 5.5-3.8.4-5.1 1.7-5.5 5.5-.4-3.8-1.7-5.1-5.5-5.5 3.8-.4 5.1-1.7 5.5-5.5Z" />
    <path d="M18.5 15c.2 1.6.7 2.1 2.3 2.3-1.6.2-2.1.7-2.3 2.3-.2-1.6-.7-2.1-2.3-2.3 1.6-.2 2.1-.7 2.3-2.3Z" />
  </svg>
);

export const CheckIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
  </svg>
);

export const BoltIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M13 3 5 13.5h5l-1 7.5 8-10.5h-5l1-7.5Z" />
  </svg>
);

export const CoinIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5v9M9.5 9.5c0-1.1 1.1-1.6 2.5-1.6s2.5.6 2.5 1.7-1.1 1.5-2.5 1.5-2.5.5-2.5 1.6 1.1 1.6 2.5 1.6 2.5-.6 2.5-1.6" />
  </svg>
);

export const CacheIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <ellipse cx="12" cy="6" rx="7.5" ry="2.8" />
    <path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6" />
    <path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" />
  </svg>
);

export const ChartIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M4 20h16" />
    <rect x="5.5" y="12" width="3" height="6" rx="1" />
    <rect x="10.5" y="7" width="3" height="11" rx="1" />
    <rect x="15.5" y="9.5" width="3" height="8.5" rx="1" />
  </svg>
);

export const BrainIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M9 5.5a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 5 12.5 2.5 2.5 0 0 0 7 17a2.5 2.5 0 0 0 4.5 1.3V6.2A2.5 2.5 0 0 0 9 5.5Z" />
    <path d="M15 5.5A2.5 2.5 0 0 1 17.5 8 2.5 2.5 0 0 1 19 12.5 2.5 2.5 0 0 1 17 17a2.5 2.5 0 0 1-4.5 1.3" />
  </svg>
);

export const HistoryIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M4 12a8 8 0 1 1 2.5 5.8" />
    <path d="M4 12H2.5M4 12l-1.6-1.8M12 8v4l3 2" />
  </svg>
);

export const PowerIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M12 3.5v7" />
    <path d="M7 6.5a7 7 0 1 0 10 0" />
  </svg>
);

export const RouteIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="6" cy="6" r="2.2" />
    <circle cx="6" cy="18" r="2.2" />
    <circle cx="18" cy="12" r="2.2" />
    <path d="M8.2 6h3.3a4 4 0 0 1 4 4v.3M8.2 18h3.3a4 4 0 0 0 4-4v-.3" />
  </svg>
);

export const ArrowIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M5 12h13M12.5 6l6 6-6 6" />
  </svg>
);

export const ChevronIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const XIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const AlertIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M12 3.5 2.5 20h19L12 3.5Z" />
    <path d="M12 10v4.2M12 17.4v.1" />
  </svg>
);

export const TargetIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="12" cy="12" r="8.2" />
    <circle cx="12" cy="12" r="3.6" />
  </svg>
);
