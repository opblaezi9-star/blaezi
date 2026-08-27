import React from 'react';

interface NeepcoLogoProps {
  className?: string;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

export const NeepcoLogo: React.FC<NeepcoLogoProps> = ({
  className = 'w-16 h-8',
  size,
  width,
  height,
}) => {
  const style: React.CSSProperties = {};
  if (size) {
    style.width = size;
    style.height = 'auto';
  }
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <svg
      viewBox="0 0 1000 520"
      className={`inline-block select-none shrink-0 object-contain ${className}`}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="NTPC NEEPCO Official Logo"
    >
      <defs>
        {/* Clip path for circular NEEPCO emblem */}
        <clipPath id="neepcoCircleClipInner">
          <circle cx="740" cy="260" r="195" />
        </clipPath>

        {/* 5-pointed White Star */}
        <g id="ntpcNeepcoStar">
          <polygon
            points="0,-13 3.8,-4 12.3,-4 5.5,1.2 8.1,9.5 0,4.2 -8.1,9.5 -5.5,1.2 -12.3,-4 -3.8,-4"
            fill="#FFFFFF"
          />
        </g>
      </defs>

      {/* Main Outer Container Box */}
      <rect
        x="12"
        y="12"
        width="976"
        height="496"
        rx="64"
        fill="#FFFFFF"
        stroke="#004D8C"
        strokeWidth="24"
      />

      {/* Center Vertical Divider Bar */}
      <line
        x1="500"
        y1="12"
        x2="500"
        y2="508"
        stroke="#004D8C"
        strokeWidth="16"
      />

      {/* ================= LEFT HALF: NTPC ================= */}
      {/* Inner Rounded Sub-rectangle */}
      <rect
        x="42"
        y="42"
        width="416"
        height="436"
        rx="40"
        fill="none"
        stroke="#004D8C"
        strokeWidth="16"
      />

      {/* Hindi Text: एनटीपीसी */}
      <text
        x="250"
        y="222"
        textAnchor="middle"
        fill="#004D8C"
        fontSize="82"
        fontWeight="900"
        fontFamily="'Noto Sans Devanagari', 'Arial Unicode MS', 'Devanagari MT', 'Mangal', sans-serif"
        letterSpacing="1"
      >
        एनटीपीसी
      </text>

      {/* English Text: NTPC */}
      <text
        x="250"
        y="370"
        textAnchor="middle"
        fill="#004D8C"
        fontSize="98"
        fontWeight="900"
        fontFamily="'Arial Black', 'Helvetica Neue', 'Impact', sans-serif"
        letterSpacing="2"
      >
        NTPC
      </text>

      {/* ================= RIGHT HALF: NEEPCO ================= */}
      {/* Outer Red Circular Ring */}
      <circle
        cx="740"
        cy="260"
        r="200"
        fill="none"
        stroke="#BA1C24"
        strokeWidth="7"
      />

      {/* Clipped Inner Circle Content */}
      <g clipPath="url(#neepcoCircleClipInner)">
        {/* Red Background */}
        <rect x="530" y="50" width="420" height="420" fill="#BA1C24" />

        {/* Lightning Bolt at Top Center */}
        <polygon
          points="740,76 756,116 745,120 762,166 737,133 747,129"
          fill="#FFFFFF"
        />

        {/* Hindi Text: नीपको */}
        <text
          x="740"
          y="218"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="66"
          fontWeight="900"
          fontFamily="'Noto Sans Devanagari', 'Arial Unicode MS', 'Devanagari MT', 'Mangal', sans-serif"
          letterSpacing="1"
        >
          नीपको
        </text>

        {/* Center White Horizontal Band */}
        <rect x="530" y="234" width="420" height="66" fill="#FFFFFF" />

        {/* English Text in White Band: NEEPCO */}
        <text
          x="740"
          y="283"
          textAnchor="middle"
          fill="#BA1C24"
          fontSize="45"
          fontWeight="900"
          fontFamily="'Impact', 'Arial Black', 'Helvetica Neue', sans-serif"
          letterSpacing="6"
        >
          NEEPCO
        </text>

        {/* Bottom 8 Stars: 4 top, 3 middle, 1 bottom */}
        {/* Row 1 (4 stars) */}
        <use href="#ntpcNeepcoStar" x="642" y="342" />
        <use href="#ntpcNeepcoStar" x="704" y="340" />
        <use href="#ntpcNeepcoStar" x="776" y="340" />
        <use href="#ntpcNeepcoStar" x="838" y="342" />

        {/* Row 2 (3 stars) */}
        <use href="#ntpcNeepcoStar" x="672" y="376" />
        <use href="#ntpcNeepcoStar" x="740" y="376" />
        <use href="#ntpcNeepcoStar" x="808" y="376" />

        {/* Row 3 (1 star at bottom) */}
        <use href="#ntpcNeepcoStar" x="740" y="414" />
      </g>
    </svg>
  );
};
