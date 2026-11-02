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
export function defaultDay(date) { return { date, steps: 6240, sleep: 490, usage: Object.fromEntries(APP_LIST.map(a => [a.id, a.minutes])), closed: false }; }
export function initialState() {
  const days = {};
  const steps = [4300, 5100, 4800, 5600, 5000, 6200, 5400, 6600, 7200, 5900, 8100, 7500, 6900];
  for (let i = 13; i > 0; i--) {
    const date = dateBefore(i);
    days[date] = { ...defaultDay(date), steps: steps[13 - i], sleep: 390 + ((13 - i) % 5) * 20,
      usage: { instagram: 80 - (13 - i) * 2, tiktok: 60, youtube: 55, canvas: 45, docs: 30, music: 20 }, closed: true };
  }
  const today = localDate(); days[today] = defaultDay(today);
  return { version: 1, goals: { steps: 8000, sleep: 480, screen: 180 }, excluded: ['canvas', 'docs', 'music'], days,
    rewards: { trees: 8, visitors: 2, claims: [`${today}:sleep`], visitorDates: [], focusIds: [], log: [] },
    focus: null, selectedTree: 'Oak', joined: false, focusMinutes: 25, focusTag: 'Unplug', demoSpeed: false };
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
export function ensureToday(state) { const date = localDate(); if (!state.days[date]) state.days[date] = { date, steps: 0, sleep: 0, usage: Object.fromEntries(APP_LIST.map(a => [a.id, 0])), closed: false }; }
export function loadState(storage) {
  try {
    const s = JSON.parse(storage.getItem(STORAGE_KEY));
    if (s?.version === 1 && s.days && s.goals?.steps > 0 && s.goals?.sleep > 0 && s.goals?.screen > 0 && Array.isArray(s.excluded) && Array.isArray(s.rewards?.claims) && Array.isArray(s.rewards?.focusIds) && Array.isArray(s.rewards?.visitorDates)) { ensureToday(s); return s; }
  } catch (_) { /* Fresh state when storage is unavailable or invalid. */ }
  return initialState();
}
