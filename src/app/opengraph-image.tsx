import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Crystal Ski Rental';

/** The card social networks and chat apps show for a shared link. */
export default async function OpengraphImage() {
  const t = await getTranslations('app');

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 24,
        padding: 96,
        background: 'linear-gradient(135deg, #e8f2fb 0%, #b9d4ec 55%, #6f9cc4 100%)',
        color: '#101b2b',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 30, letterSpacing: 8, textTransform: 'uppercase', color: '#0b6bcb' }}>{t('name')}</div>
      <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{t('description')}</div>
    </div>,
    size,
  );
}
