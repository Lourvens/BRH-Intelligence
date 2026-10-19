/**
 * The hero's technical backdrop: a masked grid, two orbits, and a retrieval
 * path. All decorative, so it is hidden from assistive tech and never carries
 * information that is not in the copy.
 */
export function HeroBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="hero-grid absolute inset-0 opacity-70" />

      <svg
        className="absolute -right-52 -top-48 h-[960px] w-[1180px] text-navy/[0.14]"
        viewBox="0 0 1180 960"
        fill="none"
      >
        <circle cx="700" cy="430" r="360" stroke="currentColor" />
        <circle
          cx="700"
          cy="430"
          r="264"
          stroke="currentColor"
          strokeDasharray="1 11"
        />
        <circle cx="700" cy="430" r="168" stroke="currentColor" />
        <path
          d="M80 840 C 290 620, 430 720, 700 430 S 980 180, 1140 250"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle cx="700" cy="430" r="7" fill="currentColor" />
        <circle cx="430" cy="700" r="4" fill="currentColor" />
        <circle cx="1010" cy="245" r="4" fill="currentColor" />
      </svg>

      <svg
        className="absolute -left-52 top-1/3 h-[520px] w-[640px] text-azure/[0.22]"
        viewBox="0 0 640 520"
        fill="none"
      >
        <circle cx="250" cy="260" r="210" stroke="currentColor" />
        <circle
          cx="250"
          cy="260"
          r="145"
          stroke="currentColor"
          strokeDasharray="1 9"
        />
        <circle cx="250" cy="260" r="5" fill="currentColor" />
      </svg>

      <div className="absolute inset-x-0 top-0 h-px bg-border/70" />
    </div>
  );
}
