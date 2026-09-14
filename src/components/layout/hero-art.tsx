// The landing illustration: layered ridges with ski tracks down the nearest slope. A crisp day for the
// light theme and dusk with alpenglow for the dark one, swapped by CSS so the right one paints first.

interface Palette {
  skyTop: string;
  skyMiddle: string;
  skyBottom: string;
  skyGlow?: string;
  far: string;
  farSnow: string;
  mid: string;
  midSnow: string;
  midShade: string;
  near: string;
  nearShade: string;
  track: string;
  tree: string;
}

const DAY: Palette = {
  skyTop: '#bcdcf2',
  skyMiddle: '#dcecf8',
  skyBottom: '#f3f8fc',
  far: '#a7c0d6',
  farSnow: '#f4f9fd',
  mid: '#5f84a8',
  midSnow: '#f7fbfe',
  midShade: '#c3d6e6',
  near: '#f7fbfe',
  nearShade: '#dde9f2',
  track: '#b5c9da',
  tree: '#1f3b57',
};

const DUSK: Palette = {
  skyTop: '#07101f',
  skyMiddle: '#1f2352',
  skyBottom: '#f08a6a',
  skyGlow: '#ffc19f',
  far: '#3a345f',
  farSnow: '#f5ad92',
  mid: '#16213f',
  midSnow: '#e39a94',
  midShade: '#3b4470',
  near: '#0d1928',
  nearShade: '#16263b',
  track: '#2a3b55',
  tree: '#050b15',
};

const STARS: [number, number][] = [
  [120, 80],
  [260, 150],
  [410, 60],
  [560, 120],
  [700, 40],
  [830, 100],
  [980, 70],
  [1130, 140],
  [1270, 50],
  [1370, 120],
  [340, 220],
  [1210, 230],
];

const TREES: [number, number][] = [
  [40, 700],
  [72, 690],
  [104, 705],
  [150, 686],
  [196, 700],
  [230, 676],
  [1330, 640],
  [1362, 630],
  [1396, 645],
];

interface SceneProps {
  id: string;
  palette: Palette;
  night: boolean;
  className: string;
}

function Scene({ id, palette: c, night, className }: SceneProps) {
  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.skyTop} />
          <stop offset={night ? 0.42 : 0.45} stopColor={c.skyMiddle} />
          <stop offset={night ? 0.72 : 0.8} stopColor={c.skyBottom} />
          {c.skyGlow ? <stop offset="0.8" stopColor={c.skyGlow} /> : null}
        </linearGradient>
        <linearGradient id={`${id}-near`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.near} />
          <stop offset="1" stopColor={c.nearShade} />
        </linearGradient>
      </defs>

      <rect width="1440" height="900" fill={`url(#${id}-sky)`} />

      {night ? (
        <>
          {STARS.map(([x, y], index) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r={index % 3 === 0 ? 1.6 : 1.1}
              fill="#ecf3f8"
              fillOpacity={index % 2 ? 0.55 : 0.85}
            />
          ))}
          <circle cx="300" cy="120" r="26" fill="#f4efe6" />
          <circle cx="311" cy="112" r="24" fill="#0d1530" />
        </>
      ) : (
        <>
          <circle cx="1150" cy="190" r="120" fill="#ffffff" fillOpacity="0.45" />
          <circle cx="1150" cy="190" r="46" fill="#ffffff" />
        </>
      )}

      <path
        d="M0 560 L90 505 L170 530 L260 440 L330 475 L420 385 L500 445 L590 405 L680 470 L760 415 L860 335 L950 420 L1040 382 L1130 450 L1220 362 L1320 432 L1440 392 L1440 900 L0 900 Z"
        fill={c.far}
      />
      <path d="M420 385 L452 418 L436 416 L424 432 L410 414 L392 420 Z" fill={c.farSnow} />
      <path d="M860 335 L894 368 L878 366 L864 384 L850 364 L830 372 Z" fill={c.farSnow} />
      <path d="M1220 362 L1250 392 L1236 390 L1224 404 L1212 388 L1196 394 Z" fill={c.farSnow} />

      <path
        d="M0 690 L120 622 L220 652 L360 540 L440 588 L560 522 L640 602 L760 562 L900 472 L1000 402 L1060 340 L1130 422 L1190 470 L1300 522 L1440 502 L1440 900 L0 900 Z"
        fill={c.mid}
      />
      <path d="M1060 340 L1130 422 L1106 417 L1086 452 L1062 424 L1060 340 Z" fill={c.midSnow} />
      <path d="M1060 340 L1062 424 L1040 446 L1020 422 L1000 402 Z" fill={c.midShade} />
      <path d="M360 540 L402 566 L386 567 L372 586 L356 570 L334 572 Z" fill={c.midSnow} />
      <path d="M560 522 L596 556 L580 556 L566 572 L552 556 Z" fill={c.midShade} />

      {TREES.map(([x, y], index) => {
        const height = 26 + (index % 3) * 8;
        return (
          <path
            key={`${x}-${y}`}
            d={`M${x} ${y - height} L${x + height * 0.34} ${y} L${x - height * 0.34} ${y} Z`}
            fill={c.tree}
          />
        );
      })}

      <path
        d="M0 772 C300 708 600 694 900 742 C1100 774 1300 800 1440 784 L1440 900 L0 900 Z"
        fill={`url(#${id}-near)`}
      />
      <path
        d="M1186 752 C1122 784 1190 818 1116 850 C1062 874 1104 892 1066 912"
        fill="none"
        stroke={c.track}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M1200 754 C1136 786 1204 820 1130 852 C1076 876 1118 894 1080 914"
        fill="none"
        stroke={c.track}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HeroArt() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      <Scene id="day" palette={DAY} night={false} className="size-full dark:hidden" />
      <Scene id="dusk" palette={DUSK} night className="hidden size-full dark:block" />
    </div>
  );
}
