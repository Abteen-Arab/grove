"""Model regression checks. Optional development dependency: pip install quickjs.

Run with: python3 -m unittest discover -s tests -v
The app itself has no Python package or JavaScript runtime dependencies.
"""

import json
from pathlib import Path
import re
import unittest

try:
    import quickjs
except ImportError:
    quickjs = None


@unittest.skipIf(quickjs is None, "Install the optional quickjs development package")
class ModelTests(unittest.TestCase):
    def setUp(self):
        self.js = quickjs.Context()
        self.js.eval("""
            const NativeDate = Date;
            let testNow = new NativeDate(2026, 10, 2, 12, 0, 0).getTime();
            globalThis.Date = class extends NativeDate {
                constructor(...args) { super(...(args.length ? args : [testNow])); }
                static now() { return testNow; }
            };
        """)
        source = (Path(__file__).resolve().parents[1] / "model.js").read_text()
        self.js.eval(re.sub(r"^export ", "", source, flags=re.MULTILINE))
        self.js.eval("""
            function emptyRewards() {
                return { trees: 0, visitors: 0, claims: [], visitorDates: [], focusIds: [], log: [] };
            }
            const state = initialState();
            state.rewards = emptyRewards();
            const day = state.days[localDate()];
            function readyDay(d) {
                d.steps = state.goals.steps;
                d.sleep = state.goals.sleep;
                d.usage = Object.fromEntries(APP_LIST.map(a => [a.id, 0]));
                d.closed = true;
            }
            function session(id = 'session-1', seconds = 5) {
                return { id, minutes: 5, tag: 'Unplug', status: 'running', total: seconds,
                    remaining: seconds, endsAt: Date.now() + seconds * 1000 };
            }
        """)

    def value(self, expression):
        return json.loads(self.js.eval(f"JSON.stringify(({expression}))"))

    def test_counted_apps_arithmetic(self):
        self.assertEqual(self.value("[countedScreen(day, []), countedScreen(day, state.excluded), countedScreen(day, APP_LIST.map(a => a.id))]"), [235, 140, 0])

    def test_attainments_cap_all_habits(self):
        self.js.eval("readyDay(day); day.steps *= 3; day.sleep *= 2;")
        self.assertEqual(self.value("attainments(day, state.goals, state.excluded)"), {"steps": 1, "sleep": 1, "screen": 1})

    def test_screen_goal_requires_finished_day_and_limit(self):
        self.js.eval("readyDay(day); day.closed = false;")
        self.assertFalse(self.value("goalStates(day, state.goals, state.excluded).screen"))
        self.js.eval("day.closed = true;")
        self.assertTrue(self.value("goalStates(day, state.goals, state.excluded).screen"))
        self.js.eval("day.usage.instagram = state.goals.screen + 1;")
        self.assertFalse(self.value("goalStates(day, state.goals, state.excluded).screen"))

    def test_habit_rewards_and_visitor_are_idempotent(self):
        self.js.eval("readyDay(day); awardHabits(state); awardHabits(state);")
        self.assertEqual(self.value("[state.rewards.trees, state.rewards.visitors, state.rewards.claims.length, state.rewards.visitorDates.length]"), [3, 1, 3, 1])
        self.js.eval("day.closed = false; awardHabits(state); day.closed = true; awardHabits(state);")
        self.assertEqual(self.value("[state.rewards.trees, state.rewards.visitors]"), [3, 1])

    def test_habit_rewards_are_independent_per_date(self):
        self.js.eval("""
            readyDay(day); awardHabits(state);
            testNow += 24 * 60 * 60 * 1000;
            ensureToday(state); readyDay(state.days[localDate()]); awardHabits(state);
        """)
        self.assertEqual(self.value("[state.rewards.trees, state.rewards.visitors, state.rewards.claims.length]"), [6, 2, 6])

    def test_screen_reward_waits_until_day_finishes(self):
        self.js.eval("readyDay(day); day.closed = false; awardHabits(state);")
        self.assertEqual(self.value("[state.rewards.trees, state.rewards.visitors]"), [2, 0])
        self.js.eval("day.closed = true; awardHabits(state);")
        self.assertEqual(self.value("[state.rewards.trees, state.rewards.visitors]"), [3, 1])

    def test_unfinished_focus_does_not_award(self):
        self.js.eval("state.focus = session();")
        self.assertFalse(self.value("completeFocus(state)"))
        self.assertEqual(self.value("state.rewards.trees"), 0)

    def test_expired_focus_awards_exactly_once(self):
        self.js.eval("state.focus = session(); testNow += 5001;")
        self.assertTrue(self.value("completeFocus(state)"))
        self.assertFalse(self.value("completeFocus(state)"))
        self.assertEqual(self.value("[state.focus.status, state.rewards.trees, state.rewards.focusIds.length, state.rewards.log.length]"), ["complete", 1, 1, 1])
        self.js.eval("state.focus = session(); state.focus.endsAt = Date.now() - 1;")
        self.assertFalse(self.value("completeFocus(state)"))
        self.assertEqual(self.value("state.rewards.trees"), 1)

    def test_pause_and_resume_remaining_math(self):
        self.js.eval("state.focus = session('pause', 60); testNow += 1250;")
        self.assertEqual(self.value("remainingSeconds(state.focus)"), 59)
        self.js.eval("state.focus.remaining = remainingSeconds(state.focus); state.focus.status = 'paused'; testNow += 100000;")
        self.assertEqual(self.value("remainingSeconds(state.focus)"), 59)
        self.js.eval("state.focus.endsAt = Date.now() + state.focus.remaining * 1000; state.focus.status = 'running'; testNow += 59001;")
        self.assertEqual(self.value("remainingSeconds(state.focus)"), 0)

    def test_saved_state_round_trip_and_missing_today_recovery(self):
        self.js.eval("""
            state.selectedTree = 'Pine'; state.focus = session();
            const saved = JSON.stringify(state);
            const restored = loadState({ getItem: () => saved });
            delete state.days[localDate()];
            const withoutToday = JSON.stringify(state);
            const recovered = loadState({ getItem: () => withoutToday });
        """)
        self.assertEqual(self.value("[restored.selectedTree, restored.focus.id, remainingSeconds(restored.focus)]"), ["Pine", "session-1", 5])
        self.assertEqual(self.value("[recovered.days[localDate()].steps, recovered.days[localDate()].closed, countedScreen(recovered.days[localDate()], recovered.excluded)]"), [0, False, 0])

    def test_invalid_or_unavailable_storage_recovers(self):
        self.assertEqual(self.value("loadState({ getItem: () => '{broken' }).version"), 1)
        self.assertEqual(self.value("loadState({ getItem: () => JSON.stringify({version: 0}) }).goals.steps"), 8000)
        self.assertEqual(self.value("loadState({ getItem: () => { throw new Error('unavailable'); } }).rewards.trees"), 8)

    def test_missing_history_returns_pending_score(self):
        self.js.eval("delete state.days[dateBefore(9)];")
        self.assertIsNone(self.value("improvement(state)"))

    def test_improvement_uses_equal_weight_and_caps_each_habit(self):
        self.js.eval("""
            for (let i = 0; i < 14; i++) {
                const d = state.days[dateBefore(i)]; readyDay(d);
                d.steps = i < 7 ? state.goals.steps * 10 : state.goals.steps / 2;
            }
        """)
        self.assertAlmostEqual(self.value("improvement(state)"), 100 / 6)


if __name__ == "__main__":
    unittest.main()
