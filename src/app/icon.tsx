import { ImageResponse } from "next/og";

// Route Handler pour générer dynamiquement le favicon en PNG (32×32 et 48×48).
// Next.js intercepte automatiquement les requêtes vers /icon et /apple-icon.
//
// Note Satori : les filtres SVG (feGaussianBlur, feDropShadow) et
// radialGradient ne sont PAS supportés par le moteur de rendu Satori.
// On utilise uniquement des <path>, <rect> et linearGradient pour un
// rendu pixel-perfect dans l'onglet du navigateur.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <svg
        width="32"
        height="32"
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Dégradé feu principal — supporté par Satori */}
          <linearGradient id="fg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE500" />
            <stop offset="40%" stopColor="#FF6A00" />
            <stop offset="100%" stopColor="#FF1A00" />
          </linearGradient>

          {/* Dégradé sombre intérieur du P */}
          <linearGradient id="dg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2E0E02" />
            <stop offset="100%" stopColor="#120400" />
          </linearGradient>

          {/* Dégradé fond sombre (simule le radialGradient avec linear) */}
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E0700" />
            <stop offset="50%" stopColor="#0B0200" />
            <stop offset="100%" stopColor="#020000" />
          </linearGradient>

          {/* Dégradé glow simulé pour le cadre (plus opaque au centre) */}
          <linearGradient id="glowStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE500" />
            <stop offset="30%" stopColor="#FF8C00" />
            <stop offset="70%" stopColor="#FF4500" />
            <stop offset="100%" stopColor="#FF1A00" />
          </linearGradient>
        </defs>

        {/* Fond sombre — squircle arrondi */}
        <rect width="512" height="512" rx="128" fill="url(#bg)" />

        {/* Lueur simulée derrière le cadre — rectangle plus large semi-transparent */}
        <rect
          x="50"
          y="50"
          width="412"
          height="412"
          rx="110"
          fill="none"
          stroke="#FF6A00"
          strokeWidth="6"
          opacity="0.25"
        />
        <rect
          x="55"
          y="55"
          width="402"
          height="402"
          rx="106"
          fill="none"
          stroke="#FF8C00"
          strokeWidth="4"
          opacity="0.15"
        />

        {/* Cadre externe — squircle lumineux (sans filter, dégradé direct) */}
        <rect
          x="64"
          y="64"
          width="384"
          height="384"
          rx="100"
          fill="none"
          stroke="url(#glowStroke)"
          strokeWidth="18"
        />

        {/* Branche interne sombre du "P" — profondeur */}
        <path
          d="M174 150H300C345 150 376 182 376 226C376 270 345 302 300 302H236V362H174V150Z"
          fill="url(#dg)"
        />

        {/* Barre verticale lumineuse du P */}
        <path
          d="M174 150V362H202V150H174Z"
          fill="url(#fg)"
        />

        {/* Bol du P — courbe extérieure lumineuse */}
        <path
          d="M202 150H304C348 150 376 182 376 226C376 270 348 302 304 302H236V276H304C332 276 348 256 348 226C348 196 332 176 304 176H202V150Z"
          fill="url(#fg)"
        />

        {/* Détail intérieur du bol du P */}
        <path
          d="M236 200H294C312 200 324 210 324 226C324 242 312 252 294 252H236V200ZM262 218V234H288C292 234 296 230 296 226C296 222 292 218 288 218H262Z"
          fill="url(#fg)"
          opacity="0.9"
        />

        {/* Flamme en haut à droite */}
        <path
          d="M386 138C386 138 396 150 396 162C396 174 384 180 384 180C384 180 388 164 382 152C378 144 386 138 386 138Z"
          fill="url(#fg)"
        />

        {/* Plume d'écriture en bas à gauche */}
        <g transform="translate(145, 275) rotate(-10)">
          <path
            d="M5 95 C15 75, 45 60, 95 55 C90 65, 75 90, 45 95 C30 97, 15 98, 5 95 Z"
            fill="url(#fg)"
          />
          <path
            d="M95 55 L35 88"
            stroke="#120400"
            strokeWidth="3"
            strokeLinecap="round"
          />
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
