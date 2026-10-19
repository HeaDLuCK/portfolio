'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LuArrowDown, LuArrowLeft, LuArrowRight, LuArrowUp, LuArrowUpRight, LuFlashlight, LuGamepad2, LuLoaderCircle, LuLogOut, LuMaximize, LuMinimize, LuPause, LuPlay, LuRotateCcw, LuUsers, LuVolume2, LuVolumeX } from 'react-icons/lu';
import type { Locale } from '@/lib/locale';
import type { HorrorGame } from '@/lib/backrooms/engine';
import type { HorrorInput, HorrorQuality, HorrorStats } from '@/lib/backrooms/types';
import { HollowCoop } from '@/lib/backrooms/multiplayer';
import type { CoopState, RoomSnapshot } from '@/lib/backrooms/multiplayer-types';
import BackroomsArtwork from './BackroomsArtwork';
import CoopPanel, { CoopRoster, InviteLink } from './CoopPanel';
import { horrorCopy } from './copy';
import { coopCopy } from './coop-copy';

const initialStats: HorrorStats = { phase: 'ready', fuses: 0, totalFuses: 3, stamina: 100, battery: 100, flashlight: true, danger: 0, elapsed: 0, prompt: '', message: '', caption: '', introProgress: 0, locked: false, muted: false };
const percent = (value: number) => Math.min(100, Math.max(0, value));
const timestamp = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function Gauge({ label, value, off = false }: { label: string; value: number; off?: boolean }) {
  return <div className={`hollow-gauge${off ? ' off' : ''}`}><div><span>{label}</span><span>{off ? 'OFF' : `${Math.ceil(value)}%`}</span></div><div className="hollow-gauge-track" role="meter" aria-label={label} aria-valuenow={Math.round(percent(value))} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${percent(value)}%` }} /></div></div>;
}

export default function BackroomsClient({ locale }: { locale: Locale }) {
  const t = horrorCopy[locale];
  const c = coopCopy[locale];
  const mount = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const modal = useRef<HTMLDivElement>(null);
  const engine = useRef<HorrorGame | null>(null);
  const generation = useRef(0);
  const lookPoint = useRef<{ x: number; y: number } | null>(null);
  const connection = useRef<HollowCoop | null>(null);
  const preparedConnection = useRef<HollowCoop | null>(null);
  const pendingSnapshot = useRef<RoomSnapshot | null>(null);
  const settings = useRef({ quality: 'auto' as HorrorQuality, reduced: false, muted: false });
  const [stats, setStats] = useState(initialStats);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [quality, setQuality] = useState<HorrorQuality>('auto');
  const [touch, setTouch] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [caughtReady, setCaughtReady] = useState(false);
  const [coverMode, setCoverMode] = useState<'solo' | 'coop'>('solo');
  const [coopState, setCoopState] = useState<CoopState | null>(null);
  const [coopAvailable, setCoopAvailable] = useState<boolean | null>(null);
  const [roomInput, setRoomInput] = useState('');
  const [joinError, setJoinError] = useState('');
  settings.current = { quality, reduced, muted };

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    setCoopAvailable(HollowCoop.available());
    const room = HollowCoop.getRoomFromLocation();
    if (room) { setRoomInput(window.location.href); setCoverMode('coop'); }
    const changed = () => setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener('fullscreenchange', changed);
    return () => { generation.current += 1; engine.current?.dispose(); engine.current = null; connection.current?.dispose(); connection.current = null; document.removeEventListener('fullscreenchange', changed); };
  }, []);

  const prepareEngine = useCallback(async (room: HollowCoop | null = null) => {
    const current = ++generation.current;
    setLoading(true);
    setError('');
    engine.current?.dispose();
    engine.current = null;
    try {
      const { HorrorGame: Game } = await import('@/lib/backrooms/engine');
      if (current !== generation.current || !mount.current) return;
      const game = new Game(mount.current, {
        quality: settings.current.quality, reducedMotion: settings.current.reduced,
        onStats: value => { if (current === generation.current) { setStats(value); setMuted(value.muted); } },
        onError: value => { if (current === generation.current) { setError(value); setLoading(false); } },
      });
      engine.current = game;
      game.setMuted(settings.current.muted);
      if (room) {
        game.configureCoop(room);
        if (pendingSnapshot.current) {
          game.applyRoomSnapshot(pendingSnapshot.current);
          setStarted(pendingSnapshot.current.run.status !== 'lobby');
        }
      } else { game.start(); setStarted(true); }
      setLoading(false);
      stage.current?.focus({ preventScroll: true });
      if (!room || pendingSnapshot.current?.run.status !== 'lobby') stage.current?.scrollIntoView({ behavior: settings.current.reduced ? 'auto' : 'smooth', block: 'center' });
    } catch (cause) {
      if (current !== generation.current) return;
      engine.current?.dispose();
      engine.current = null;
      setError(cause instanceof Error ? cause.message : 'WebGL unavailable.');
      setLoading(false);
    }
  }, []);

  function leaveRoom() {
    generation.current += 1;
    engine.current?.dispose(); engine.current = null;
    const room = connection.current; connection.current = null;
    preparedConnection.current = null; pendingSnapshot.current = null;
    room?.dispose();
    setCoopState(null); setStarted(false); setLoading(false); setError(''); setJoinError(''); setRoomInput(''); setStats(initialStats); setCoverMode('solo');
  }
  const start = () => { if (loading) return; if (connection.current) leaveRoom(); void prepareEngine(); };
  function openRoom(create: boolean) {
    if (!HollowCoop.available()) return;
    if (!create && !roomInput.trim()) { setJoinError(c.inputNeeded); return; }
    generation.current += 1;
    engine.current?.dispose(); engine.current = null;
    const old = connection.current; connection.current = null; old?.dispose();
    preparedConnection.current = null; pendingSnapshot.current = null;
    setStarted(false); setLoading(false); setError(''); setJoinError(''); setStats(initialStats);
    const room = new HollowCoop({
      onState: value => {
        if (connection.current !== room) return;
        setCoopState(value);
        if ((value.status === 'lobby' || value.status === 'connected') && preparedConnection.current !== room) {
          preparedConnection.current = room;
          void prepareEngine(room);
        }
        if (value.status === 'error' || value.status === 'closed') engine.current?.pause();
      },
      onSnapshot: snapshot => {
        if (connection.current !== room) return;
        pendingSnapshot.current = snapshot;
        engine.current?.applyRoomSnapshot(snapshot);
        if (engine.current) setStarted(snapshot.run.status !== 'lobby');
      },
    });
    connection.current = room;
    void (create ? room.create() : room.join(roomInput)).catch(cause => { if (connection.current === room) setJoinError(cause instanceof Error ? cause.message : c.connectionError); });
  }

  useEffect(() => {
    setCaughtReady(false);
    if (stats.phase !== 'caught') return;
    const timer = window.setTimeout(() => setCaughtReady(true), reduced ? 350 : 1050);
    return () => window.clearTimeout(timer);
  }, [stats.phase, reduced]);

  useEffect(() => {
    if (!started) return;
    stage.current?.focus({ preventScroll: true });
    stage.current?.scrollIntoView({ behavior: settings.current.reduced ? 'auto' : 'smooth', block: 'center' });
  }, [started]);

  const roomFailed = Boolean(started && coopState && (coopState.status === 'error' || coopState.status === 'closed'));
  const modalOpen = Boolean(error) || roomFailed || (started && (stats.phase === 'paused' || stats.phase === 'escaped' || (stats.phase === 'caught' && caughtReady)));
  useEffect(() => {
    if (!modalOpen) return;
    const target = modal.current;
    target?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    function trap(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !target) return;
      const items = [...target.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], select, input, summary')];
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    target?.addEventListener('keydown', trap);
    return () => target?.removeEventListener('keydown', trap);
  }, [modalOpen, stats.phase]);

  const resume = () => { engine.current?.resume(); engine.current?.requestControl(); stage.current?.focus({ preventScroll: true }); };
  const restart = () => { if (connection.current) { if (coopState?.you === coopState?.host) connection.current.send({ type: 'restart' }); } else engine.current?.restart(); stage.current?.focus({ preventScroll: true }); };
  async function toggleFullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.current?.requestFullscreen(); } catch { /* Fullscreen can be unavailable in embedded browsers. */ }
  }
  function touchKey(field: keyof HorrorInput, label: string, icon: React.ReactNode, extra = '') {
    return <button type="button" className={`hollow-touch-button ${extra}`} aria-label={label}
      onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); engine.current?.setInput({ [field]: true }); }}
      onPointerUp={() => engine.current?.setInput({ [field]: false })} onPointerCancel={() => engine.current?.setInput({ [field]: false })} onLostPointerCapture={() => engine.current?.setInput({ [field]: false })} onContextMenu={event => event.preventDefault()}>{icon}</button>;
  }

  const active = started && stats.phase === 'playing' && !error;
  const inRoom = Boolean(connection.current && coopState && ['lobby', 'connected'].includes(coopState.status));
  const isHost = Boolean(coopState?.you && coopState.you === coopState.host);
  const hostPaused = Boolean(inRoom && !isHost && coopState?.players.find(player => player.id === coopState.host)?.paused);
  const retry = () => { if (connection.current) void prepareEngine(connection.current); else start(); };
  return <div className={`hollow-player${reduced ? ' hollow-reduced' : ''}`}>
    <div ref={stage} tabIndex={0} className={`hollow-stage${started ? ' hollow-started' : ''}${!started && coverMode==='coop' ? ' hollow-lobby-stage' : ''}${touch ? ' hollow-touch-visible' : ''}${active ? ' hollow-active' : ''}`} role="region" aria-label={t.title} aria-describedby="hollow-controls"
      onPointerDown={event => { if (active && !(event.target as Element).closest('button, select, input')) stage.current?.focus({ preventScroll: true }); }}>
      <div className="hollow-canvas" ref={mount} />
      {!started && !error && <div className={`hollow-cover${coverMode === 'coop' ? ' hollow-coop-cover' : ''}`}>
        <BackroomsArtwork />
        <span className="hollow-tape-label">PROPERTY OF FIELD RESEARCH / TAPE 002</span>
        <div className={`hollow-cover-copy${coverMode === 'coop' ? ' hollow-cover-room-copy' : ''}`}><span className="hollow-kicker"><i /> AN UNRECOVERED PLACE</span><h2>{coverMode === 'coop' ? <>THE HOLLOW<span>/ THE BACKROOMS</span></> : <>THE<br />BACKROOMS<span>/ THE HOLLOW</span></>}</h2>{coverMode === 'solo' && <p className="hollow-tagline">{t.subtitle}</p>}<p className="hollow-content-note">{t.note}</p>
          {!inRoom && <label className="hollow-reduced-option"><input type="checkbox" checked={reduced} onChange={event => setReduced(event.target.checked)} /><span>{t.reduced}<small>{t.reducedHint}</small></span></label>}
          <div className="hollow-mode-switch" role="group" aria-label={c.mode}><button type="button" aria-pressed={coverMode === 'solo'} onClick={() => { if (connection.current) leaveRoom(); else setCoverMode('solo'); }}>{c.solo}</button><button type="button" aria-pressed={coverMode === 'coop'} onClick={() => setCoverMode('coop')}><LuUsers />{c.together}</button></div>
          {coverMode === 'solo' ? <button type="button" className="hollow-primary" disabled={loading} onClick={start}>{loading ? <LuLoaderCircle className="hollow-spinner" /> : <LuPlay />}<span>{loading ? t.loading : c.alone}</span>{!loading && <LuArrowUpRight />}</button> : <CoopPanel locale={locale} state={coopState} available={coopAvailable} roomInput={roomInput} setRoomInput={value => { setRoomInput(value); setJoinError(''); }} joinError={joinError} onCreate={() => openRoom(true)} onJoin={() => openRoom(false)} onLeave={leaveRoom} preparing={loading} onStart={() => { connection.current?.send({ type: 'start' }); engine.current?.requestControl(); }} />}
        </div>
        {coverMode === 'solo' && <span className="hollow-cover-stamp">LOCATION UNKNOWN<br /><b>23:43:08 / SIGNAL UNSTABLE</b></span>}
      </div>}

      {started && !error && <div className={`hollow-film${stats.danger > .4 ? ' hollow-danger' : ''}`} aria-hidden="true" style={{ opacity: .4 + Math.min(1, stats.danger) * .5 }} />}
      {active && <div className="hollow-hud">
        <div className="hollow-hud-top"><div className="hollow-rec"><i />REC <span>{timestamp(stats.elapsed)}</span></div><div className="hollow-fuses"><span>{t.fuses}</span><b>{stats.fuses}<i>/ {stats.totalFuses}</i></b><span className="hollow-fuse-dots" aria-hidden="true">{Array.from({ length: stats.totalFuses }, (_, i) => <i key={i} className={i < stats.fuses ? 'found' : ''} />)}</span></div><button type="button" className="hollow-icon-button hollow-pause" aria-label={t.pause} onClick={() => engine.current?.pause()}><LuPause /></button></div>
        <div className="hollow-hud-mission">{t.power}</div>
        {inRoom && coopState && <div className="hollow-run-team"><span>{c.coop} <b>{coopState.players.length}/4</b></span><CoopRoster players={coopState.players} you={coopState.you} host={coopState.host} locale={locale} compact />{hostPaused && <p role="status">{c.hostPaused}</p>}</div>}
        <div className="hollow-crosshair" aria-hidden="true" />
        {!stats.locked && <span className="hollow-capture-hint">{t.capture}</span>}
        <div className="hollow-captions"><span className="hollow-message" role="status" aria-live="polite">{stats.message}</span><span className="hollow-caption" aria-live="polite">{stats.caption}</span></div>
        {stats.prompt && <button type="button" className="hollow-interact-prompt" onClick={() => engine.current?.interact()}><kbd>E</kbd>{stats.prompt.replace(/^E\s*\/\s*/i, '')}</button>}
        <div className="hollow-hud-bottom"><span className="hollow-location">LEVEL 00 <i>/</i> UNKNOWN DEPTH</span><div className="hollow-gauges"><Gauge label={t.battery} value={stats.battery} off={!stats.flashlight} /><Gauge label={t.stamina} value={stats.stamina} /></div></div>
        <div className="hollow-touch-controls">
          <div className="hollow-dpad">{touchKey('forward', t.move, <LuArrowUp />, 'hollow-up')}{touchKey('left', t.move, <LuArrowLeft />, 'hollow-left')}{touchKey('backward', t.move, <LuArrowDown />, 'hollow-down')}{touchKey('right', t.move, <LuArrowRight />, 'hollow-right')}</div>
          <div className="hollow-look-pad" aria-label={t.lookPad}
            onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); lookPoint.current = { x: event.clientX, y: event.clientY }; }}
            onPointerMove={event => { if (!lookPoint.current) return; engine.current?.look(event.clientX - lookPoint.current.x, event.clientY - lookPoint.current.y); lookPoint.current = { x: event.clientX, y: event.clientY }; }}
            onPointerUp={() => { lookPoint.current = null; }} onPointerCancel={() => { lookPoint.current = null; }} onLostPointerCapture={() => { lookPoint.current = null; }}><span>{t.lookPad}</span></div>
          <div className="hollow-touch-actions">{touchKey('sprint', t.sprint, <span>{t.run}</span>, 'hollow-run')}<button type="button" className="hollow-touch-button" onClick={() => engine.current?.interact()}>{t.use}</button><button type="button" className="hollow-touch-button" aria-label={t.flashlight} onClick={() => engine.current?.toggleFlashlight()}><LuFlashlight /></button></div>
        </div>
      </div>}

      {started && stats.phase === 'intro' && !error && <div className="hollow-intro"><div className="hollow-intro-top"><span><i />CAM 04 / ARCHIVE</span><span>23:43:{String(8 + Math.floor(stats.introProgress * 12)).padStart(2, '0')}</span></div><div className="hollow-intro-bottom"><span>{t.introCaption}</span><button type="button" onClick={() => { engine.current?.skipIntro(); engine.current?.requestControl(); stage.current?.focus({ preventScroll: true }); }}>{t.skip}<LuArrowRight /></button></div>{stats.caption && <p className="hollow-intro-caption" aria-live="polite">{stats.caption}</p>}<div className="hollow-intro-progress"><i style={{ width: `${Math.min(100, stats.introProgress * 100)}%` }} /></div></div>}

      {modalOpen && <div ref={modal} className={`hollow-overlay${stats.phase === 'caught' ? ' hollow-lost' : ''}`} role="dialog" aria-modal="true" aria-labelledby="hollow-dialog-title"><div className="hollow-dialog"><span className="hollow-kicker">{roomFailed ? 'ROOM / DISCONNECTED' : error ? 'PLAYBACK ERROR / 002' : stats.phase === 'paused' ? 'TAPE / HELD' : stats.phase === 'escaped' ? t.outcome : t.lost}</span><div className="hollow-dialog-rule" /><h2 id="hollow-dialog-title">{roomFailed ? c.disconnected : error ? t.error : stats.phase === 'paused' ? t.paused : stats.phase === 'escaped' ? t.escaped : t.caught}</h2><p>{roomFailed ? coopState?.error : error ? t.errorCopy : stats.phase === 'paused' ? inRoom ? isHost ? c.hostPause : c.guestPause : t.pausedCopy : stats.phase === 'escaped' ? t.escapedCopy : t.caughtCopy}</p>
        {roomFailed ? <button type="button" className="hollow-primary" onClick={leaveRoom}><LuLogOut />{c.return}</button> : error ? <><label className="hollow-quality"><span>{t.quality}</span><select value={quality} onChange={event => setQuality(event.target.value as HorrorQuality)}><option value="auto">{t.auto}</option><option value="high">{t.high}</option><option value="low">{t.low}</option></select></label><details className="hollow-error-details"><summary>{t.detail}</summary><p>{error}</p></details><button type="button" className="hollow-primary" disabled={loading} onClick={retry}>{loading ? <LuLoaderCircle className="hollow-spinner" /> : <LuRotateCcw />}{t.retry}</button></> : <>
          {stats.phase === 'paused' ? <button type="button" className="hollow-primary" onClick={resume}><LuPlay />{t.resume}<LuArrowRight /></button> : <div className="hollow-record-detail"><span>{t.duration}<b>{timestamp(stats.elapsed)}</b></span><span>{t.fuses}<b>{stats.fuses} / {stats.totalFuses}</b></span></div>}
          {inRoom && coopState && <div className="hollow-modal-room"><CoopRoster players={coopState.players} you={coopState.you} host={coopState.host} locale={locale} /><InviteLink invite={coopState.invite} locale={locale} /></div>}
          {(!inRoom || isHost) ? <button type="button" className={stats.phase==='paused'?'hollow-secondary':'hollow-primary'} onClick={restart}><LuRotateCcw />{inRoom ? c.restart : t.restart}</button> : <p className="hollow-coop-wait">{c.waitRestart}</p>}
          {inRoom && <button type="button" className="hollow-secondary" onClick={leaveRoom}><LuLogOut />{c.leave}</button>}
        </>}
      </div></div>}
    </div>
    <div className="hollow-toolbar"><span className="hollow-status"><i />{loading ? 'RECOVERING TAPE' : !started ? t.ready : stats.phase === 'playing' || stats.phase === 'intro' ? t.live : stats.phase.toUpperCase()}</span><div className="hollow-tools">{inRoom&&started&&<button type="button" className="hollow-tool" aria-label={c.inspect} onClick={()=>engine.current?.pause()}><LuUsers /></button>}<button type="button" className="hollow-tool" aria-label={muted ? t.unmute : t.mute} aria-pressed={!muted} onClick={() => { const next = !muted; setMuted(next); engine.current?.setMuted(next); }}>{muted ? <LuVolumeX /> : <LuVolume2 />}<span>{t.sound} {muted ? 'OFF' : 'ON'}</span></button><label className="hollow-quality"><span>{t.quality}</span><select aria-label={t.quality} value={quality} onChange={event => { const next = event.target.value as HorrorQuality; setQuality(next); engine.current?.setQuality(next); }}><option value="auto">{t.auto}</option><option value="high">{t.high}</option><option value="low">{t.low}</option></select></label><button type="button" className="hollow-tool hollow-touch-toggle" aria-label={t.touch} aria-pressed={touch} onClick={() => setTouch(!touch)}><LuGamepad2 /><span>TOUCH {touch ? 'ON' : 'OFF'}</span></button>{canFullscreen && <button type="button" className="hollow-tool" aria-label={fullscreen ? t.exitFullscreen : t.fullscreen} onClick={toggleFullscreen}>{fullscreen ? <LuMinimize /> : <LuMaximize />}</button>}</div></div>
  </div>;
}
