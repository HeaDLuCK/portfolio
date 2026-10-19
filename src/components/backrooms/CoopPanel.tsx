'use client';

import { useRef, useState } from 'react';
import { LuArrowRight, LuCheck, LuCopy, LuLink, LuLoaderCircle, LuLogOut, LuUsers } from 'react-icons/lu';
import type { Locale } from '@/lib/locale';
import type { CoopState, RoomPlayer } from '@/lib/backrooms/multiplayer-types';
import { ROOM_CAPACITY } from '@/lib/backrooms/multiplayer-types';
import { coopCopy } from './coop-copy';

export function CoopRoster({ players, you, host, locale, compact = false }: { players: RoomPlayer[]; you: string; host: string; locale: Locale; compact?: boolean }) {
  const c = coopCopy[locale];
  return <ul className={`hollow-coop-roster${compact ? ' compact' : ''}`} aria-label={c.roster}>{players.map(player => <li key={player.id} className={!player.alive || player.escaped ? 'inactive' : ''}><i style={{ backgroundColor: `#${player.color.toString(16).padStart(6, '0')}` }} /><span>{player.label}{!compact && <small>{player.id === you ? c.you : ''}{player.id === host ? `${player.id === you ? ' / ' : ''}${c.host}` : ''}</small>}</span><b>{player.escaped ? c.escaped : !player.alive ? c.lost : player.paused ? c.paused : c.alive}</b></li>)}</ul>;
}

export function InviteLink({ invite, locale }: { invite: string; locale: Locale }) {
  const c = coopCopy[locale];
  const field = useRef<HTMLInputElement>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const local = /^https?:\/\/(localhost|127(?:\.\d+){3}|\[::1\])(?=[:/]|$)/i.test(invite);
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(invite);
      setCopyState('copied');
    } catch {
      setCopyState('manual');
      field.current?.focus();
      field.current?.select();
    }
  }
  return <div className="hollow-invite"><label htmlFor="hollow-invite-link">{c.invite}</label><div><input id="hollow-invite-link" ref={field} value={invite} readOnly onFocus={event => event.currentTarget.select()} /><button type="button" onClick={copy} aria-label={c.copy}>{copyState === 'copied' ? <LuCheck /> : <LuCopy />}</button></div><span className="hollow-copy-status" role="status">{copyState === 'copied' ? c.copied : copyState === 'manual' ? c.copyFailed : ''}</span>{local && <p className="hollow-local-note">{c.local}</p>}</div>;
}

export default function CoopPanel({ locale, state, available, roomInput, setRoomInput, joinError, onCreate, onJoin, onLeave, onStart, preparing }: {
  locale: Locale; state: CoopState | null; available: boolean | null; roomInput: string; setRoomInput: (value: string) => void;
  joinError: string; onCreate: () => void; onJoin: () => void; onLeave: () => void; onStart: () => void; preparing: boolean;
}) {
  const c = coopCopy[locale];
  const connected = state?.status === 'lobby' || state?.status === 'connected';
  const connecting = state?.status === 'connecting';
  const failed = state?.status === 'error' || state?.status === 'closed';
  const error = joinError || (failed ? state.error || c.disconnected : '');
  const isHost = Boolean(state?.you && state.you === state.host);
  return <div className="hollow-coop-panel">
    <span className="hollow-coop-label"><LuUsers />{connected ? c.room : c.coop}{connected && <b>{state.players.length} / {ROOM_CAPACITY}</b>}</span>
    {connected ? <><CoopRoster players={state.players} you={state.you} host={state.host} locale={locale} /><InviteLink invite={state.invite} locale={locale} />
      {state.run?.status === 'lobby' ? isHost ? <button type="button" className="hollow-primary hollow-coop-enter" disabled={preparing} onClick={onStart}>{preparing ? <LuLoaderCircle className="hollow-spinner" /> : <LuArrowRight />}{preparing ? c.preparing : c.start}</button> : <p className="hollow-coop-wait" role="status">{preparing ? c.preparing : c.wait}</p> : <p className="hollow-coop-wait">{c.ongoing}</p>}
      <button type="button" className="hollow-secondary hollow-coop-leave" onClick={onLeave}><LuLogOut />{c.leave}</button>
    </> : <><p className="hollow-coop-explainer">{c.empty}</p>{available === null ? <p className="hollow-coop-notice">{c.checking}</p> : !available ? <p className="hollow-coop-notice">{c.unavailable}</p> : <>
      <button type="button" className="hollow-primary hollow-coop-create" onClick={onCreate} disabled={connecting}>{connecting ? <LuLoaderCircle className="hollow-spinner" /> : <LuUsers />}{connecting ? c.connecting : c.create}</button>
      <form className="hollow-join-form" onSubmit={event => { event.preventDefault(); onJoin(); }}><label htmlFor="hollow-room-input">{c.linkLabel}</label><div><LuLink aria-hidden="true" /><input id="hollow-room-input" value={roomInput} onChange={event => setRoomInput(event.target.value)} placeholder={c.linkPlaceholder} autoComplete="off" spellCheck={false} disabled={connecting} /><button type="submit" disabled={connecting}>{c.join}<LuArrowRight /></button></div></form>
      {connecting && <button type="button" className="hollow-secondary" onClick={onLeave}><LuLogOut />{c.cancel}</button>}
    </>}{error && <p className="hollow-coop-error" role="alert">{error}</p>}{failed && <button type="button" className="hollow-secondary" onClick={onLeave}><LuLogOut />{c.return}</button>}</>}
  </div>;
}
