'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LuArrowDown, LuArrowLeft, LuArrowRight, LuArrowUp, LuArrowUpRight, LuGamepad2, LuLoaderCircle, LuMaximize, LuMinimize, LuPause, LuPlay, LuRotateCcw, LuVolume2, LuVolumeX, LuZap } from 'react-icons/lu';
import type { Locale } from '@/lib/locale';
import type { GameInput, GameQuality, GameStats } from '@/lib/game/types';
import type { LastExitGame } from '@/lib/game/engine';
import GameArtwork from './GameArtwork';
import { gameCopy } from './copy';

const initialStats: GameStats = { phase: 'ready', speed: 0, fuel: 100, health: 100, boost: 100, score: 0, best: 0, seconds: 150, heat: 1, deliveries: 0, objectiveDistance: 0, message: '', reason: '', combo: 1 };
const number = (value: number) => Math.floor(value).toLocaleString('en-US');
const percent = (value: number) => Math.min(100, Math.max(0, value));
const time = (seconds: number) => `${Math.floor(Math.max(0, Math.ceil(seconds)) / 60)}:${String(Math.max(0, Math.ceil(seconds)) % 60).padStart(2, '0')}`;

function Meter({ label, value, type }: { label: string; value: number; type: string }) {
  return <div className={`game-meter ${type}${value < 25 ? ' depleted' : ''}`}><div><span>{label}</span><b>{Math.ceil(percent(value))}<small>%</small></b></div><div className="game-meter-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent(value))}><i style={{ width: `${percent(value)}%` }} /></div></div>;
}

