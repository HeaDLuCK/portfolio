import { useId } from 'react';

export default function BackroomsArtwork() {
  const id = useId().replace(/:/g, '');
  return <svg className="hollow-artwork" viewBox="0 0 1400 780" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="1" y2=".3"><stop stopColor="#7f774c" /><stop offset="1" stopColor="#302e1d" /></linearGradient>
      <linearGradient id={`${id}-floor`} x1="0" y1="1" x2="0.8" y2="0"><stop stopColor="#242419" /><stop offset="1" stopColor="#716748" /></linearGradient>
      <radialGradient id={`${id}-glow`}><stop stopColor="#e9e2a0" stopOpacity=".23" /><stop offset="1" stopColor="#c9bd73" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-edge`}><stop offset=".14" stopColor="#040502" stopOpacity="0" /><stop offset="1" stopColor="#030501" stopOpacity=".81" /></radialGradient>
      <pattern id={`${id}-paper`} width="25" height="38" patternUnits="userSpaceOnUse"><path d="M12 0C4 10 4 19 12 27C20 19 20 10 12 0ZM0 19C8 29 8 34 0 38M25 19C17 29 17 34 25 38" stroke="#2e301d" strokeWidth=".7" opacity=".22" /></pattern>
      <filter id={`${id}-grain`}><feTurbulence type="fractalNoise" baseFrequency=".68" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="linear" slope=".16" /></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply" /></filter>
      <filter id={`${id}-blur`}><feGaussianBlur stdDeviation="9" /></filter>
    </defs>
    <path fill="#48482f" d="M0 0H1400V780H0z" />
    <path fill="#66664a" d="M0 0H1400L848 273H697z" />
    <path fill={`url(#${id}-floor)`} d="M0 780H1400L844 441H690z" />
    <path fill={`url(#${id}-wall)`} d="M0 0L697 273V441L0 780z" />
    <path fill={`url(#${id}-paper)`} d="M0 0L697 273V441L0 780z" />
    <path fill="#6b6640" d="M1400 0L846 273V441L1400 780z" />
    <path fill={`url(#${id}-paper)`} d="M1400 0L846 273V441L1400 780z" />
    <path fill="#2f301f" d="M697 273H846V441H697z" />
    <path fill="#090e09" d="M728 290H807V441H728z" />
    <path d="M697 274V442L0 780M847 273V442L1400 780" stroke="#24291c" strokeWidth="8" />
    <path d="M0 630L321 515V128L0 0" fill="#625c38" /><path d="M318 129L382 157V492L318 518z" fill="#25291a" /><path fill={`url(#${id}-paper)`} d="M0 0L320 128V516L0 631z" />
    <path d="M1128 129L1056 168V570L1128 620z" fill="#31351f" /><path d="M1128 129L1400 0V780L1128 620z" fill="#706640" /><path fill={`url(#${id}-paper)`} d="M1128 129L1400 0V780L1128 620z" />
    <path d="M0 635L321 521L383 496M1056 572L1128 624L1400 780" stroke="#282b1a" strokeWidth="7" />
    <path d="M238 0L740 273M917 0L803 273M0 106L1400 107M330 199H1054M592 246H911" stroke="#383c2c" strokeWidth="2" opacity=".7" />
    <path d="M489 54H712L747 109H592zM713 173H802L802 197H742zM762 233H811L809 244H772z" fill="#c9cb9b" />
    <path d="M489 54H712L747 109H592zM713 173H802L802 197H742z" stroke="#f9f1bd" strokeOpacity=".6" strokeWidth="3" />
    <path d="M1030 68H1210L1099 111H981z" fill="#151b12" /><path d="M1031 69H1210L1099 112H980z" stroke="#7b7960" strokeWidth="5" />
    <ellipse cx="760" cy="325" rx="400" ry="310" fill={`url(#${id}-glow)`} />
    <ellipse cx="767" cy="436" rx="51" ry="12" fill="#030704" opacity=".8" filter={`url(#${id}-blur)`} />
    <path d="M763 344C753 345 752 362 755 365L751 387L748 421L753 422L759 393L762 388L761 436H766L770 395L775 437H781L776 383L772 365C779 357 774 343 763 344Z" fill="#050906" />
    <path d="M755 365L747 382L743 408M775 366L783 383L786 409" stroke="#050906" strokeWidth="4" strokeLinecap="round" />
    <path d="M430 284L436 367M467 310L463 338M1195 385L1204 446" stroke="#3a3c25" strokeWidth="8" opacity=".35" />
    <path d="M0 0H1400V780H0z" fill={`url(#${id}-edge)`} />
    <path d="M0 0H1400V780H0z" filter={`url(#${id}-grain)`} opacity=".6" />
  </svg>;
}
