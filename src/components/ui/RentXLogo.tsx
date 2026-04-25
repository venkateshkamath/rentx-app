interface RentXLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'mark';
  /** On dark backgrounds pass true to flip wordmark text to light */
  onDark?: boolean;
}

export default function RentXLogo({ size = 'md', variant = 'full', onDark = false }: RentXLogoProps) {
  const px = { sm: 28, md: 34, lg: 42 }[size];
  const wordSize = { sm: 'text-[17px]', md: 'text-[20px]', lg: 'text-[26px]' }[size];

  /* ─── Mark ─── */
  const mark = (
    <svg
      width={px}
      height={px}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Background tile */}
      <rect width="40" height="40" rx="9" fill="#3A1F0A" />

      {/* ──────────────────────────────────────────
          Arrow 1 → (ivory/cream)
          Meaning: lend / rent out
          Body: x10,y14 → x23,y14  |  Head: > at x24,y14
          ────────────────────────────────────────── */}
      <path
        d="M 10 14 L 22 14"
        stroke="#FAF7F2"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M 18.5 10.5 L 23.5 14 L 18.5 17.5"
        stroke="#FAF7F2"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* ──────────────────────────────────────────
          Arrow 2 ← (copper/accent)
          Meaning: return / exchange back
          Body: x30,y26 → x18,y26  |  Head: < at x17,y26
          ────────────────────────────────────────── */}
      <path
        d="M 30 26 L 18 26"
        stroke="#C47038"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M 21.5 22.5 L 16.5 26 L 21.5 29.5"
        stroke="#C47038"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );

  if (variant === 'mark') return mark;

  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      {mark}
      <span
        className={`${wordSize} leading-none tracking-[-0.03em]`}
        style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}
      >
        <span
          className={`font-[300] ${onDark ? 'text-cream-200' : 'text-brown-600'}`}
        >
          rent
        </span>
        <span
          className="font-[800]"
          style={{ color: '#C47038' }}
        >
          X
        </span>
      </span>
    </span>
  );
}
