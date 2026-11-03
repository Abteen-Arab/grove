export const STORAGE_KEY = 'grove-local-v1';
export const APP_LIST = [
  { id: 'instagram', name: 'Instagram', minutes: 55, mark: '◎', color: '#bc7e91' },
  { id: 'tiktok', name: 'TikTok', minutes: 45, mark: '♪', color: '#465653' },
  { id: 'youtube', name: 'YouTube', minutes: 40, mark: '▶', color: '#bd7765' },
  { id: 'canvas', name: 'Canvas', minutes: 45, mark: 'C', color: '#be8a65' },
  { id: 'docs', name: 'Google Docs', minutes: 30, mark: '▤', color: '#6b91b0' },
  { id: 'music', name: 'Music', minutes: 20, mark: '♫', color: '#7b977a' }
];
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function dateBefore(days, now = new Date()) { const d = new Date(now); d.setDate(d.getDate() - days); return localDate(d); }
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, Number(v) || 0));
export const duration = minutes => { const n = Math.round(minutes); return n < 60 ? `${n}m` : `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ''}`; };
export const number = n => Math.round(n).toLocaleString('en-US');
export function defaultDay(date) { return { date, steps: 6240, sleep: 490, usage: Object.fromEntries(APP_LIST.map(a => [a.id, a.minutes])), closed: false, walkSeconds: 0, restSeconds: 0, focusSeconds: 0 }; }
export function initialState() {
  const days = {};
  const steps = [4300, 5100, 4800, 5600, 5000, 6200, 5400, 6600, 7200, 5900, 8100, 7500, 6900];
  for (let i = 13; i > 0; i--) {
    const date = dateBefore(i);
    days[date] = { ...defaultDay(date), steps: steps[13 - i], sleep: 390 + ((13 - i) % 5) * 20,
      usage: { instagram: 80 - (13 - i) * 2, tiktok: 60, youtube: 55, canvas: 45, docs: 30, music: 20 }, closed: true };
  }
  const today = localDate(); days[today] = defaultDay(today);
  return { version: 2, goals: { steps: 8000, sleep: 480, screen: 180 }, excluded: ['canvas', 'docs', 'music'], days,
    rewards: { trees: 8, visitors: 2, claims: [`${today}:sleep`], visitorDates: [], focusIds: [], log: [] },
    focus: null, selectedTree: 'Oak', joined: false, focusMinutes: 25, focusTag: 'Unplug', demoSpeed: false,
    tracking: newTracking(), ecosystem: { discoveredIDs: [], discoveredAt: {} } };
}
export function countedScreen(day, excluded) { return Object.entries(day.usage).reduce((sum, [id, minutes]) => sum + (excluded.includes(id) ? 0 : Number(minutes)), 0); }
export function attainments(day, goals, excluded) { const screen = countedScreen(day, excluded); return { steps: clamp(day.steps / goals.steps), sleep: clamp(day.sleep / goals.sleep), screen: clamp(goals.screen / Math.max(1, screen)) }; }
export function goalStates(day, goals, excluded) { return { steps: day.steps >= goals.steps, sleep: day.sleep >= goals.sleep, screen: day.closed && countedScreen(day, excluded) <= goals.screen }; }
export function awardHabits(state) {
  const day = state.days[localDate()]; const done = goalStates(day, state.goals, state.excluded); const messages = [];
  for (const habit of ['steps', 'sleep', 'screen']) {
    const claim = `${day.date}:${habit}`;
    if (done[habit] && !state.rewards.claims.includes(claim)) {
      state.rewards.claims.push(claim); state.rewards.trees++; messages.push('A new tree joined your grove');
      state.rewards.log.unshift({ label: `${habit === 'steps' ? 'Movement' : habit === 'sleep' ? 'Sleep' : 'Screen time'} goal`, date: day.date, kind: 'tree' });
    }
  }
  if (Object.values(done).every(Boolean) && !state.rewards.visitorDates.includes(day.date)) {
    state.rewards.visitorDates.push(day.date); state.rewards.visitors++;
    state.rewards.log.unshift({ label: 'A balanced day', date: day.date, kind: 'visitor' });
    messages.push('A fox visited your grove!');
  }
  return messages;
}
export function improvement(state) {
  const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
  const score = i => { const d = state.days[dateBefore(i)]; return d ? mean(Object.values(attainments(d, state.goals, state.excluded))) : null; };
  const current = Array.from({ length: 7 }, (_, i) => score(i));
  const previous = Array.from({ length: 7 }, (_, i) => score(i + 7));
  return current.some(v => v === null) || previous.some(v => v === null) ? null : (mean(current) - mean(previous)) * 100;
}
export function remainingSeconds(focus, now = Date.now()) {
  if (!focus) return 0;
  return focus.status === 'running' ? Math.max(0, Math.ceil((focus.endsAt - now) / 1000)) : Math.max(0, focus.remaining);
}
export function completeFocus(state) {
  const f = state.focus;
  if (!f || f.status === 'complete' || remainingSeconds(f) > 0) return false;
  f.status = 'complete'; f.remaining = 0;
  if (!state.rewards.focusIds.includes(f.id)) {
    state.rewards.focusIds.push(f.id); state.rewards.trees++;
    state.rewards.log.unshift({ label: `${f.minutes} min of ${f.tag.toLowerCase()}`, date: localDate(), kind: 'tree' });
    return true;
  }
  return false;
}
export function ensureToday(state, now = Date.now()) { ensureDay(state, localDate(new Date(now))); }
export function loadState(storage) {
  try {
    const s = JSON.parse(storage.getItem(STORAGE_KEY));
    if ([1, 2].includes(s?.version) && s.days && s.goals?.steps > 0 && s.goals?.sleep > 0 && s.goals?.screen > 0 && Array.isArray(s.excluded) && Array.isArray(s.rewards?.claims) && Array.isArray(s.rewards?.focusIds) && Array.isArray(s.rewards?.visitorDates)) { return migrateState(s); }
  } catch (_) { /* Fresh state when storage is unavailable or invalid. */ }
  return initialState();
}

