/** Syllabot mark: a bookmark ribbon with a mint "found it" dot. Hand-drawn SVG. */
export default function BrandMark({ size = 28, className = "" }) {
  return (
    <svg
      className={className}
      width={size}
      height={(size * 32) / 28}
      viewBox="0 0 28 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7 1.5h14a3.5 3.5 0 0 1 3.5 3.5v24.2a1.2 1.2 0 0 1-1.9 1L14 23.9l-8.6 6.3a1.2 1.2 0 0 1-1.9-1V5A3.5 3.5 0 0 1 7 1.5Z"
        fill="currentColor"
      />
      <circle cx="14" cy="11.5" r="3.6" fill="#BFE8D5" />
    </svg>
  );
}
