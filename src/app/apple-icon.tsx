import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const ARM_ANGLES = [0, 60, 120];

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7fbfe',
      }}
    >
      <svg width="132" height="132" viewBox="0 0 48 48">
        {ARM_ANGLES.map((angle) => (
          <g key={angle} transform={`rotate(${angle} 24 24)`}>
            <rect x="22" y="3.5" width="4" height="41" rx="2" fill="#0068a7" />
            <path
              d="M18.5 10 L24 14.5 L29.5 10 M18.5 38 L24 33.5 L29.5 38"
              fill="none"
              stroke="#102034"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </svg>
    </div>,
    size,
  );
}
