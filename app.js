import { STORAGE_KEY, APP_LIST, SPECIES, localDate, dateBefore, clamp, duration, number, initialState, countedScreen, improvement, ensureToday, loadState, trackedMetrics, habitatState, reconcileEcosystem, startDemoSync, syncDemo, stopDemoSync, beginSession, pauseSession, resumeSession, finishSession, sessionElapsed, sessionMinutesForDate } from './model.js?v=2';
import { renderHabitatScene, renderSpeciesIcon } from './scene.js?v=2';

const $ = selector => document.querySelector(selector);
const screen = $('#screen'), sheet = $('#sheet');
const storage = (() => { try { return localStorage; } catch { return null; } })();
let state = loadState(storage), tab = 'grove', trend = 'steps', activity = state.tracking.session?.kind || 'focus', guideFilter = 'all', toastTimer, lastDraw = 0;
const paths = {
  leaf: '<path d="M5 18C1 7 10 3 21 3c0 12-5 19-16 15Z"/><path d="m4 21 12-13"/>',
  grove: '<path d="m12 2-5 8h3l-5 7h5v5h4v-5h5l-5-7h3Z"/>',
  track: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3m6 1 2-2"/>',
  trends: '<path d="M4 20V9m8 11V4m8 16v-7"/>',
  friends: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/>',
  settings: '<path d="m10 3-.5 3-2 .9L5 6l-2 3 2.2 2v2L3 15l2 3 2.5-.9 2 .9.5 3h4l.5-3 2-.9 2.5.9 2-3-2.2-2v-2L21 9l-2-3-2.5.9-2-.9L14 3Z"/><circle cx="12" cy="12" r="3"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  steps: '<path d="m7 4 3 3-2 6m2-6 5 4 4-1M8 13l-3 7m3-7 5 1 2 6"/><circle cx="12" cy="3" r="1.5"/>',
  sleep: '<path d="M20 15A8.5 8.5 0 0 1 9 4 8.5 8.5 0 1 0 20 15Z"/><path d="M18 3v4m-2-2h4"/>',
  screen: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>',
  check: '<path d="m5 12 4 4L19 6"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  fox: '<path d="m4 3 8 5 8-5-1 12-7 6-7-6Z"/><path d="m5 14 7 3 7-3M8 11h.1m8 0h.1"/>',
  fish: '<path d="M3 12s5-8 11-4l5-3v14l-5-3C8 20 3 12 3 12Z"/><path d="M7 11h.1"/>',
  sync: '<path d="M20 7a9 9 0 0 0-15-1L2 9m0-5v5h5m-3 8a9 9 0 0 0 15 1l3-3m0 5v-5h-5"/>',
  pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="m8 5 11 7-11 7Z"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.leaf}</svg>`;
const escape = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => state.days[localDate()];
const signed = n => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}`;
const habitatNames = { steps: 'Woodland', sleep: 'Meadow', screen: 'Pond' };
const activityConfig = {
  walk: { key: 'steps', label: 'Walk', verb: 'walking', title: 'A little room to roam.', habitat: 'Woodland', species: 'oak', presets: [10, 20, 30] },
  rest: { key: 'sleep', label: 'Rest', verb: 'resting', title: 'Rest. Let life settle in.', habitat: 'Meadow', species: 'rabbit', presets: [420, 480, 540] },
  focus: { key: 'screen', label: 'Focus', verb: 'focusing', title: 'A little less scrolling.', habitat: 'Pond', species: 'fish', presets: [15, 25, 45] }
};
function save() { try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { toast('Changes last for this visit. Browser storage is unavailable.'); } }
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4000); }
function reconcile(announce = true) { const messages = reconcileEcosystem(state); save(); if (announce && messages.length) toast(messages.at(-1)); }
function clock(seconds) { const s = Math.max(0, Math.floor(seconds)); return s >= 3600 ? `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function metricValue(key, value) { return state.tracking.mode === 'demo' && key === 'steps' ? number(value) : duration(value); }
function sourceLabel() { return state.tracking.mode === 'demo' ? 'Demo sync' : 'Session tracking'; }
function header() {
  $('#app-header').innerHTML = `<a class="app-wordmark" href="./" aria-label="Grove home">${icon('leaf')}grove</a><div class="header-tools"><button class="demo-label ${state.tracking.demo.running ? 'syncing' : ''}" data-action="sources">${icon('sync')}<span>${sourceLabel()}</span></button><button class="icon-button" data-action="settings" aria-label="Settings">${icon('settings')}</button></div>`;
  $('.app-shell').classList.toggle('green-screen', tab === 'grove' || tab === 'track');
}
function navigation() {
  $('#navigation').innerHTML = [['grove', 'Grove', 'grove'], ['track', 'Track', 'track'], ['wildlife', 'Wildlife', 'fox'], ['trends', 'Trends', 'trends']].map(([id, label, glyph]) => `<button data-tab="${id}" class="nav-item ${tab === id || (tab === 'friends' && id === 'trends') ? 'active' : ''}" ${tab === id ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span></button>`).join('');
}
function metricRow(key, m) {
  const p = m.progress[key], value = m.values[key], goal = m.goals[key];
  const status = p >= 1 ? 'Thriving' : `${Math.round(p * 100)}%`;
  return `<button class="habit-row ${key}" data-habit="${key}" aria-label="${m.labels[key]}: ${metricValue(key, value)}. ${habitatNames[key]} ${status}. View tracking."><span class="habit-icon">${icon(key)}</span><span class="habit-content"><span class="habit-label">${m.labels[key]}<span class="habit-status ${p >= 1 ? 'done' : ''}">${p >= 1 ? icon('check') : ''}${status}</span></span><span class="habit-values"><strong>${metricValue(key, value)}</strong><span>/ ${metricValue(key, goal)}${m.mode === 'demo' && key === 'steps' ? ' steps' : m.mode === 'demo' && key === 'screen' ? ' limit' : ''}</span></span><span class="habitat-caption">${habitatNames[key]} ${icon(key === 'steps' ? 'grove' : key === 'sleep' ? 'fox' : 'fish')}</span><span class="progress-track"><span style="width:${p * 100}%"></span></span></span>${icon('arrow', 'habit-arrow')}</button>`;
}
function grove() {
  const h = habitatState(state), m = trackedMetrics(state), active = state.tracking.session;
  const discovery = h.next?.id ? h.next : null;
  return `<section class="grove-hero ecosystem-hero"><div class="hero-date"><span>${new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })}</span><button class="level-pill" data-action="biodiversity">${icon('leaf')}${escape(h.label)}</button></div><h1>Life grows in balance.</h1><button class="forest-scene living-scene" data-tab="wildlife" aria-label="Explore your sanctuary: ${h.species.length} species, ${h.score} biodiversity"><span class="scene-halo"></span><span id="home-scene">${renderHabitatScene(h, { idPrefix: 'home' })}</span></button><div class="ecosystem-totals"><button data-tab="wildlife">${icon('fox')}<strong>${h.species.length}</strong> species</button><i></i><button data-action="biodiversity"><span class="biodiversity-dot"></span><strong>${h.score}</strong> biodiversity${icon('info')}</button></div></section>
  <section class="today-section"><div class="section-heading"><h2>Three habits. One world.</h2></div><div class="habit-list">${['steps', 'sleep', 'screen'].map(key => metricRow(key, m)).join('')}</div>
  ${m.mode === 'demo' ? `<button class="sync-banner ${state.tracking.demo.running ? 'running' : ''}" data-action="${state.tracking.demo.running ? 'sources' : 'replay-demo'}">${icon('sync')}<span><strong>${state.tracking.demo.running ? 'Your demo devices are syncing' : 'Watch your habitat come alive'}</strong><span>${state.tracking.demo.running ? ['A little balance is missing', 'Movement is growing your woodland', 'Rest is bringing the meadow to life', 'All three habitats are thriving'][state.tracking.demo.phase] : 'Replay 30 seconds of tracked sample data'}</span></span>${icon('arrow')}</button>` : `<button class="sync-banner" data-tab="track">${icon('track')}<span><strong>${active ? `${activityConfig[active.kind].label} session ${active.status === 'paused' ? 'paused' : 'running'}` : 'Your next good habit starts here'}</strong><span>${active ? '<span data-session-elapsed></span> tracked automatically' : 'Walk, rest, or focus. We’ll keep time.'}</span></span>${icon('arrow')}</button>`}
  <button class="next-visitor" ${discovery ? `data-species="${discovery.id}"` : 'data-tab="wildlife"'}><span class="visitor-art">${renderSpeciesIcon(discovery?.id || 'otter')}</span><span><span class="small-label">${discovery ? 'NEXT TO DISCOVER' : 'A WORLD IN BALANCE'}</span><strong>${discovery ? escape(discovery.name) : 'A thriving little sanctuary'}</strong><span>${discovery ? escape(discovery.rule) : 'Every habit makes room for more life.'}</span></span>${icon('arrow')}</button></section>`;
}
function track() {
  const current = state.tracking.session, c = activityConfig[current?.kind || activity];
  const goal = current?.targetSeconds ? current.targetSeconds / 60 : state.tracking.sessionGoals[c.key], elapsed = current ? sessionElapsed(current) : 0, left = Math.max(0, goal * 60 - elapsed), p = clamp(elapsed / (goal * 60));
  return `<section class="focus-view tracking-view"><div class="eyebrow">GOOD HABITS, NATURALLY</div><h1>${current ? current.status === 'paused' ? 'Take your time.' : c.title : 'Make a little room for life.'}</h1><div class="activity-tabs" aria-label="Tracked activity">${Object.entries(activityConfig).map(([id, conf]) => `<button data-activity="${id}" class="${(current?.kind || activity) === id ? 'selected' : ''}" ${current ? 'disabled' : ''}>${icon(conf.key)}${conf.label}</button>`).join('')}</div><div class="tree-stage session-stage"><svg class="timer-ring" viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="143" class="ring-base"/><circle cx="150" cy="150" r="143" class="ring-progress" style="stroke-dashoffset:${899 * (1 - p)}"/></svg><span class="activity-emblem">${c.species === 'oak' ? '<img src="assets/sapling.svg" alt="A growing oak">' : renderSpeciesIcon(c.species)}</span><span class="stage-habitat">${c.habitat}</span></div><div class="countdown" id="countdown">${clock(left)}</div><p class="timer-caption"><span data-session-elapsed>${clock(elapsed)}</span> tracked · ${c.habitat.toLowerCase()} growing</p>
  ${current ? `<div class="focus-actions"><button class="primary mint" data-action="${current.status === 'paused' ? 'resume-session' : 'pause-session'}">${icon(current.status === 'paused' ? 'play' : 'pause')}${current.status === 'paused' ? 'Keep going' : 'Pause'}</button><button class="ghost-light" data-action="finish-session">Finish & save</button></div>` : `<div class="session-presets" aria-label="Session target">${c.presets.map(n => `<button data-target="${n}" class="${n === goal ? 'selected' : ''}">${duration(n)}</button>`).join('')}</div><button class="primary mint" data-action="start-session">${icon(c.key)}Start ${c.label.toLowerCase()}</button>`}
  <p class="session-source-note">${c.key === 'sleep' ? 'Times your rest session. Sleep detection needs a wearable.' : c.key === 'steps' ? 'Times your walk session. Step counts need a connected device.' : 'Times your focus session. Other apps aren’t monitored.'}</p><button class="ghost-light source-link" data-action="sources">${icon('sync')}Data sources${icon('arrow')}</button>${sessionHistory()}</section>`;
}
function sessionHistory() {
  const sessions = state.tracking.sessions.slice(-3).reverse();
  if (!sessions.length) return '';
  return `<div class="session-history"><h2>Little moments, saved</h2>${sessions.map(s => `<div>${icon(activityConfig[s.kind]?.key || 'track')}<span>${activityConfig[s.kind]?.label || 'Session'}</span><strong>${duration((s.seconds ?? s.elapsedSeconds ?? 0) / 60)}</strong></div>`).join('')}</div>`;
}
function wildlife() {
  const h = habitatState(state), discovered = new Set(state.ecosystem.discoveredIDs);
  const kind = id => ['oak', 'pine', 'fern', 'flowers'].includes(id) ? 'plants' : ['fish', 'frog', 'heron', 'otter'].includes(id) ? 'water' : 'wildlife';
  const filtered = SPECIES.filter(s => guideFilter === 'all' || kind(s.id) === guideFilter);
  return `<section class="page-view wildlife-view"><div class="page-title"><div class="eyebrow">YOUR SANCTUARY</div><h1>A wild little world.</h1></div><div class="guide-summary"><strong>${discovered.size}<span> / ${SPECIES.length}</span></strong><div><span>species discovered</span><button data-action="biodiversity">${h.label}${icon('info')}</button></div></div><div class="habitat-balance">${[['woodland', 'Woodland', 'steps'], ['meadow', 'Meadow', 'sleep'], ['pond', 'Pond', 'screen']].map(([id, name, key]) => `<button data-habit="${key}" class="${key}">${icon(key === 'steps' ? 'grove' : key === 'sleep' ? 'fox' : 'fish')}<span>${name}</span><strong>${Math.round(h.growth[id] * 100)}%</strong><span class="progress-track"><span style="width:${h.growth[id] * 100}%"></span></span></button>`).join('')}</div><p class="guide-intro">Different habits. Different habitats. More balance brings more life.</p><div class="guide-filters" aria-label="Species category">${[['all', 'All'], ['plants', 'Plants'], ['wildlife', 'Wildlife'], ['water', 'Water']].map(([id, label]) => `<button data-filter="${id}" class="${guideFilter === id ? 'selected' : ''}">${label}</button>`).join('')}</div><div class="species-grid">${filtered.map(s => `<button class="species-card ${discovered.has(s.id) ? 'discovered' : 'locked'}" data-species="${s.id}" aria-label="${escape(s.name)}, ${discovered.has(s.id) ? h.species.includes(s.id) ? 'here now' : 'discovered' : 'not yet discovered'}"><span class="species-art">${renderSpeciesIcon(s.id)}</span><strong>${escape(s.name)}</strong><span>${discovered.has(s.id) ? h.species.includes(s.id) ? '<i></i>Here now' : 'Discovered' : 'Yet to discover'}</span></button>`).join('')}</div></section>`;
}
function trends() {
  const m = trackedMetrics(state), goal = m.goals[trend];
  const values = Array.from({ length: 7 }, (_, i) => { const date = dateBefore(6 - i), d = state.days[date]; return { date, value: d ? m.mode === 'sessions' ? sessionMinutesForDate(state, date)[trend] : trend === 'screen' ? countedScreen(d, state.excluded) : d[trend] : null }; });
  if (m.mode === 'sessions') values[6].value = m.values[trend];
  const known = values.filter(v => v.value !== null), avg = known.length ? known.reduce((sum, p) => sum + p.value, 0) / known.length : 0, max = Math.max(goal * 1.2, ...known.map(v => v.value));
  return `<section class="page-view"><div class="page-title"><div class="eyebrow">SMALL HABITS, BIG CHANGES</div><h1>Your rhythm.</h1></div><div class="period-label">Last 7 days<span>${sourceLabel()}</span></div><div class="segmented">${['steps', 'sleep', 'screen'].map(key => `<button data-trend="${key}" class="${trend === key ? 'active' : ''}">${icon(key)}${m.labels[key]}</button>`).join('')}</div><div class="chart-card"><div class="chart-summary"><span>Daily average</span><strong>${metricValue(trend, avg)}</strong><span>${trend === 'steps' && m.mode === 'demo' ? 'steps per day' : 'per day'}</span></div><div class="bar-chart" role="img" aria-label="${m.labels[trend]} last seven days: ${values.map(p => `${p.date}: ${p.value === null ? 'no data' : metricValue(trend, p.value)}`).join('; ')}"><div class="goal-line" style="bottom:calc(28px + ${goal / max * 160}px)"><span>Goal</span></div>${values.map((p, i) => `<div class="chart-column"><div class="bar-space"><div class="chart-bar ${i === 6 ? 'today-bar' : ''}" style="height:${p.value === null || p.value === 0 ? 0 : Math.max(4, p.value / max * 160)}px"><span>${p.value === null ? '—' : metricValue(trend, p.value)}</span></div></div><span class="day-label">${new Date(p.date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'narrow' })}</span></div>`).join('')}</div></div><div class="insight-card">${icon('leaf')}<div><h2>Every habitat needs a little care.</h2><p>Movement, rest, and focus work together.</p></div></div><button class="outline-button" data-tab="wildlife">Explore your biodiversity${icon('fox')}</button>${m.mode === 'demo' ? '<button class="outline-button" data-tab="friends">A friendly challenge' + icon('friends') + '</button>' : ''}</section>`;
}
function friends() {
  const points = improvement(state), peers = [{ name: 'Maya', mark: 'M', color: 'peach', score: 14.2 }, { name: 'Leo', mark: 'L', color: 'lavender', score: 9.6 }, { name: 'Sam', mark: 'S', color: 'yellow', score: 7.8 }];
  if (state.joined) peers.push({ name: 'You', mark: 'Y', color: 'green', score: points, you: true });
  peers.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
  return `<section class="page-view friends-view"><div class="page-title"><div class="eyebrow">DEMO FRIENDS</div><h1>Grow together.</h1></div><p class="center-copy">Personal improvement. Shared encouragement.</p><div class="challenge-banner"><div><strong>The balance challenge</strong><span>Last 7 days · Sample device data</span></div><button class="icon-button" data-action="scoring" aria-label="How challenge scoring works">${icon('info')}</button></div><div class="leaderboard">${peers.map((p, i) => `<div class="leader-row ${p.you ? 'you' : ''}"><span class="rank">${i + 1}</span><span class="avatar ${p.color}">${p.mark}</span><strong>${p.name}${p.you ? `<span class="you-label">${p.score === null ? 'Building your history' : 'Demo improvement'}</span>` : ''}</strong><span class="leader-score">${p.score === null ? '—' : signed(p.score)}<span>pts</span></span></div>`).join('')}</div><button class="primary" data-action="join">${state.joined ? 'Leave challenge' : 'Join the challenge'}</button><p class="challenge-note">Progress against your own goals earns points.</p><button class="outline-button" data-tab="trends">Back to trends</button></section>`;
}
function render(keepScroll = false) {
  ensureToday(state); if (reconcileEcosystem(state).length) save(); const top = screen.scrollTop; header(); navigation();
  screen.innerHTML = ({ grove, track, wildlife, trends, friends })[tab]();
  screen.scrollTop = keepScroll ? top : 0; refreshTimer(); lastDraw = Date.now();
}
function go(next) { if (!['grove', 'track', 'wildlife', 'trends', 'friends'].includes(next)) return; tab = next; render(); screen.focus({ preventScroll: true }); }
function openSheet(title, body) {
  $('#sheet-content').innerHTML = `<div class="sheet-handle"></div><div class="sheet-heading"><h2 id="sheet-title">${title}</h2><button class="icon-button" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>${body}`;
  if (!sheet.open) sheet.showModal(); else $('#sheet-content .icon-button').focus();
}
function sourcesSheet() {
  const mode = state.tracking.mode;
  openSheet('Let your habits do the growing', `<p class="sheet-description">Progress comes from tracked data. Your habitat follows along.</p><button class="source-option ${mode === 'demo' ? 'selected' : ''}" data-action="use-demo"><span class="source-symbol">${icon('sync')}</span><span><strong>Demo device sync</strong><span>Sample wearable + screen-time feeds</span></span>${mode === 'demo' ? icon('check') : icon('arrow')}</button><button class="source-option ${mode === 'sessions' ? 'selected' : ''}" data-action="use-sessions"><span class="source-symbol">${icon('track')}</span><span><strong>My timed sessions</strong><span>Walk, rest, and focus time</span></span>${mode === 'sessions' ? icon('check') : icon('arrow')}</button><div class="source-details">${mode === 'demo' ? `<span class="source-state">${state.tracking.demo.running ? '<i class="pulse-dot"></i>Syncing sample data' : 'Sample data synced'}</span><p>A 30-second demo shows each habitat recovering. These are simulated device readings.</p><button class="primary" data-action="replay-demo">${state.tracking.demo.running ? 'Restart demo sync' : 'Replay demo sync'}</button>` : '<span class="source-state">Session timer ready</span><p>Start a session. Elapsed time is saved automatically. No totals to enter.</p><button class="primary" data-action="open-track">Start a session</button>'}</div><div class="native-connection">${icon('info')}<p>Device-wide steps, sleep, and screen time need native platform integrations and permission.</p></div>`);
}
function habitSheet(key) {
  const m = trackedMetrics(state), kind = { steps: 'walk', sleep: 'rest', screen: 'focus' }[key];
  const description = { steps: 'Movement grows trees and thickens the woodland.', sleep: 'Rest grows a flower-rich meadow where wildlife can settle.', screen: 'Screen balance restores the pond for fish, frogs, and visiting birds.' }[key];
  const source = m.mode === 'demo' ? key === 'screen' ? 'Simulated screen-time feed' : 'Simulated wearable feed' : 'Automatically timed sessions';
  openSheet(m.labels[key], `<div class="habitat-detail-art">${renderSpeciesIcon(key === 'steps' ? 'oak' : key === 'sleep' ? 'rabbit' : 'fish')}</div><div class="sheet-value">${metricValue(key, m.values[key])}</div><p class="source-detail-label">${source}</p><p class="sheet-description">${description}</p><form id="goal-form" data-key="${key}"><div class="form-field"><label for="goal">Your daily ${m.mode === 'demo' && key === 'screen' ? 'limit' : 'goal'}<span>${m.mode === 'demo' && key === 'steps' ? 'steps' : 'minutes'}</span></label><input id="goal" name="goal" type="number" min="${m.mode === 'demo' && key === 'steps' ? 1000 : 1}" max="${m.mode === 'demo' && key === 'steps' ? 50000 : 1440}" step="1" value="${m.goals[key]}" required></div><button class="primary" type="submit">Save goal</button></form><button class="outline-button" data-start-kind="${kind}">Track a ${activityConfig[kind].label.toLowerCase()} session${icon('track')}</button><button class="text-button source-detail-button" data-action="sources">Data sources${icon('arrow')}</button>`);
}
function speciesSheet(id) {
  const s = SPECIES.find(s => s.id === id); if (!s) return;
  const h = habitatState(state), discovered = state.ecosystem.discoveredIDs.includes(id);
  openSheet(s.name, `<div class="species-detail-art ${discovered ? '' : 'undiscovered'}">${renderSpeciesIcon(id)}</div><span class="species-detail-status">${discovered ? h.species.includes(id) ? 'At home in your sanctuary' : 'Discovered in your sanctuary' : 'A little more balance brings this species'}</span><p class="sheet-description">${escape(s.rule)}</p><div class="species-habitat-label">${icon(s.habitat === 'woodland' ? 'grove' : s.habitat === 'pond' ? 'fish' : 'fox')}${escape(s.habitat || 'Shared habitat')}</div><button class="primary" data-action="open-track">Make room for more life</button>`);
}
function biodiversitySheet() {
  const h = habitatState(state);
  openSheet('A little of everything', `<div class="biodiversity-score"><strong>${h.score}</strong><span>biodiversity</span></div><p class="sheet-description">A thriving ecosystem needs all three habitats. One strong habit can’t carry the whole forest.</p><div class="reward-rule">${icon('grove')}Movement grows the woodland</div><div class="reward-rule">${icon('fox')}Rest brings the meadow to life</div><div class="reward-rule">${icon('fish')}Screen balance restores the pond</div><p class="field-note">Foxes, deer, herons, and otters need a balanced mix. Discoveries stay in your wildlife guide.</p><p class="sheet-footer">Biodiversity is a game mechanic, not a health score.</p>`);
}
function settingsSheet() {
  const m = trackedMetrics(state);
  openSheet('Make it your own', `<div class="settings-group"><h3>YOUR GOALS</h3>${['steps', 'sleep', 'screen'].map(key => `<button class="settings-row" data-habit="${key}">${icon(key)}<span>${m.labels[key]}</span><strong>${metricValue(key, m.goals[key])}</strong>${icon('arrow')}</button>`).join('')}</div><div class="settings-group"><h3>YOUR WORLD</h3><button class="settings-row" data-action="sources">${icon('sync')}<span>Data sources</span><strong>${sourceLabel()}</strong>${icon('arrow')}</button><button class="settings-row" data-tab="wildlife" data-close>${icon('fox')}<span>Wildlife guide</span>${icon('arrow')}</button><button class="settings-row" data-action="biodiversity">${icon('leaf')}<span>How biodiversity grows</span>${icon('arrow')}</button>${m.mode === 'demo' ? '<button class="settings-row" data-action="exclusions">' + icon('screen') + '<span>Counted demo apps</span>' + icon('arrow') + '</button>' : ''}</div><div class="settings-group"><a class="settings-row" href="schematic.html" target="_blank" rel="noopener">${icon('info')}<span>Design & screen map</span><span>↗</span></a><button class="settings-row reset-row" data-action="reset">${icon('grove')}<span>Start a fresh sanctuary</span>${icon('arrow')}</button></div><p class="sheet-footer">${m.mode === 'demo' ? 'Demo sensor data' : 'Session timing'} · saved in this browser</p>`);
}
function exclusionsSheet() {
  openSheet('Make screen time count', `<p class="sheet-description">Choose which demo apps count toward your limit.</p><div class="apps-list">${APP_LIST.map(a => `<label class="toggle-row app-toggle"><span class="app-mark" style="--app-color:${a.color}">${a.mark}</span><span><strong>${a.name}</strong><span>${duration(today().usage[a.id])} in sample feed</span></span><input type="checkbox" data-app="${a.id}" ${state.excluded.includes(a.id) ? '' : 'checked'}><i></i></label>`).join('')}</div><div class="counted-total"><span>Counted today</span><strong id="counted-total">${duration(countedScreen(today(), state.excluded))}</strong></div><button class="primary" data-action="close-sheet">Done</button><p class="sheet-footer">Simulated app usage. No other apps are monitored.</p>`);
}
function scoringSheet() { openSheet('Small progress counts', '<p class="sheet-description">The sample challenge compares your last seven days with the previous seven. Movement, sleep, and screen balance have equal weight. Each is capped at 100%.</p><p class="field-note">The difference is shown in percentage points. Peer scores and device readings are demo data.</p>'); }
function switchMode(mode) {
  if (state.tracking.session && mode === 'demo') { openSheet('Save your session first', '<p class="sheet-description">Finish your current session before changing data sources.</p><button class="primary" data-action="open-track">Back to my session</button>'); return; }
  state.tracking.mode = mode; if (mode === 'sessions') stopDemoSync(state); reconcile(false); sheet.close(); render(true);
}
function replayDemo() {
  if (state.tracking.session) { switchMode('demo'); return; }
  startDemoSync(state); reconcile(false); sheet.close(); go('grove');
}
function startSession() {
  if (beginSession(state, activity)) { reconcile(false); sheet.close(); go('track'); toast(`${activityConfig[activity].label} timer started`); }
}
function endSession(automatic = false) {
  if (!state.tracking.session) return;
  const s = state.tracking.session, goal = s.targetSeconds || state.tracking.sessionGoals[activityConfig[s.kind].key] * 60;
  const endAt = automatic && s.status === 'running' ? Math.min(Date.now(), s.startedAt + Math.max(0, goal - s.elapsedSeconds) * 1000) : Date.now();
  const seconds = sessionElapsed(s, endAt);
  if (finishSession(state, endAt)) { reconcile(); render(true); toast(`${duration(seconds / 60)} tracked. Your habitat is growing.`); }
}

document.addEventListener('click', e => {
  const el = e.target.closest('button, a[data-tab]'); if (!el || el.disabled) return;
  if (el.dataset.tab) { if (el.hasAttribute('data-close')) sheet.close(); go(el.dataset.tab); return; }
  if (el.dataset.habit) { habitSheet(el.dataset.habit); return; }
  if (el.dataset.species) { speciesSheet(el.dataset.species); return; }
  if (el.dataset.filter) { guideFilter = el.dataset.filter; render(true); return; }
  if (el.dataset.trend) { trend = el.dataset.trend; render(true); return; }
  if (el.dataset.activity) { activity = el.dataset.activity; render(true); return; }
  if (el.dataset.target) { state.tracking.sessionGoals[activityConfig[activity].key] = Number(el.dataset.target); save(); render(true); return; }
  if (el.dataset.startKind) { activity = el.dataset.startKind; sheet.close(); go('track'); return; }
  const actions = {
    settings: settingsSheet, sources: sourcesSheet, 'use-demo': () => switchMode('demo'), 'use-sessions': () => switchMode('sessions'),
    'replay-demo': replayDemo, 'close-sheet': () => sheet.close(), biodiversity: biodiversitySheet, exclusions: exclusionsSheet, scoring: scoringSheet,
    'open-track': () => { sheet.close(); go('track'); }, 'start-session': startSession,
    'pause-session': () => { const s = state.tracking.session; if (s?.status === 'running' && sessionElapsed(s) >= (s.targetSeconds || state.tracking.sessionGoals[activityConfig[s.kind].key] * 60)) endSession(true); else { pauseSession(state); reconcile(false); render(true); } },
    'resume-session': () => { resumeSession(state); save(); render(true); },
    'finish-session': endSession,
    join: () => { state.joined = !state.joined; save(); render(true); toast(state.joined ? 'You joined the demo challenge' : 'You left the demo challenge'); },
    reset: () => openSheet('A fresh little start?', '<p class="sheet-description">Reset the sample feeds, session history, and wildlife discoveries in this browser.</p><button class="primary" data-action="confirm-reset">Start fresh</button><button class="outline-button" data-action="close-sheet">Keep my sanctuary</button>'),
    'confirm-reset': () => { state = initialState(); startDemoSync(state); reconcile(false); sheet.close(); go('grove'); }
  };
  actions[el.dataset.action]?.();
});
document.addEventListener('change', e => {
  if (e.target.dataset.app) { const id = e.target.dataset.app; state.excluded = e.target.checked ? state.excluded.filter(a => a !== id) : [...new Set([...state.excluded, id])]; reconcile(); $('#counted-total').textContent = duration(countedScreen(today(), state.excluded)); render(true); }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'goal-form') return; e.preventDefault();
  const key = e.target.dataset.key, value = Number(new FormData(e.target).get('goal'));
  if (!Number.isFinite(value) || value <= 0) return;
  if (state.tracking.mode === 'demo') state.goals[key] = value; else state.tracking.sessionGoals[key] = value;
  reconcile(); sheet.close(); render(true); toast('Goal updated');
});
sheet.addEventListener('click', e => { if (e.target === sheet) { const r = sheet.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) sheet.close(); } });
function refreshTimer() {
  const session = state.tracking.session; if (!session) return;
  const elapsed = sessionElapsed(session), c = activityConfig[session.kind], total = session.targetSeconds || state.tracking.sessionGoals[c.key] * 60;
  document.querySelectorAll('[data-session-elapsed]').forEach(el => el.textContent = clock(elapsed));
  if (tab === 'track') { const value = $('#countdown'); if (value) value.textContent = clock(Math.max(0, total - elapsed)); const ring = $('.ring-progress'); if (ring) ring.style.strokeDashoffset = 899 * (1 - clamp(elapsed / total)); }
}
function tick() {
  const missing = !state.days[localDate()]; ensureToday(state);
  if (syncDemo(state)) { reconcile(); render(true); }
  else if (missing) { reconcile(false); render(true); }
  if (state.tracking.session) {
    refreshTimer();
    const s = state.tracking.session, total = s.targetSeconds || state.tracking.sessionGoals[activityConfig[s.kind].key] * 60;
    if (s.status === 'running' && sessionElapsed(s) >= total) endSession(true);
    else if (Date.now() - lastDraw >= 10000 && !sheet.open) { reconcile(false); render(true); }
  }
}
if (state.tracking.mode === 'demo' && !state.tracking.demo.startedAt) startDemoSync(state);
if (state.tracking.demo.running) syncDemo(state);
reconcile(false); render(); tick();
document.addEventListener('visibilitychange', tick);
setInterval(tick, 250);
