import { STORAGE_KEY, APP_LIST, localDate, dateBefore, clamp, duration, number, initialState, countedScreen, attainments, goalStates, awardHabits, improvement, remainingSeconds, completeFocus, ensureToday, loadState } from './model.js';

const $ = selector => document.querySelector(selector);
const screen = $('#screen'), sheet = $('#sheet');
const browserStorage = (() => { try { return localStorage; } catch (_) { return null; } })();
let state = loadState(browserStorage), tab = 'grove', trend = 'steps', toastTimer;
const paths = {
  leaf: '<path d="M5 18C1 7 10 3 21 3c0 12-5 19-16 15Z"/><path d="m4 21 12-13"/>',
  grove: '<path d="m12 2-5 8h3l-5 7h5v5h4v-5h5l-5-7h3Z"/>',
  focus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3m6 1 2-2"/>',
  trends: '<path d="M4 20V9m8 11V4m8 16v-7"/>',
  friends: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/>',
  settings: '<path d="m10 3-.5 3-2 .9L5 6l-2 3 2.2 2v2L3 15l2 3 2.5-.9 2 .9.5 3h4l.5-3 2-.9 2.5.9 2-3-2.2-2v-2L21 9l-2-3-2.5.9-2-.9L14 3Z"/><circle cx="12" cy="12" r="3"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  steps: '<path d="m7 4 3 3-2 6m2-6 5 4 4-1M8 13l-3 7m3-7 5 1 2 6"/><circle cx="12" cy="3" r="1.5"/>',
  sleep: '<path d="M20 15A8.5 8.5 0 0 1 9 4 8.5 8.5 0 1 0 20 15Z"/><path d="M18 3v4m-2-2h4"/>',
  screen: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  fox: '<path d="m4 3 8 5 8-5-1 12-7 6-7-6Z"/><path d="m5 14 7 3 7-3M8 11h.1m8 0h.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trophy: '<path d="M7 3h10v6a5 5 0 0 1-10 0Zm5 11v6m-4 1h8M7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.leaf}</svg>`;
const escape = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => state.days[localDate()];
const signed = n => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}`;
function save() { try { browserStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { toast('Browser storage is unavailable. Changes last for this visit.'); } }
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4000); }
function updateRewards() { const messages = awardHabits(state); if (messages.length) toast(messages.at(-1)); save(); }

function header() {
  $('#app-header').innerHTML = `<a class="app-wordmark" href="./" aria-label="Grove home">${icon('leaf')}grove</a><div class="header-tools"><button class="demo-label" data-action="demo"><i></i>Demo</button><button class="icon-button" data-action="settings" aria-label="Settings">${icon('settings')}</button></div>`;
  document.querySelector('.app-shell').classList.toggle('green-screen', tab === 'grove' || tab === 'focus');
}
function navigation() {
  $('#navigation').innerHTML = [['grove', 'Grove'], ['focus', 'Focus'], ['trends', 'Trends'], ['friends', 'Friends']].map(([id, label]) => `<button data-tab="${id}" class="nav-item ${tab === id ? 'active' : ''}" ${tab === id ? 'aria-current="page"' : ''}>${icon(id)}<span>${label}</span></button>`).join('');
}
function metricRow(key, title, value, goal, status, done, progress) {
  return `<button class="habit-row ${key}" data-habit="${key}" aria-label="${title}: ${escape(value)}, ${escape(status)}. Edit habit."><span class="habit-icon">${icon(key)}</span><span class="habit-content"><span class="habit-label">${title}<span class="habit-status ${done ? 'done' : ''}">${done ? icon('check') : ''}${status}</span></span><span class="habit-values"><strong>${value}</strong><span>${goal}</span></span><span class="progress-track"><span style="width:${clamp(progress) * 100}%"></span></span></span>${icon('arrow', 'habit-arrow')}</button>`;
}
function grove() {
  const d = today(), goals = state.goals, screenTime = countedScreen(d, state.excluded), done = goalStates(d, goals, state.excluded), p = attainments(d, goals, state.excluded);
  const completed = Object.values(done).filter(Boolean).length;
  const stepLeft = Math.max(0, goals.steps - d.steps);
  const next = !done.steps ? { title: 'A little walk goes a long way', desc: `${number(stepLeft)} steps to your next tree`, action: 'Log a walk', key: 'steps' } : !done.sleep ? { title: 'Make room for rest', desc: `${duration(goals.sleep)} is your sleep goal`, action: 'Log sleep', key: 'sleep' } : { title: 'Make a little room for you', desc: 'Put your phone down. Plant something.', action: 'Start focus', key: 'focus' };
  return `<section class="grove-hero"><div class="eyebrow hero-date">${new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })}${icon('sun')}</div><h1>Your day, growing.</h1><button class="forest-scene" data-action="collection" aria-label="Explore your grove: ${state.rewards.trees} trees and ${state.rewards.visitors} visitors"><span class="scene-halo"></span><img src="assets/grove.svg" alt="A small floating forest island with a stream, green trees, and a fox" draggable="false"><span class="scene-spark spark-one">✦</span><span class="scene-spark spark-two">✧</span></button><div class="forest-totals"><span>${icon('grove')}<strong>${state.rewards.trees}</strong> trees</span><i></i><span>${icon('fox')}<strong>${state.rewards.visitors}</strong> visitors</span><button class="icon-button" data-action="collection" aria-label="View forest collection">${icon('arrow')}</button></div></section>
    <section class="today-section"><div class="section-heading"><h2>A little balance</h2><span>${completed}<span class="soft"> / 3 goals</span></span></div><div class="habit-list">
    ${metricRow('steps', 'Movement', number(d.steps), `/ ${number(goals.steps)} steps`, done.steps ? 'Goal met' : `${Math.round(p.steps * 100)}%`, done.steps, p.steps)}
    ${metricRow('sleep', 'Sleep', duration(d.sleep), `/ ${duration(goals.sleep)}`, done.sleep ? 'Well rested' : `${Math.round(p.sleep * 100)}%`, done.sleep, p.sleep)}
    ${metricRow('screen', 'Screen time', duration(screenTime), `/ ${duration(goals.screen)} limit`, done.screen ? 'Goal met' : screenTime > goals.screen ? 'Over limit' : `${duration(goals.screen - screenTime)} left`, done.screen, screenTime / goals.screen)}
    </div><div class="next-step"><span class="next-illustration">${icon(next.key === 'focus' ? 'leaf' : next.key)}</span><div><h3>${next.title}</h3><p>${next.desc}</p><button class="text-button" ${next.key === 'focus' ? 'data-tab="focus"' : `data-habit="${next.key}"`}>${next.action}<span>↗</span></button></div></div></section>`;
}

function focus() {
  const f = state.focus, active = f && ['running', 'paused'].includes(f.status), complete = f?.status === 'complete';
  const seconds = active ? remainingSeconds(f) : complete ? 0 : state.focusMinutes * 60;
  const progress = active ? 1 - seconds / f.total : complete ? 1 : 0;
  return `<section class="focus-view"><div class="eyebrow">A MOMENT FOR YOU</div><h1>${complete ? 'Look what you grew.' : active ? (f.status === 'paused' ? 'Take your time.' : 'Let your tree grow.') : 'Less scrolling. More living.'}</h1>
  <button class="tree-stage" data-action="choose-tree" aria-label="Choose tree. Current: ${state.selectedTree}"><svg class="timer-ring" viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="143" class="ring-base"/><circle cx="150" cy="150" r="143" class="ring-progress" style="stroke-dashoffset:${899 * (1 - progress)}"/></svg><img src="assets/${state.selectedTree === 'Pine' ? 'pine' : state.selectedTree === 'Blossom' ? 'blossom' : 'sapling'}.svg" alt="A young ${state.selectedTree.toLowerCase()} growing on a little earth island"><span class="tree-name">${state.selectedTree}${icon('arrow')}</span></button>
  <div class="focus-tags" aria-label="Focus activity">${['Unplug', 'Study', 'Create'].map(t => `<button data-tag="${t}" class="${(active ? f.tag : state.focusTag) === t ? 'selected' : ''}" ${active ? 'disabled' : ''}>${t}</button>`).join('')}</div>
  <div class="countdown" id="countdown" aria-live="off">${timerText(active && f.accelerated ? seconds * 60 : seconds)}</div>
  ${active ? `<p class="timer-caption">${f.status === 'paused' ? 'Your tree is waiting for you' : state.demoSpeed ? 'Demo time · 1 second = 1 minute' : 'One quiet moment at a time'}</p><div class="focus-actions"><button class="primary mint" data-action="${f.status === 'paused' ? 'resume' : 'pause'}">${f.status === 'paused' ? 'Keep growing' : 'Pause'}</button><button class="ghost-light" data-action="cancel-focus">End session</button></div>` : complete ? `<p class="timer-caption">One new tree. A little more space.</p><button class="primary mint" data-action="new-focus">Plant another</button><button class="ghost-light" data-tab="grove">Visit your grove</button>` : `<div class="duration-control"><button data-duration="-5" aria-label="Decrease focus duration by five minutes">−</button><label for="focus-duration" class="sr-only">Focus duration in minutes</label><input id="focus-duration" type="range" min="5" max="120" step="5" value="${state.focusMinutes}"><button data-duration="5" aria-label="Increase focus duration by five minutes">+</button></div><button class="primary mint" data-action="start-focus">${icon('leaf')}Plant a tree</button><p class="timer-caption">${state.demoSpeed ? 'Demo time · 1 second = 1 minute' : 'Your next tree starts with a little time'}</p>`}
  <button class="focus-exclusions" data-action="exclusions">${icon('screen')}Counted apps${icon('arrow')}</button></section>`;
}
function timerText(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }

function trends() {
  const configs = { steps: { title: 'Movement', unit: 'steps', goal: state.goals.steps, format: number }, sleep: { title: 'Sleep', unit: 'per night', goal: state.goals.sleep, format: duration }, screen: { title: 'Screen time', unit: 'per day', goal: state.goals.screen, format: duration } };
  const cfg = configs[trend];
  const points = Array.from({ length: 7 }, (_, i) => { const date = dateBefore(6 - i); const d = state.days[date]; return { date, value: d ? trend === 'screen' ? countedScreen(d, state.excluded) : d[trend] : null }; });
  const known = points.filter(p => p.value !== null), avg = known.length ? known.reduce((s, p) => s + p.value, 0) / known.length : 0;
  const max = Math.max(cfg.goal * 1.2, ...known.map(p => p.value));
  const delta = improvement(state);
  return `<section class="page-view"><div class="page-title"><div class="eyebrow">SMALL STEPS ADD UP</div><h1>Your rhythm.</h1></div><div class="period-label">Last 7 days <span>${new Date(points[0].date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span></div><div class="segmented">${Object.entries(configs).map(([key, c]) => `<button data-trend="${key}" class="${trend === key ? 'active' : ''}">${icon(key)}${c.title}</button>`).join('')}</div><div class="chart-card"><div class="chart-summary"><span>Daily average</span><strong>${cfg.format(avg)}</strong><span>${cfg.unit}</span></div><div class="bar-chart" role="img" aria-label="${cfg.title} for the last seven days: ${points.map(p => `${p.date}: ${p.value === null ? 'no data' : cfg.format(p.value)}`).join('; ')}"><div class="goal-line" style="bottom:calc(28px + ${cfg.goal / max * 160}px)"><span>Goal</span></div>${points.map((p, i) => `<div class="chart-column"><div class="bar-space"><div class="chart-bar ${i === 6 ? 'today-bar' : ''}" style="height:${p.value === null ? 0 : Math.max(4, p.value / max * 160)}px"><span>${p.value === null ? '—' : cfg.format(p.value)}</span></div></div><span class="day-label">${new Date(p.date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'narrow' })}</span></div>`).join('')}</div></div><div class="insight-card">${icon('leaf')}<div><h2>${delta === null ? 'A fresh start' : `${signed(delta)} points of progress`}</h2><p>${delta === null ? 'Keep logging to build your two-week picture.' : 'Your three habits, compared with the previous week.'}</p></div><button class="icon-button" data-action="scoring" aria-label="How progress points work">${icon('info')}</button></div><div class="section-heading"><h2>Your week, in balance</h2></div><div class="week-grid">${points.map(p => { const d = state.days[p.date]; const goals = d ? goalStates(d, state.goals, state.excluded) : {}; return `<div><span>${new Date(p.date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'narrow' })}</span>${['steps', 'sleep', 'screen'].map(key => `<i class="week-dot ${key} ${goals[key] ? 'met' : ''}" aria-label="${key} ${goals[key] ? 'met' : 'pending'}">${goals[key] ? icon('check') : ''}</i>`).join('')}</div>`; }).join('')}</div><div class="chart-legend"><span><i class="steps"></i>Movement</span><span><i class="sleep"></i>Sleep</span><span><i class="screen"></i>Screen time</span></div></section>`;
}
function friends() {
  const points = improvement(state), peers = [{ name: 'Maya', mark: 'M', color: 'peach', score: 14.2 }, { name: 'Leo', mark: 'L', color: 'lavender', score: 9.6 }, { name: 'Sam', mark: 'S', color: 'yellow', score: 7.8 }];
  if (state.joined) peers.push({ name: 'You', mark: 'Y', color: 'green', score: points, you: true });
  peers.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
  return `<section class="page-view friends-view"><div class="page-title"><div class="eyebrow">GROW TOGETHER</div><h1>Grow together.</h1></div><div class="challenge-art">${icon('trophy')}<span class="art-leaf leaf-left">${icon('leaf')}</span><span class="art-leaf leaf-right">${icon('leaf')}</span></div><p class="center-copy">Small improvements. Shared encouragement.</p><div class="challenge-banner"><div><strong>The balance challenge</strong><span>Last 7 days · Demo friends</span></div><button class="icon-button" data-action="scoring" aria-label="How challenge scoring works">${icon('info')}</button></div><div class="leaderboard">${peers.map((p, i) => `<div class="leader-row ${p.you ? 'you' : ''}"><span class="rank">${i + 1}</span><span class="avatar ${p.color}">${p.mark}</span><strong>${p.name}${p.you ? `<span class="you-label">${p.score === null ? 'Building your history' : 'Your progress'}</span>` : ''}</strong><span class="leader-score">${p.score === null ? '—' : signed(p.score)}<span>pts</span></span></div>`).join('')}</div><button class="primary" data-action="join">${state.joined ? 'Leave challenge' : 'Join the challenge'}${state.joined ? '' : icon('arrow')}</button><p class="challenge-note">${state.joined ? 'You’re in. Every small improvement counts.' : 'Progress against your own goals earns points.'}</p><div class="friends-footnote">${icon('friends')}Demo friends. No invites or data are sent.</div></section>`;
}

function render(keepScroll = false) {
  ensureToday(state); const top = screen.scrollTop;
  header(); navigation(); screen.innerHTML = ({ grove, focus, trends, friends })[tab]();
  if (keepScroll) screen.scrollTop = top; else screen.scrollTop = 0;
}
function go(nextTab) { if (!['grove', 'focus', 'trends', 'friends'].includes(nextTab)) return; tab = nextTab; render(); screen.focus({ preventScroll: true }); }
function openSheet(title, body, wide = false) {
  $('#sheet-content').innerHTML = `<div class="sheet-handle"></div><div class="sheet-heading"><h2 id="sheet-title">${title}</h2><button class="icon-button" data-action="close-sheet" aria-label="Close">${icon('close')}</button></div>${body}`;
  sheet.classList.toggle('wide-sheet', wide); if (!sheet.open) sheet.showModal(); else $('#sheet-content .icon-button').focus();
}
function habitSheet(key) {
  const d = today(), configs = {
    steps: { title: 'Movement', label: 'Steps today', value: d.steps, goal: state.goals.steps, min: 1000, max: 50000, step: 500, unit: 'steps' },
    sleep: { title: 'Sleep', label: 'Sleep last night', value: d.sleep / 60, goal: state.goals.sleep / 60, min: 4, max: 12, step: 0.25, unit: 'hours' },
    screen: { title: 'Screen time', label: 'Counted screen time', value: countedScreen(d, state.excluded), goal: state.goals.screen, min: 15, max: 720, step: 15, unit: 'minutes' }
  }; const c = configs[key];
  openSheet(c.title, `<form id="habit-form" data-key="${key}"><div class="habit-detail-icon ${key}">${icon(key)}</div>${key === 'screen' ? `<div class="sheet-value">${duration(c.value)}</div><p class="sheet-description">${d.closed ? 'Day finished' : 'Today so far'} · productive apps excluded</p><button type="button" class="outline-button" data-action="exclusions">Choose counted apps${icon('arrow')}</button><div class="form-field"><label for="screen-budget">Daily limit <span>minutes</span></label><input id="screen-budget" name="goal" type="number" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.goal}" required></div>` : `<div class="form-field"><label for="habit-value">${c.label}<span>${c.unit}</span></label><input id="habit-value" name="value" type="number" min="0" max="${key === 'sleep' ? 24 : 100000}" step="${key === 'sleep' ? '0.01' : 1}" value="${Number(c.value.toFixed(2))}" required></div><div class="form-field"><label for="habit-goal">Your daily goal<span>${c.unit}</span></label><input id="habit-goal" name="goal" type="number" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.goal}" required></div>`}<p class="field-note">${key === 'screen' ? 'Screen time earns a tree when you finish your day within your limit.' : 'Meet your goal to grow a tree.'}</p><button class="primary" type="submit">Save ${key === 'screen' ? 'limit' : 'progress'}</button>${key === 'steps' ? '<button type="button" class="outline-button" data-action="add-walk">Add 2,000 demo steps</button>' : ''}${key === 'screen' ? `<button type="button" class="outline-button" data-action="finish-day">${d.closed ? 'Reopen today' : 'Finish my day'}</button>` : ''}</form><p class="sheet-footer">Sample data · saved in this browser</p>`);
}
function settingsSheet() {
  openSheet('Make it your own', `<div class="settings-group"><h3>YOUR GOALS</h3>${[['steps', 'Movement', `${number(state.goals.steps)} steps`], ['sleep', 'Sleep', duration(state.goals.sleep)], ['screen', 'Screen time', duration(state.goals.screen)]].map(([key, label, val]) => `<button class="settings-row" data-habit="${key}">${icon(key)}<span>${label}</span><strong>${val}</strong>${icon('arrow')}</button>`).join('')}</div><div class="settings-group"><h3>YOUR EXPERIENCE</h3><button class="settings-row" data-action="exclusions">${icon('screen')}<span>Counted apps</span>${icon('arrow')}</button><button class="settings-row" data-action="choose-tree">${icon('grove')}<span>Your focus tree</span><strong>${state.selectedTree}</strong>${icon('arrow')}</button><label class="toggle-row"><span><strong>Quick demo timer</strong><span>1 second = 1 focus minute</span></span><input id="demo-speed" type="checkbox" ${state.demoSpeed ? 'checked' : ''} ${state.focus && ['running', 'paused'].includes(state.focus.status) ? 'disabled' : ''}><i></i></label></div><div class="settings-group"><h3>ABOUT THIS PROTOTYPE</h3><button class="settings-row" data-action="demo">${icon('plus')}<span>Edit demo day</span>${icon('arrow')}</button><a class="settings-row" href="schematic.html" target="_blank">${icon('info')}<span>Design & screen map</span><span>↗</span></a><button class="settings-row reset-row" data-action="reset">${icon('grove')}<span>Reset demo</span>${icon('arrow')}</button></div><p class="sheet-footer">Sample data only. No device connection or app blocking.</p>`);
}
function exclusionsSheet() {
  openSheet('Make screen time count', `<p class="sheet-description">Only selected apps count toward your limit.</p><div class="apps-list">${APP_LIST.map(a => `<label class="toggle-row app-toggle"><span class="app-mark" style="--app-color:${a.color}">${a.mark}</span><span><strong>${a.name}</strong><span>${duration(today().usage[a.id])} today</span></span><input type="checkbox" data-app="${a.id}" ${state.excluded.includes(a.id) ? '' : 'checked'}><i></i></label>`).join('')}</div><div class="counted-total"><span>Counted today</span><strong id="counted-total">${duration(countedScreen(today(), state.excluded))}</strong></div><button class="primary" data-action="save-exclusions">Done</button><p class="sheet-footer">Demo app usage. Native tracking comes later.</p>`);
}
function demoSheet() {
  const d = today();
  openSheet('Try a day in Grove', `<p class="sheet-description">Change the sample day. Watch your grove grow.</p><form id="demo-form"><div class="form-grid"><div class="form-field"><label for="demo-steps">Steps</label><input id="demo-steps" name="steps" type="number" min="0" max="100000" step="1" value="${d.steps}" required></div><div class="form-field"><label for="demo-sleep">Sleep <span>hours</span></label><input id="demo-sleep" name="sleep" type="number" min="0" max="24" step="0.01" value="${Number((d.sleep / 60).toFixed(2))}" required></div></div><h3 class="form-subtitle">APP USAGE <span>minutes</span></h3><div class="usage-inputs">${APP_LIST.map(a => `<div><label for="usage-${a.id}"><span class="app-mark" style="--app-color:${a.color}">${a.mark}</span>${a.name}</label><input id="usage-${a.id}" name="${a.id}" type="number" min="0" max="1440" step="1" value="${d.usage[a.id]}" aria-label="${a.name} usage in minutes" required></div>`).join('')}</div><label class="toggle-row"><span><strong>Finish today</strong><span>Check your daily screen limit</span></span><input name="closed" type="checkbox" ${d.closed ? 'checked' : ''}><i></i></label><button class="primary" type="submit">Update my grove</button></form><p class="sheet-footer">Stored on this device · no sensors connected</p>`);
}
function collectionSheet() {
  openSheet('Your little world', `<div class="collection-art"><img src="assets/grove.svg" alt="Your forest island"></div><div class="collection-totals"><div><strong>${state.rewards.trees}</strong><span>Trees grown</span></div><div><strong>${state.rewards.visitors}</strong><span>Forest visitors</span></div></div><p class="sheet-description">Focus grows trees. A balanced day welcomes a visitor.</p><div class="reward-rule">${icon('grove')}One tree for each habit goal</div><div class="reward-rule">${icon('focus')}One tree for each focus session</div><div class="reward-rule">${icon('fox')}One visitor for all three goals</div>${state.rewards.log.length ? `<h3 class="form-subtitle">NEW IN YOUR GROVE</h3><div class="reward-log">${state.rewards.log.slice(0, 5).map(r => `<div>${icon(r.kind === 'visitor' ? 'fox' : 'leaf')}<span>${escape(r.label)}</span><span>${r.date === localDate() ? 'Today' : escape(r.date.slice(5))}</span></div>`).join('')}</div>` : ''}<button class="primary" data-tab="focus" data-close>Grow your next tree${icon('leaf')}</button>`);
}
function treeSheet() {
  openSheet('Choose your tree', `<p class="sheet-description">Every tree starts with a little time.</p><div class="tree-options">${[['Oak', 0], ['Pine', 10], ['Blossom', 15]].map(([tree, threshold]) => `<button class="tree-option ${state.selectedTree === tree ? 'selected' : ''}" data-tree="${tree}" ${state.rewards.trees < threshold ? 'disabled' : ''}><span class="tree-glyph ${tree.toLowerCase()}">${icon('grove')}</span><strong>${tree}</strong><span>${state.rewards.trees < threshold ? `${threshold} trees to unlock` : state.selectedTree === tree ? 'Selected' : 'Choose'}</span></button>`).join('')}</div><p class="sheet-footer">Grow more trees to discover new species.</p>`);
}
function scoringSheet() {
  openSheet('Small progress counts', `<div class="scoring-hero">${icon('leaf')}</div><p class="sheet-description">Each habit has equal weight. Progress is measured against your own goals.</p><ol class="scoring-list"><li>Steps and sleep: the share of your goal you reach.</li><li>Screen time: full credit within your limit; less when over.</li><li>Compare your last 7 days with the previous 7.</li></ol><p class="field-note">Each habit stops earning points at 100%. Challenge points show the change in the average, in percentage points.</p><div class="scoring-example"><span>Your demo improvement</span><strong>${improvement(state) === null ? 'Not enough history' : `${signed(improvement(state))} pts`}</strong></div><p class="sheet-footer">A game mechanic, not a health score. Peer scores are samples.</p>`);
}

function startFocus() {
  const seconds = state.focusMinutes * 60;
  const total = state.demoSpeed ? state.focusMinutes : seconds;
  state.focus = { id: crypto.randomUUID(), minutes: state.focusMinutes, tag: state.focusTag, status: 'running', total, remaining: total, endsAt: Date.now() + total * 1000, accelerated: state.demoSpeed };
  save(); render();
}
document.addEventListener('click', e => {
  const el = e.target.closest('button, a[data-tab]'); if (!el) return;
  if (el.dataset.tab) { if (el.hasAttribute('data-close')) sheet.close(); go(el.dataset.tab); return; }
  if (el.dataset.habit) { habitSheet(el.dataset.habit); return; }
  if (el.dataset.trend) { trend = el.dataset.trend; render(true); return; }
  if (el.dataset.tag) { state.focusTag = el.dataset.tag; save(); render(true); return; }
  if (el.dataset.duration) { state.focusMinutes = clamp(state.focusMinutes + Number(el.dataset.duration), 5, 120); save(); render(true); return; }
  if (el.dataset.tree) { state.selectedTree = el.dataset.tree; save(); sheet.close(); render(true); toast(`${state.selectedTree} selected`); return; }
  const actions = {
    settings: settingsSheet, demo: demoSheet, exclusions: exclusionsSheet, collection: collectionSheet,
    'choose-tree': treeSheet, scoring: scoringSheet, 'close-sheet': () => sheet.close(),
    'save-exclusions': () => { updateRewards(); sheet.close(); render(true); },
    'start-focus': startFocus,
    pause: () => { if (!completeFocus(state)) { state.focus.remaining = remainingSeconds(state.focus); state.focus.status = 'paused'; } else toast('You grew a tree. A little time well spent.'); save(); render(true); },
    resume: () => { state.focus.endsAt = Date.now() + state.focus.remaining * 1000; state.focus.status = 'running'; save(); render(true); },
    'cancel-focus': () => openSheet('End this session?', `<p class="sheet-description">This seed won’t become a tree. Your grove will be here when you’re ready.</p><button class="primary" data-action="close-sheet">Keep growing</button><button class="outline-button" data-action="confirm-cancel">End session</button>`),
    'confirm-cancel': () => { state.focus = null; save(); sheet.close(); render(); },
    'new-focus': () => { state.focus = null; save(); render(true); },
    'add-walk': () => { today().steps += 2000; updateRewards(); sheet.close(); render(true); toast('2,000 steps added. Your grove is growing.'); },
    'finish-day': () => { today().closed = !today().closed; updateRewards(); sheet.close(); render(true); },
    join: () => { state.joined = !state.joined; save(); render(true); toast(state.joined ? 'You joined the demo challenge' : 'You left the demo challenge'); },
    reset: () => openSheet('Start fresh?', `<p class="sheet-description">Restore the sample day and the original grove. Your local edits and rewards will reset.</p><button class="primary" data-action="confirm-reset">Reset demo</button><button class="outline-button" data-action="settings">Keep my grove</button>`),
    'confirm-reset': () => { state = initialState(); save(); sheet.close(); go('grove'); toast('A fresh little start'); }
  };
  actions[el.dataset.action]?.();
});
document.addEventListener('input', e => {
  if (e.target.id === 'focus-duration') { state.focusMinutes = Number(e.target.value); $('#countdown').textContent = timerText(state.focusMinutes * 60); save(); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'demo-speed') { state.demoSpeed = e.target.checked; save(); render(true); }
  if (e.target.dataset.app) { const id = e.target.dataset.app; state.excluded = e.target.checked ? state.excluded.filter(a => a !== id) : [...new Set([...state.excluded, id])]; updateRewards(); $('#counted-total').textContent = duration(countedScreen(today(), state.excluded)); render(true); }
});
document.addEventListener('submit', e => {
  if (!['habit-form', 'demo-form'].includes(e.target.id)) return; e.preventDefault();
  const data = new FormData(e.target), d = today();
  if (e.target.id === 'habit-form') {
    const key = e.target.dataset.key, multiplier = key === 'sleep' ? 60 : 1;
    state.goals[key] = Math.round(Number(data.get('goal')) * multiplier);
    if (key !== 'screen') d[key] = Math.round(Number(data.get('value')) * multiplier);
  } else {
    d.steps = Number(data.get('steps')); d.sleep = Math.round(Number(data.get('sleep')) * 60);
    for (const app of APP_LIST) d.usage[app.id] = Number(data.get(app.id));
    d.closed = data.get('closed') === 'on';
  }
  updateRewards(); sheet.close(); render(true);
});
sheet.addEventListener('click', e => { if (e.target === sheet) { const r = sheet.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) sheet.close(); } });
function tick() {
  const date = localDate(); if (!state.days[date]) { ensureToday(state); save(); render(true); }
  if (state.focus?.status === 'running') {
    const left = remainingSeconds(state.focus);
    if (left === 0 && completeFocus(state)) { save(); render(true); toast('You grew a tree. A little time well spent.'); }
    else if (tab === 'focus' && $('#countdown')) {
      const display = state.focus.accelerated ? left * 60 : left;
      $('#countdown').textContent = timerText(display);
      const ring = $('.ring-progress'); if (ring) ring.style.strokeDashoffset = 899 * left / state.focus.total;
    }
  }
}
document.addEventListener('visibilitychange', tick);
setInterval(tick, 250);
if (completeFocus(state)) save();
render();