// Demo sensor records and actual elapsed sessions stay in separate fields.
const SESSION_FIELDS = { walk: 'walkSeconds', rest: 'restSeconds', focus: 'focusSeconds' };
const SESSION_KEYS = { walk: 'steps', rest: 'sleep', focus: 'screen' };
const SESSION_GOALS = { steps: 20, sleep: 480, screen: 25 };
const DAY_SECONDS = 24 * 60 * 60;
const DEMO_PHASE_MS = 10000;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback) => finite(value) > 0 ? Number(value) : fallback;
const timestamp = now => finite(now, Date.now());

function newTracking() {
  return { mode: 'demo', demo: { running: false, startedAt: null, phase: 0, lastSync: null }, session: null, sessions: [], sessionGoals: { ...SESSION_GOALS } };
}
function ensureDay(state, date) {
  if (!state.days[date]) state.days[date] = { date, steps: 0, sleep: 0, usage: Object.fromEntries(APP_LIST.map(a => [a.id, 0])), closed: false };
  const day = state.days[date];
  for (const field of Object.values(SESSION_FIELDS)) day[field] = Math.max(0, finite(day[field]));
  return day;
}
function migrateState(state) {
  state.version = 2;
  const old = state.tracking || {}, defaults = newTracking();
  state.tracking = { ...defaults, ...old, mode: old.mode === 'sessions' ? 'sessions' : 'demo',
    demo: { ...defaults.demo, ...(old.demo || {}) }, sessionGoals: { ...SESSION_GOALS, ...(old.sessionGoals || {}) },
    sessions: Array.isArray(old.sessions) ? old.sessions : [] };
  const active = state.tracking.session;
  if (active && (!SESSION_FIELDS[active.kind] || !['running', 'paused'].includes(active.status) || (active.status === 'running' && !Number.isFinite(active.startedAt)))) state.tracking.session = null;
  else if (active) active.targetSeconds = positive(active.targetSeconds, sessionTarget(state, active.kind));
  const found = state.ecosystem || {};
  state.ecosystem = { discoveredIDs: Array.isArray(found.discoveredIDs) ? [...new Set(found.discoveredIDs.filter(id => SPECIES.some(s => s.id === id)))] : [], discoveredAt: found.discoveredAt || {} };
  for (const date of Object.keys(state.days)) ensureDay(state, date);
  ensureToday(state);
  return state;
}

