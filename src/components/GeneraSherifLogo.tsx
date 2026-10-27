export function GeneraSherifLogo({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 92"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Top face - black with white stroke */}
      <path d="M50 4 L88.5 26.5 L50 49 L11.5 26.5 Z" fill="#0B0F0D" stroke="white" strokeWidth="3.2" strokeLinejoin="round" />
      {/* Right side green */}
      <path d="M88.5 26.5 L50 49 L50 86 L88.5 63.5 Z" fill="#16A538" stroke="white" strokeWidth="3.2" strokeLinejoin="round" />
      {/* Left side green */}
      <path d="M11.5 26.5 L50 49 L50 86 L11.5 63.5 Z" fill="#16A538" stroke="white" strokeWidth="3.2" strokeLinejoin="round" />
      {/* Fabric layer lines - white */}
      <path d="M16 48 L50 67.5 L84 48" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M16 61 L50 80.5 L72 68" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Stylized G on top face - white thick G */}
      <path
        d="M68.5 22.2 L50.2 32.6 L36.5 24.6 L50.8 16.2 L63.5 23.4 L53.5 28.9 L47.2 25.4 L50.8 23.4 L55.5 26"
        stroke="white"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
