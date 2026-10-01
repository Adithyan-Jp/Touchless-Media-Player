const PTS: [number, number][] = [
  [120, 255],
  [88, 230], [65, 202], [48, 172], [36, 144],
  [92, 152], [84, 110], [79, 82], [75, 56],
  [120, 142], [121, 96], [122, 66], [123, 38],
  [148, 150], [158, 110], [164, 84], [169, 60],
  [172, 170], [188, 136], [198, 114], [207, 94],
];

const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const TIPS = new Set([4, 8, 12, 16, 20]);

export function HandDiagram() {
  return (
    <svg viewBox="0 0 240 280" className="mx-auto w-full max-w-[300px]">
      <defs>
        <radialGradient id="hg" cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#bef264" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#bef264" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="150" rx="120" ry="130" fill="url(#hg)" />
      {BONES.map(([a, b]) => (
        <line key={`${a}-${b}`} x1={PTS[a][0]} y1={PTS[a][1]} x2={PTS[b][0]} y2={PTS[b][1]} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      ))}
      {PTS.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={TIPS.has(i) ? 8 : 7} fill="#0a0a0b" stroke={TIPS.has(i) ? "#bef264" : "rgba(255,255,255,0.6)"} strokeWidth="1.5" />
          <text x={x} y={y + 2.6} textAnchor="middle" fontSize="7" fontFamily="ui-monospace, monospace" fill={TIPS.has(i) ? "#bef264" : "#fff"}>
            {i}
          </text>
        </g>
      ))}
    </svg>
  );
}