export const SPECIES = [
  { id: 'oak', name: 'Oak', kind: 'tree', habitat: 'woodland', rule: 'Movement reaches 20%' },
  { id: 'flowers', name: 'Wildflowers', kind: 'plant', habitat: 'meadow', rule: 'Rest reaches 25%' },
  { id: 'fish', name: 'Fish', kind: 'animal', habitat: 'pond', rule: 'Screen balance reaches 35%' },
  { id: 'pine', name: 'Pine', kind: 'tree', habitat: 'woodland', rule: 'Movement 65% and rest 35%' },
  { id: 'fern', name: 'Fern', kind: 'plant', habitat: 'woodland', rule: 'Movement 45% and screen balance 35%' },
  { id: 'rabbit', name: 'Rabbit', kind: 'animal', habitat: 'meadow', rule: 'Rest 65% and movement 40%' },
  { id: 'frog', name: 'Frog', kind: 'animal', habitat: 'pond', rule: 'Screen balance 65% and rest 40%' },
  { id: 'butterfly', name: 'Butterfly', kind: 'insect', habitat: 'meadow', rule: 'Rest 75%, movement 45%, screen balance 55%' },
  { id: 'fox', name: 'Fox', kind: 'animal', habitat: 'woodland', rule: 'Movement 85%, rest 80%, screen balance 70%' },
  { id: 'deer', name: 'Deer', kind: 'animal', habitat: 'meadow', rule: 'Every habit reaches 90%' },
  { id: 'heron', name: 'Heron', kind: 'animal', habitat: 'pond', rule: 'Screen balance 100%, movement and rest 95%' },
  { id: 'otter', name: 'Otter', kind: 'animal', habitat: 'pond', rule: 'All three habitats reach 100%' }
];

