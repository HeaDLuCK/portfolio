import { useId } from 'react';

/** Original vector key art; the playable city is rendered separately in WebGL. */
export default function GameArtwork({ className = '' }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `${uid}-${name}`;
  const towers = [
    [22, 196, 76, 188], [110, 122, 68, 246], [191, 158, 89, 224], [293, 209, 57, 170],
    [366, 161, 70, 213], [451, 222, 47, 148], [839, 183, 54, 200], [912, 131, 64, 256],
    [993, 179, 82, 218], [1096, 109, 91, 286],
  ];
  return <svg className={`game-artwork ${className}`} viewBox="0 0 1200 700" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id={id('sky')} x1="600" y1="0" x2="600" y2="480" gradientUnits="userSpaceOnUse"><stop stopColor="#1c3048" /><stop offset=".48" stopColor="#b36f68" /><stop offset="1" stopColor="#ffc686" /></linearGradient>
      <linearGradient id={id('road')} x1="600" y1="320" x2="600" y2="700" gradientUnits="userSpaceOnUse"><stop stopColor="#646366" /><stop offset="1" stopColor="#121b28" /></linearGradient>
      <linearGradient id={id('car')} x1="680" y1="379" x2="691" y2="550" gradientUnits="userSpaceOnUse"><stop stopColor="#ffdf71" /><stop offset=".5" stopColor="#eeb638" /><stop offset="1" stopColor="#b77722" /></linearGradient>
      <linearGradient id={id('glass')} x1="650" y1="340" x2="690" y2="442" gradientUnits="userSpaceOnUse"><stop stopColor="#344a57" /><stop offset="1" stopColor="#101f30" /></linearGradient>
      <linearGradient id={id('vignette')} x1="0" y1="480" x2="1000" y2="350" gradientUnits="userSpaceOnUse"><stop stopColor="#0c1726" stopOpacity=".94" /><stop offset=".63" stopColor="#0c1726" stopOpacity=".18" /><stop offset="1" stopColor="#0c1726" stopOpacity="0" /></linearGradient>
      <radialGradient id={id('sunlight')}><stop stopColor="#ffb865" stopOpacity=".6" /><stop offset="1" stopColor="#ffb865" stopOpacity="0" /></radialGradient>
      <pattern id={id('windows')} width="18" height="27" patternUnits="userSpaceOnUse"><rect x="4" y="5" width="7" height="13" fill="#f6c990" fillOpacity=".28" /></pattern>
    </defs>
    <path fill={`url(#${id('sky')})`} d="M0 0h1200v700H0z" />
    <circle cx="736" cy="250" r="193" fill={`url(#${id('sunlight')})`} />
    <circle cx="736" cy="250" r="72" fill="#ffd69d" opacity=".82" />
    <path d="M0 296 85 283 145 300 222 262 288 290 359 268 442 306 500 291 579 310 634 289 715 310 774 282 867 300 940 263 1015 282 1090 249 1200 280V412H0Z" fill="#7e6875" opacity=".65" />
    {towers.map(([x, y, w, h], i) => <g key={i}>
      <path d={`M${x} ${y}h${w}v${h}H${x}z`} fill={i % 2 ? '#2e3d50' : '#3a4858'} />
      <path d={`M${x + w} ${y}l18 10v${h}l-18 -10z`} fill="#243449" />
      <path d={`M${x + 7} ${y + 13}h${w - 14}v${h - 18}H${x + 7}z`} fill={`url(#${id('windows')})`} />
      <path d={`M${x - 3} ${y}l13 -7h${w - 1}l9 7Z`} fill="#586171" />
      {i % 3 === 1 && <path d={`M${x + w / 2} ${y - 7}v-26`} stroke="#3f4d5f" strokeWidth="3" />}
    </g>)}
    <path d="M0 397 600 320 1200 394V700H0Z" fill="#3c434e" />
    <path d="M552 326 670 326 1200 700H0Z" fill={`url(#${id('road')})`} />
    <path d="M542 327 0 603M678 330l522 308" stroke="#d5b498" strokeWidth="3" />
    <path d="m528 332-528 289M693 335l507 325" stroke="#879095" strokeWidth="2" opacity=".65" />
    <path d="m600 347-5 15m-11 29-9 25m-25 58-24 57m-43 101-29 68" stroke="#cfbca0" strokeWidth="5" />
    <path d="m640 346 8 17m13 27 13 27m28 56 26 57m48 102 30 68" stroke="#bfae99" strokeWidth="3" opacity=".6" />
    <path d="M0 288 228 265 385 316v142L0 600Z" fill="#1c2d40" />
    <path d="m228 265 157 51v142l-157 -68Z" fill="#293d50" />
    <path d="M0 289 228 265v125L0 468Z" fill="#314457" />
    <path d="m0 311 226 -22m-226 55 226 -28m-226 59 226 -35m-226 62 226 -44" stroke="#1e3347" strokeWidth="9" />
    <path d="M0 281 230 255l159 57-5 12-157 -49L0 301Z" fill="#546373" />
    <path d="m252 304 101 31v45l-101 -32Z" fill="#263344" stroke="#69727b" strokeWidth="2" />
    <text x="270" y="249" transform="rotate(18 270 249)" fill="#c2b49e" fontFamily="monospace" fontSize="11" letterSpacing="4">NO VACANCY</text>
    <path d="m885 327 148 -68 167 50v281L885 426Z" fill="#354355" />
    <path d="m1033 259 167 50v281l-167 -121Z" fill="#24394e" />
    <path d="m885 327 148 -68v210l-148 -43Z" fill="#485464" />
    <path d="m902 345 112 -45v27l-112 41Zm0 58 112 -36v27l-112 27Z" fill="#c3a483" opacity=".45" />
    <path d="m885 325 148 -76 167 51v17l-167 -45-148 69Z" fill="#6f747c" />
    <path d="M1135 248v-50h-80v50m11 -40h60m-60 12h60m-60 12h60" stroke="#32465b" strokeWidth="4" />
    <g stroke="#263b4d" strokeWidth="5"><path d="M450 355v-105h46m-46 5h-35" /><path d="M818 362V244h-44m44 6h31" /></g>
    <path d="M484 250h18m-94 5h16m341 -11h19m55 6h18" stroke="#ffe0a2" strokeWidth="4" />
    <g transform="translate(0 5)"><path d="m371 422 44 -34 62 8 33 45-131 27Z" fill="#202b39" /><path d="m392 417 25 -24 47 7 15 25Z" fill="#314454" /><path d="m377 441 130 -4 2 24-130 16Z" fill="#24364b" /><path d="m390 448 24 -2m64 -8 20 -1" stroke="#ee7b61" strokeWidth="4" /><path d="m423 402 28 3" stroke="#6b9bbf" strokeWidth="5" /><path d="m423 402 14 1" stroke="#ee6756" strokeWidth="5" /></g>
    <path d="m1044 601-194 -80m211 115-170 -71m-459 66-100 69" stroke="#bb9c79" strokeWidth="2" opacity=".45" />
    <path d="m657 475 177 18 97 84-253 20-109 -42Z" fill="#090f1c" opacity=".75" />
    <g>
      <path d="m594 483-1 67 40 4 7 -65m154 9 1 65 38 -5 5 -63" fill="#101928" />
      <path d="m615 408 41 -73 95 14 47 91 36 19 23 71-35 30-229 -30-8 -80Z" fill={`url(#${id('car')})`} />
      <path d="m615 408 41 -73 95 14 47 91-42 -14-123 -12Z" fill="#f5c449" />
      <path d="m632 408 32 -60 79 12 35 68Z" fill={`url(#${id('glass')})`} />
      <path d="m663 349-5 62 103 13-18 -64" stroke="#d3d7c9" strokeWidth="2" opacity=".45" />
      <path d="m615 408 183 32 36 19-211 -29-38 20Z" fill="#ffdb68" />
      <path d="m623 430 211 29 6 17-220 -28Z" fill="#f5c658" />
      <path d="m592 479 244 27 9 25-23 29-229 -30Z" fill="#c28b30" />
      <path d="m599 490 52 7 1 16-51 -6Zm162 19 59 7 2 16-59 -6Z" fill="#742a29" />
      <path d="m603 493 43 6m122 13 45 6" stroke="#ff8764" strokeWidth="5" />
      <path d="m661 509 81 10-1 21-81 -11Z" fill="#273646" />
      <text x="674" y="505" transform="rotate(7 674 505)" fill="#5f512c" fontFamily="monospace" fontSize="8" letterSpacing="3">SOLAR GT</text>
      <path d="m681 519 40 5-1 11-41 -5Z" fill="#d6d3b8" />
      <path d="m595 534 226 28" stroke="#48505a" strokeWidth="8" /><path d="m609 540 24 3m151 18 27 3" stroke="#152435" strokeWidth="8" />
      <path d="m600 416-22 -4-4 15 26 5m194 6 20 1 6 15-17 -2" fill="#d7a439" />
      <path d="m652 336 96 13" stroke="#ffe39a" strokeWidth="3" />
    </g>
    <path d="m919 561 281 102m-316 -78 266 115m-585 -113-110 113" stroke="#f5b36e" strokeWidth="2" opacity=".2" />
    <path d="M0 0h1200v700H0z" fill={`url(#${id('vignette')})`} />
    <path d="M0 698h1200" stroke="#ffc778" strokeOpacity=".2" strokeWidth="2" />
  </svg>;
}
