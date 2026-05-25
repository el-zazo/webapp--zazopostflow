import React from "react";

interface LogoIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  showBackground?: boolean;
}

export const LogoIcon: React.FC<LogoIconProps> = ({
  size = 120,
  showBackground = true,
  className,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} select-none`}
      {...props}
    >
      <defs>
        {/* Dégradé principal Orange/Feu ultra-lumineux */}
        <linearGradient id="fireGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE500" />
          <stop offset="40%" stopColor="#FF6A00" />
          <stop offset="100%" stopColor="#FF1A00" />
        </linearGradient>

        {/* Dégradé pour le corps sombre intérieur du P */}
        <linearGradient id="darkPGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2E0E02" />
          <stop offset="100%" stopColor="#120400" />
        </linearGradient>

        {/* Dégradé d'arrière-plan de l'icône */}
        <radialGradient id="bgGradient" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#1E0700" />
          <stop offset="60%" stopColor="#0B0200" />
          <stop offset="100%" stopColor="#020000" />
        </radialGradient>

        {/* Filtre de lueur (Glow Effect) pour la bordure externe */}
        <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="16" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Ombre portée douce sous les éléments internes */}
        <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* Fond de l'icône */}
      {showBackground && (
        <rect
          width="512"
          height="512"
          rx="128"
          fill="url(#bgGradient)"
        />
      )}

      {/* Groupe principal avec lueur et ombres */}
      <g filter="url(#dropShadow)">
        
        {/* Cadre externe (Squircle brillant avec lueur) */}
        <rect
          x="64"
          y="64"
          width="384"
          height="384"
          rx="100"
          fill="none"
          stroke="url(#fireGradient)"
          strokeWidth="18"
          filter="url(#goldGlow)"
        />

        {/* Branche interne sombre du "P" pour créer de la profondeur */}
        <path
          d="M174 150H300C345 150 376 182 376 226C376 270 345 302 300 302H236V362H174V150Z"
          fill="url(#darkPGradient)"
        />

        {/* Tracé principal du "P" (Bandes externes lumineuses) */}
        <path
          d="M174 150V362H202V150H174Z"
          fill="url(#fireGradient)"
        />

        <path
          d="M202 150H304C348 150 376 182 376 226C376 270 348 302 304 302H236V276H304C332 276 348 256 348 226C348 196 332 176 304 176H202V150Z"
          fill="url(#fireGradient)"
        />

        <path
          d="M236 200H294C312 200 324 210 324 226C324 242 312 252 294 252H236V200ZM262 218V234H288C292 234 296 230 296 226C296 222 292 218 288 218H262Z"
          fill="url(#fireGradient)"
          opacity="0.9"
        />

        {/* Ergot / Flamme en haut à droite */}
        <path
          d="M386 138C386 138 396 150 396 162C396 174 384 180 384 180C384 180 388 164 382 152C378 144 386 138 386 138Z"
          fill="url(#fireGradient)"
        />

        {/* La Plume d'écriture (Feather) en bas à gauche */}
        <g transform="translate(145, 275) rotate(-10)">
          <path
            d="M5 95 C15 75, 45 60, 95 55 C90 65, 75 90, 45 95 C30 97, 15 98, 5 95 Z"
            fill="url(#fireGradient)"
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
      </g>
    </svg>
  );
};