// Live contributions are computed without mutating state, then committed once
// on pause or finish. Local-midnight splitting also handles DST boundaries.
function runningPieces(session, now) {
  if (!session || session.status !== 'running') return [];
  const start = finite(session.startedAt, now);
  const available = Math.max(0, DAY_SECONDS - Math.max(0, finite(session.elapsedSeconds)));
  const end = Math.max(start, Math.min(timestamp(now), start + available * 1000));
  const pieces = [];
  let cursor = start;
  while (cursor < end) {
    const date = new Date(cursor);
    const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
    const until = Math.min(end, midnight);
    pieces.push({ date: localDate(date), seconds: (until - cursor) / 1000 });
    cursor = until;
  }
  return pieces;
}
function daySessionTotal(day) {
  return Object.values(SESSION_FIELDS).reduce((sum, field) => sum + Math.max(0, finite(day?.[field])), 0);
}
export function sessionElapsed(session, now = Date.now()) {
  return Math.min(DAY_SECONDS, Math.max(0, finite(session?.elapsedSeconds)) + runningPieces(session, now).reduce((sum, part) => sum + part.seconds, 0));
}
function sessionTarget(state, kind) {
  const key = SESSION_KEYS[kind];
  return positive(state.tracking?.sessionGoals?.[key], SESSION_GOALS[key]) * 60;
}
function creditRunningSession(state, now) {
  const session = state.tracking.session;
  const pieces = runningPieces(session, now);
  for (const part of pieces) {
    const day = ensureDay(state, part.date), field = SESSION_FIELDS[session.kind];
    day[field] += Math.min(part.seconds, Math.max(0, DAY_SECONDS - daySessionTotal(day)));
  }
  session.elapsedSeconds = sessionElapsed(session, now);
  session.startedAt = timestamp(now);
}
export function trackedMetrics(state, now = Date.now()) {
  const date = localDate(new Date(timestamp(now))), day = state.days[date] || {};
  const mode = state.tracking?.mode === 'sessions' ? 'sessions' : 'demo';
  if (mode === 'demo') {
    const goals = { ...state.goals }, values = { steps: Math.max(0, finite(day.steps)), sleep: Math.max(0, finite(day.sleep)), screen: countedScreen({ usage: day.usage || {} }, state.excluded) };
    return { mode, values, goals, progress: { steps: clamp(values.steps / positive(goals.steps, 8000)), sleep: clamp(values.sleep / positive(goals.sleep, 480)), screen: clamp(positive(goals.screen, 180) / Math.max(1, values.screen)) }, labels: { steps: 'Movement', sleep: 'Sleep', screen: 'Screen time' }, units: { steps: 'steps', sleep: 'minutes', screen: 'minutes' } };
  }
  const values = sessionMinutesForDate(state, date, now);
  const configured = state.tracking.sessionGoals || SESSION_GOALS;
  const goals = Object.fromEntries(Object.keys(SESSION_GOALS).map(key => [key, positive(configured[key], SESSION_GOALS[key])]));
  return { mode, values, goals, progress: Object.fromEntries(Object.keys(values).map(key => [key, clamp(values[key] / goals[key])])), labels: { steps: 'Movement', sleep: 'Rest', screen: 'Focus' }, units: { steps: 'minutes', sleep: 'minutes', screen: 'minutes' } };
}
export function sessionMinutesForDate(state, date, now = Date.now()) {
  const day = state.days[date] || {};
  const seconds = { walk: Math.max(0, finite(day.walkSeconds)), rest: Math.max(0, finite(day.restSeconds)), focus: Math.max(0, finite(day.focusSeconds)) };
  const active = state.tracking.session;
  const live = runningPieces(active, now).filter(part => part.date === date).reduce((sum, part) => sum + part.seconds, 0);
  if (active && SESSION_FIELDS[active.kind]) seconds[active.kind] += Math.min(live, Math.max(0, DAY_SECONDS - daySessionTotal(day)));
  return { steps: seconds.walk / 60, sleep: seconds.rest / 60, screen: seconds.focus / 60 };
}
export function habitatState(state, now = Date.now()) {
  const metrics = trackedMetrics(state, now), p = metrics.progress;
  const weakest = Math.min(p.steps, p.sleep, p.screen);
  const date = localDate(new Date(timestamp(now)));
  const balanced = weakest >= 1 && (metrics.mode === 'sessions' || Boolean(state.days[date]?.closed));
  const eligible = { oak: p.steps >= .2, flowers: p.sleep >= .25, fish: p.screen >= .35,
    pine: p.steps >= .65 && p.sleep >= .35, fern: p.steps >= .45 && p.screen >= .35,
    rabbit: p.sleep >= .65 && p.steps >= .4, frog: p.screen >= .65 && p.sleep >= .4,
    butterfly: p.sleep >= .75 && p.steps >= .45 && p.screen >= .55,
    fox: p.steps >= .85 && p.sleep >= .8 && p.screen >= .7,
    deer: weakest >= .9, heron: p.screen >= 1 && p.steps >= .95 && p.sleep >= .95, otter: balanced };
  const species = SPECIES.filter(s => eligible[s.id]).map(s => s.id);
  const level = weakest >= .9 ? 3 : weakest >= .6 ? 2 : weakest >= .25 ? 1 : 0;
  const next = SPECIES.find(s => !eligible[s.id]);
  return { growth: { woodland: p.steps, meadow: p.sleep, pond: p.screen }, score: Math.round(weakest * 100), level,
    label: ['Taking root', 'Finding balance', 'Growing together', 'Thriving'][level], species,
    next: next ? { id: next.id, name: next.name, rule: next.rule } : { id: null, name: 'A thriving ecosystem', rule: 'Every species can visit' },
    balanced, progress: { ...p }, reasons: Object.entries(p).filter(([, value]) => value < 1).map(([key]) => metrics.labels[key]) };
}
export function reconcileEcosystem(state, now = Date.now()) {
  if (!state.ecosystem) state.ecosystem = { discoveredIDs: [], discoveredAt: {} };
  if (!Array.isArray(state.ecosystem.discoveredIDs)) state.ecosystem.discoveredIDs = [];
  if (!state.ecosystem.discoveredAt) state.ecosystem.discoveredAt = {};
  const messages = [];
  for (const id of habitatState(state, now).species) {
    if (state.ecosystem.discoveredIDs.includes(id)) continue;
    state.ecosystem.discoveredIDs.push(id);
    state.ecosystem.discoveredAt[id] = new Date(timestamp(now)).toISOString();
    messages.push(`${SPECIES.find(s => s.id === id).name} discovered`);
  }
  return messages;
}