export default function GameClient({ locale }: { locale: Locale }) {
  const t = gameCopy[locale];
  const engine = useRef<LastExitGame | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const minimap = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const [stats, setStats] = useState<GameStats>(initialStats);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState<GameQuality>('auto');
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [showTouch, setShowTouch] = useState(false);

  useEffect(() => {
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    const changed = () => setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener('fullscreenchange', changed);
    return () => {
      generation.current += 1;
      engine.current?.dispose();
      engine.current = null;
      document.removeEventListener('fullscreenchange', changed);
    };
  }, []);

  const start = useCallback(async () => {
    if (loading) return;
    const current = ++generation.current;
    setLoading(true);
    setError('');
    engine.current?.dispose();
    engine.current = null;
    try {
      const { LastExitGame: Game } = await import('@/lib/game/engine');
      if (current !== generation.current || !container.current) return;
      const game = new Game(container.current, minimap.current, {
        quality,
        onStats: value => { if (current === generation.current) setStats(value); },
        onMuted: value => { if (current === generation.current) setMuted(value); },
        onError: message => {
          if (current === generation.current) {
            setError(message);
            setLoading(false);
          }
        },
      });
      engine.current = game;
      game.setMuted(muted);
      game.start();
      setStarted(true);
      setLoading(false);
      stage.current?.focus({ preventScroll: true });
      stage.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    } catch (cause) {
      if (current !== generation.current) return;
      engine.current?.dispose();
      engine.current = null;
      setError(cause instanceof Error ? cause.message : 'Unable to initialize WebGL.');
      setLoading(false);
    }
  }, [loading, quality, muted]);

  const modalOpen = Boolean(error) || (started && (stats.phase === 'paused' || stats.phase === 'over'));
  useEffect(() => {
    if (!modalOpen) return;
    const target = overlay.current;
    const button = target?.querySelector<HTMLButtonElement>('button');
    button?.focus({ preventScroll: true });
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !target) return;
      const items = [...target.querySelectorAll<HTMLElement>('button:not([disabled]), summary, a[href], select')];
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    target?.addEventListener('keydown', trapFocus);
    return () => target?.removeEventListener('keydown', trapFocus);
  }, [modalOpen, stats.phase]);

  function restart() {
    engine.current?.restart();
    stage.current?.focus({ preventScroll: true });
  }
  function resume() {
    engine.current?.resume();
    stage.current?.focus({ preventScroll: true });
  }
  function changeQuality(value: GameQuality) {
    setQuality(value);
    engine.current?.setQuality(value);
    if (started && !modalOpen) stage.current?.focus({ preventScroll: true });
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.current?.requestFullscreen();
    } catch { /* Browsers can decline fullscreen; the game remains playable. */ }
    if (started && !modalOpen) stage.current?.focus({ preventScroll: true });
  }
  const touchButton = (field: keyof GameInput, label: string, content: React.ReactNode, className = '') => <button type="button" className={`game-touch-button ${className}`} aria-label={label}
    onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); engine.current?.setInput({ [field]: true }); }}
    onPointerUp={() => engine.current?.setInput({ [field]: false })}
    onPointerCancel={() => engine.current?.setInput({ [field]: false })}
    onLostPointerCapture={() => engine.current?.setInput({ [field]: false })}
    onContextMenu={event => event.preventDefault()}>{content}</button>;

  return <div className="game-player">
    <div ref={stage} tabIndex={0} onPointerDown={event => { if (started && !(event.target as Element).closest('button, select, summary')) stage.current?.focus({ preventScroll: true }); }} className={`game-stage${started ? ' has-started' : ''}${showTouch ? ' show-touch' : ''}${stats.phase === 'playing' && !error ? ' is-playing' : ''}`} role="region" aria-label="Last Exit arcade game" aria-describedby="game-controls">
      <div ref={container} className="game-canvas-mount" />
      {!started && !error && <div className="game-cover">
        <GameArtwork />
        <div className="game-cover-copy"><span className="game-kicker"><span /> ZM ORIGINAL / 001</span><h2>LAST<br /><i>EXIT</i><span>.</span></h2><p>{t.subtitle}</p><button type="button" className="game-start-button" onClick={start} disabled={loading}>{loading ? <LuLoaderCircle className="game-spinner" /> : <LuPlay fill="currentColor" />}<span>{loading ? t.loading : t.launch}</span>{!loading && <LuArrowUpRight />}</button><span className="game-launch-hint">{loading ? t.loadDetail : t.launchHint}</span></div>
        <span className="game-cover-edition">SUNSET DISTRICT<br /><b>ARCADE PURSUIT / VOL. 01</b></span>
      </div>}
      <div className={`game-hud${!started || error ? ' game-hidden' : ''}`} aria-hidden={!started || Boolean(error)}>
        <div className="game-hud-top"><div className="game-run-brand">LAST EXIT<span>RUN / {String(stats.deliveries + 1).padStart(2, '0')}</span></div><div className="game-score"><span>{t.score}</span><strong>{number(stats.score).padStart(6, '0')}</strong><small>{t.best} <b>{number(stats.best)}</b></small></div><div className={`game-clock${stats.seconds < 25 ? ' urgent' : ''}`}><span>{t.clock}</span><strong>{time(stats.seconds)}</strong></div><div className="game-hud-actions"><button type="button" className="game-icon-button game-pause" aria-label={t.pause} onClick={() => stats.phase === 'paused' ? resume() : engine.current?.pause()}><LuPause /></button>{fullscreen && <button type="button" className="game-icon-button" aria-label={t.exitFullscreen} onClick={toggleFullscreen}><LuMinimize /></button>}</div></div>
        <div className="game-objective"><LuArrowUp style={{ transform: `rotate(${-(stats.objectiveBearing || 0) * 180 / Math.PI}deg)` }} aria-hidden="true" /><div><span>{t.objective}</span><strong>{Math.round(stats.objectiveDistance)}<small>m</small><b>+15s</b></strong></div></div>
        <div className="game-pursuit"><span>{t.heat}</span><div aria-label={`${t.heat}: ${Math.ceil(stats.heat)}`}>
          {[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= Math.ceil(stats.heat) ? 'active' : ''} />)}
        </div></div>
        <div className="game-callout"><span className={stats.message ? 'has-message' : ''} aria-live="polite" aria-atomic="true">{stats.message}</span>{stats.combo > 1 && <b aria-hidden="true">×{stats.combo.toFixed(1)}</b>}</div>
        <div className="game-hud-bottom"><div className="game-map"><canvas ref={minimap} width={180} height={180} aria-label="City minimap: white is your car, gold is the checkpoint, red is pursuit" /><span>SUNSET DISTRICT <b>N ↑</b></span></div><div className="game-telemetry"><div className="game-speed"><strong>{Math.abs(Math.round(stats.speed)).toString().padStart(3, '0')}</strong><span>KM/H</span><i style={{ width: `${Math.min(100, Math.abs(stats.speed) / 1.8)}%` }} /></div><div className="game-meters"><Meter label={t.fuel} value={stats.fuel} type="fuel" /><Meter label={t.hull} value={stats.health} type="hull" /><Meter label={t.nitro} value={stats.boost} type="nitro" /></div></div></div>
        <div className="game-touch-controls"><div className="game-touch-steering">{touchButton('left', t.left, <LuArrowLeft />)}{touchButton('right', t.right, <LuArrowRight />)}</div><div className="game-touch-pedals">{touchButton('drift', t.drift, <span>DRIFT</span>, 'drift')}{touchButton('boost', t.boost, <LuZap />, 'boost')}{touchButton('brake', t.brake, <LuArrowDown />, 'brake')}{touchButton('throttle', t.accelerator, <><LuArrowUp /><span>{t.go}</span></>, 'throttle')}</div></div>
      </div>
      {modalOpen && <div ref={overlay} className="game-overlay" role="dialog" aria-modal="true" aria-labelledby="game-dialog-title">
        <div className="game-dialog"><span className="game-kicker">{error ? 'ENGINE / OFFLINE' : stats.phase === 'paused' ? 'ENGINE / IDLE' : 'RUN / COMPLETE'}</span>
          <h2 id="game-dialog-title">{error ? t.error : stats.phase === 'paused' ? t.paused : t.over}</h2>
          {error ? <><p>{t.errorCopy}</p><label className="game-quality game-error-quality"><span>{t.quality}</span><select aria-label={`${t.quality} / ${t.retry}`} value={quality} onChange={event => changeQuality(event.target.value as GameQuality)}><option value="auto">{t.auto}</option><option value="high">{t.high}</option><option value="low">{t.low}</option></select></label><details className="game-error-details"><summary>Technical details</summary><p>{error}</p></details><button type="button" className="game-start-button" disabled={loading} onClick={start}>{loading ? <LuLoaderCircle className="game-spinner" /> : <LuRotateCcw />}<span>{loading ? t.loading : t.retry}</span></button></> : stats.phase === 'paused' ? <><p>{t.pausedCopy}</p><button type="button" className="game-start-button" onClick={resume}><LuPlay /><span>{t.resume}</span><LuArrowUpRight /></button><button type="button" className="game-secondary-button" onClick={restart}><LuRotateCcw />{t.restart}</button></> : <>{stats.score > 0 && stats.score >= stats.best && <span className="game-new-best">{t.newBest}</span>}<p className="game-end-reason">{stats.reason}</p><div className="game-results"><div><span>{t.score}</span><strong>{number(stats.score)}</strong></div><div><span>{t.best}</span><strong>{number(stats.best)}</strong></div><div><span>{t.checkpoints}</span><strong>{String(stats.deliveries).padStart(2, '0')}</strong></div></div><button type="button" className="game-start-button" onClick={restart}><LuRotateCcw /><span>{t.restart}</span><LuArrowUpRight /></button></>}
        </div>
      </div>}
    </div>
    <div className="game-toolbar"><span className="game-status"><i />WEBGL / {loading ? 'LOADING' : !started ? 'READY WHEN YOU ARE' : stats.phase === 'playing' ? 'LIVE' : stats.phase === 'paused' ? 'PAUSED' : 'RUN COMPLETE'}</span><div className="game-toolbar-controls"><button type="button" className="game-toolbar-button" aria-label={muted ? t.unmute : t.mute} aria-pressed={!muted} onClick={() => { const next = !muted; setMuted(next); engine.current?.setMuted(next); if (started && !modalOpen) stage.current?.focus({ preventScroll: true }); }}>{muted ? <LuVolumeX /> : <LuVolume2 />}<span>{t.sound} {muted ? 'OFF' : 'ON'}</span></button><label className="game-quality"><span>{t.quality}</span><select aria-label={t.quality} value={quality} onChange={event => changeQuality(event.target.value as GameQuality)}><option value="auto">{t.auto}</option><option value="high">{t.high}</option><option value="low">{t.low}</option></select></label><button type="button" className="game-toolbar-button game-touch-toggle" aria-label={t.touch} aria-pressed={showTouch} onClick={() => { setShowTouch(!showTouch); if (started && !modalOpen) stage.current?.focus({ preventScroll: true }); }}><LuGamepad2 /><span>TOUCH {showTouch ? 'ON' : 'OFF'}</span></button>{canFullscreen && <button type="button" className="game-toolbar-button" onClick={toggleFullscreen} aria-label={fullscreen ? t.exitFullscreen : t.fullscreen}>{fullscreen ? <LuMinimize /> : <LuMaximize />}</button>}</div></div>
  </div>;
}
