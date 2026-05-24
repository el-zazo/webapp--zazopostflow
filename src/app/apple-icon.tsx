import { ImageResponse } from "next/og";

// Apple Touch Icon (180×180) — pour les raccourcis iOS/Home Screen.
// Même logo que icon.tsx mais en plus grand, sans filtres SVG (Satori-compatible).

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg
        width="180"
        height="180"
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="fg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE500" />
            <stop offset="40%" stopColor="#FF6A00" />
            <stop offset="100%" stopColor="#FF1A00" />
          </linearGradient>

          <linearGradient id="dg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2E0E02" />
            <stop offset="100%" stopColor="#120400" />
          </linearGradient>

          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E0700" />
            <stop offset="50%" stopColor="#0B0200" />
            <stop offset="100%" stopColor="#020000" />
          </linearGradient>

          <linearGradient id="glowStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE500" />
            <stop offset="30%" stopColor="#FF8C00" />
            <stop offset="70%" stopColor="#FF4500" />
            <stop offset="100%" stopColor="#FF1A00" />
          </linearGradient>
        </defs>

        <rect width="512" height="512" rx="128" fill="url(#bg)" />

        {/* Lueur simulée */}
        <rect
          x="50" y="50" width="412" height="412" rx="110"
          fill="none" stroke="#FF6A00" strokeWidth="6" opacity="0.25"
        />
        <rect
          x="55" y="55" width="402" height="402" rx="106"
          fill="none" stroke="#FF8C00" strokeWidth="4" opacity="0.15"
        />

        {/* Cadre externe */}
        <rect
          x="64" y="64" width="384" height="384" rx="100"
          fill="none" stroke="url(#glowStroke)" strokeWidth="18"
        />

        {/* P sombre intérieur */}
        <path
          d="M174 150H300C345 150 376 182 376 226C376 270 345 302 300 302H236V362H174V150Z"
          fill="url(#dg)"
        />

        {/* Barre verticale du P */}
        <path d="M174 150V362H202V150H174Z" fill="url(#fg)" />

        {/* Bol du P */}
        <path
          d="M202 150H304C348 150 376 182 376 226C376 270 348 302 304 302H236V276H304C332 276 348 256 348 226C348 196 332 176 304 176H202V150Z"
          fill="url(#fg)"
        />

        {/* Détail intérieur du bol */}
        <path
          d="M236 200H294C312 200 324 210 324 226C324 242 312 252 294 252H236V200ZM262 218V234H288C292 234 296 230 296 226C296 222 292 218 288 218H262Z"
          fill="url(#fg)" opacity="0.9"
        />

        {/* Flamme */}
        <path
          d="M386 138C386 138 396 150 396 162C396 174 384 180 384 180C384 180 388 164 382 152C378 144 386 138 386 138Z"
          fill="url(#fg)"
        />

        {/* Plume */}
        <g transform="translate(145, 275) rotate(-10)">
          <path d="M5 95 C15 75, 45 60, 95 55 C90 65, 75 90, 45 95 C30 97, 15 98, 5 95 Z" fill="url(#fg)" />
          <path d="M95 55 L35 88" stroke="#120400" strokeWidth="3" strokeLinecap="round" />
          <path d="M78 61 L82 56" stroke="#120400" strokeWidth="2" />
          <path d="M65 67 L70 61" stroke="#120400" strokeWidth="2" />
          <path d="M52 73 L56 67" stroke="#120400" strokeWidth="2" />
          <path d="M40 79 L44 72" stroke="#120400" strokeWidth="2" />
        </g>
      </svg>
    ),
    {
      ...size,
    }
  );
}