function applyDemoPhase(state, phase, now) {
  const day = ensureDay(state, localDate(new Date(timestamp(now))));
  const movement = phase >= 1 ? 1 : .25, rest = phase >= 2 ? 1 : .25, screen = phase >= 3 ? 1 : .25;
  day.steps = Math.round(state.goals.steps * movement);
  day.sleep = Math.round(state.goals.sleep * rest);
  const counted = APP_LIST.filter(app => !state.excluded.includes(app.id));
  const total = Math.round(state.goals.screen / screen);
  day.usage = Object.fromEntries(APP_LIST.map(app => [app.id, state.excluded.includes(app.id) ? app.minutes : 0]));
  if (counted.length) day.usage[counted[0].id] = total;
  day.closed = phase === 3;
  state.tracking.demo.phase = phase;
  state.tracking.demo.lastSync = timestamp(now);
}
export function startDemoSync(state, now = Date.now()) {
  if (state.tracking?.session?.status === 'running') pauseSession(state, now);
  if (!state.tracking) state.tracking = newTracking();
  state.tracking.mode = 'demo';
  state.tracking.demo = { running: true, startedAt: timestamp(now), phase: 0, lastSync: timestamp(now) };
  applyDemoPhase(state, 0, now);
  return true;
}
export function syncDemo(state, now = Date.now()) {
  const demo = state.tracking?.demo;
  if (state.tracking?.mode !== 'demo' || !demo?.running || demo.startedAt === null) return false;
  const phase = Math.min(3, Math.max(0, Math.floor((timestamp(now) - demo.startedAt) / DEMO_PHASE_MS)));
  if (phase <= demo.phase) return false;
  applyDemoPhase(state, phase, now);
  if (phase === 3) demo.running = false;
  return true;
}
export function stopDemoSync(state) {
  const demo = state.tracking?.demo;
  if (!demo) return false;
  const wasRunning = demo.running;
  demo.running = false;
  return wasRunning;
}
export function beginSession(state, kind = 'walk', now = Date.now()) {
  if (!SESSION_FIELDS[kind]) throw new RangeError('Choose walk, rest, or focus');
  if (!state.tracking) state.tracking = newTracking();
  if (state.tracking.session) finishSession(state, now);
  stopDemoSync(state);
  state.tracking.mode = 'sessions';
  ensureToday(state, now);
  const id = typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `session-${timestamp(now)}-${Math.random().toString(36).slice(2)}`;
  state.tracking.session = { id, kind, status: 'running', createdAt: timestamp(now), startedAt: timestamp(now), elapsedSeconds: 0, targetSeconds: sessionTarget(state, kind) };
  return state.tracking.session;
}
export function pauseSession(state, now = Date.now()) {
  const session = state.tracking?.session;
  if (session?.status !== 'running') return false;
  creditRunningSession(state, now);
  session.status = 'paused'; session.startedAt = null;
  return true;
}
export function resumeSession(state, now = Date.now()) {
  const session = state.tracking?.session;
  if (session?.status !== 'paused') return false;
  stopDemoSync(state); state.tracking.mode = 'sessions';
  session.status = 'running'; session.startedAt = timestamp(now);
  return true;
}
export function finishSession(state, now = Date.now()) {
  const session = state.tracking?.session;
  if (!session) return false;
  if (session.status === 'running') creditRunningSession(state, now);
  session.status = 'complete'; session.startedAt = null; session.finishedAt = timestamp(now);
  if (!state.tracking.sessions.some(saved => saved.id === session.id)) state.tracking.sessions.push({ ...session });
  state.tracking.session = null;
  return true;
}
