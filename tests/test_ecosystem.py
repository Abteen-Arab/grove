"""Behavior checks for biodiversity, automatic demo sync, and elapsed sessions."""

import json
from pathlib import Path
import re
import unittest

try:
    import quickjs
except ImportError:
    quickjs = None


@unittest.skipIf(quickjs is None, "Install the optional quickjs development package")
class EcosystemTests(unittest.TestCase):
    def setUp(self):
        self.js = quickjs.Context()
        self.js.eval("""
            const NativeDate = Date;
            let testNow = new NativeDate(2026, 10, 2, 12).getTime();
            globalThis.Date = class extends NativeDate {
                constructor(...args) { super(...(args.length ? args : [testNow])); }
                static now() { return testNow; }
            };
        """)
        source = (Path(__file__).resolve().parents[1] / "model.js").read_text()
        self.js.eval(re.sub(r"^export ", "", source, flags=re.MULTILINE))
        self.js.eval("""
            const state = initialState();
            function demoProgress(steps, sleep, screen, closed = true) {
                const day = state.days[localDate()];
                day.steps = state.goals.steps * steps;
                day.sleep = state.goals.sleep * sleep;
                day.usage = Object.fromEntries(APP_LIST.map(a => [a.id, 0]));
                day.usage.instagram = screen > 0 ? state.goals.screen / screen : 1e9;
                day.closed = closed;
            }
        """)

    def value(self, expression):
        return json.loads(self.js.eval(f"JSON.stringify(({expression}))"))

    def test_biodiversity_uses_weakest_habit_and_caps_progress(self):
        self.js.eval("demoProgress(8, .5, .25);")
        habitat = self.value("habitatState(state)")
        self.assertEqual(habitat["progress"], {"steps": 1, "sleep": .5, "screen": .25})
        self.assertEqual(habitat["growth"], {"woodland": 1, "meadow": .5, "pond": .25})
        self.assertEqual(habitat["score"], 25)
        self.assertFalse(habitat["balanced"])
        self.assertNotIn("fish", habitat["species"])
        self.assertNotIn("otter", habitat["species"])

    def test_each_habitat_responds_to_its_metric(self):
        self.js.eval("demoProgress(1, 0, .1);")
        self.assertEqual(self.value("habitatState(state).species"), ["oak"])
        self.js.eval("demoProgress(0, 1, .1);")
        self.assertEqual(self.value("habitatState(state).species"), ["flowers"])
        self.js.eval("demoProgress(0, 0, 1);")
        self.assertEqual(self.value("habitatState(state).species"), ["fish"])

    def test_balanced_day_unlocks_all_species_but_open_day_waits_for_otter(self):
        self.js.eval("demoProgress(1, 1, 1, false);")
        self.assertFalse(self.value("habitatState(state).balanced"))
        self.assertNotIn("otter", self.value("habitatState(state).species"))
        self.js.eval("state.days[localDate()].closed = true;")
        self.assertEqual(len(self.value("habitatState(state).species")), 12)
        self.assertTrue(self.value("habitatState(state).balanced"))
        self.assertIsNone(self.value("habitatState(state).next.id"))

    def test_collection_is_idempotent_and_retains_past_discoveries(self):
        self.js.eval("demoProgress(1, 1, 1); const first = reconcileEcosystem(state); const second = reconcileEcosystem(state); demoProgress(0, 0, .1); reconcileEcosystem(state);")
        self.assertEqual(self.value("[first.length, second.length, state.ecosystem.discoveredIDs.length]"), [12, 0, 12])
        self.assertEqual(self.value("habitatState(state).species"), [])

    def test_demo_sync_catches_up_by_timestamp_and_finishes_once(self):
        self.js.eval("startDemoSync(state, testNow); const start = testNow;")
        self.assertEqual(self.value("trackedMetrics(state).progress"), {"steps": .25, "sleep": .25, "screen": .25})
        self.assertFalse(self.value("syncDemo(state, start + 9999)"))
        self.assertTrue(self.value("syncDemo(state, start + 10000)"))
        self.assertEqual(self.value("trackedMetrics(state).progress"), {"steps": 1, "sleep": .25, "screen": .25})
        self.assertFalse(self.value("syncDemo(state, start + 10001)"))
        self.assertTrue(self.value("syncDemo(state, start + 35000)"))
        self.assertEqual(self.value("[state.tracking.demo.phase, state.tracking.demo.running, habitatState(state).balanced]"), [3, False, True])
        self.assertFalse(self.value("syncDemo(state, start + 40000)"))

    def test_demo_can_replay_and_stop_without_creating_real_session_time(self):
        self.js.eval("startDemoSync(state); syncDemo(state, testNow + 30000); startDemoSync(state, testNow + 50000); stopDemoSync(state);")
        self.assertEqual(self.value("[state.tracking.demo.phase, state.tracking.demo.running]"), [0, False])
        self.assertEqual(self.value("state.days[localDate()].walkSeconds"), 0)
        self.assertFalse(self.value("syncDemo(state, testNow + 100000)"))

    def test_sessions_use_real_elapsed_minutes_and_do_not_inherit_demo_values(self):
        self.js.eval("startDemoSync(state); syncDemo(state, testNow + 30000); beginSession(state, 'walk');")
        self.assertEqual(self.value("trackedMetrics(state).values"), {"steps": 0, "sleep": 0, "screen": 0})
        self.js.eval("testNow += 60000;")
        self.assertEqual(self.value("trackedMetrics(state).values"), {"steps": 1, "sleep": 0, "screen": 0})
        self.assertEqual(self.value("trackedMetrics(state).units"), {"steps": "minutes", "sleep": "minutes", "screen": "minutes"})
        self.assertEqual(self.value("state.days[localDate()].walkSeconds"), 0)
        self.js.eval("finishSession(state);")
        self.assertEqual(self.value("state.days[localDate()].walkSeconds"), 60)
        self.assertFalse(self.value("finishSession(state)"))
        self.assertEqual(self.value("state.tracking.sessions.length"), 1)

    def test_pause_resume_excludes_idle_time_and_preserves_live_value(self):
        self.js.eval("beginSession(state, 'focus'); testNow += 60000; pauseSession(state); testNow += 600000;")
        self.assertEqual(self.value("trackedMetrics(state).values.screen"), 1)
        self.assertFalse(self.value("pauseSession(state)"))
        self.js.eval("resumeSession(state); testNow += 30000;")
        self.assertEqual(self.value("trackedMetrics(state).values.screen"), 1.5)
        self.js.eval("finishSession(state);")
        self.assertEqual(self.value("state.tracking.sessions[0].elapsedSeconds"), 90)
        self.assertEqual(self.value("state.days[localDate()].focusSeconds"), 90)

    def test_elapsed_session_splits_at_local_midnight(self):
        self.js.eval("testNow = new Date(2026, 10, 2, 23, 59, 30).getTime(); const previousDate = localDate(); beginSession(state, 'rest'); testNow += 90000;")
        self.assertEqual(self.value("trackedMetrics(state).values.sleep"), 1)
        self.js.eval("finishSession(state);")
        self.assertEqual(self.value("[state.days[previousDate].restSeconds, state.days[localDate()].restSeconds]"), [30, 60])

    def test_session_and_day_caps_prevent_unbounded_credit(self):
        self.js.eval("beginSession(state, 'rest'); const active = state.tracking.session; testNow += 3 * 86400000;")
        self.assertEqual(self.value("sessionElapsed(active)"), 86400)
        self.js.eval("finishSession(state); const total = Object.values(state.days).reduce((sum, day) => sum + (day.restSeconds || 0), 0);")
        self.assertEqual(self.value("total"), 86400)
        self.js.eval("ensureToday(state); state.days[localDate()].walkSeconds = 86390; beginSession(state, 'focus'); testNow += 60000; finishSession(state);")
        self.assertEqual(self.value("state.days[localDate()].focusSeconds"), 10)

    def test_session_goals_are_editable_without_changing_sensor_defaults(self):
        self.js.eval("beginSession(state, 'focus'); state.tracking.sessionGoals.screen = 2; testNow += 60000;")
        self.assertEqual(self.value("trackedMetrics(state).progress.screen"), .5)
        self.assertEqual(self.value("state.goals.screen"), 180)

    def test_switching_to_demo_pauses_real_session_and_keeps_its_time(self):
        self.js.eval("beginSession(state, 'walk'); testNow += 60000; startDemoSync(state); syncDemo(state, testNow + 30000);")
        self.assertEqual(self.value("[state.tracking.mode, state.tracking.session.status, state.days[localDate()].walkSeconds]"), ["demo", "paused", 60])
        self.js.eval("testNow += 600000; resumeSession(state);")
        self.assertEqual(self.value("trackedMetrics(state).values.steps"), 1)

    def test_v1_storage_migrates_without_losing_saved_progress(self):
        self.js.eval("""
            state.version = 1; state.selectedTree = 'Pine';
            delete state.tracking; delete state.ecosystem;
            const oldSaved = JSON.stringify(state);
            const restored = loadState({ getItem: () => oldSaved });
        """)
        self.assertEqual(self.value("[restored.version, restored.selectedTree, restored.rewards.trees, restored.days[localDate()].steps]"), [2, "Pine", 8, 6240])
        self.assertEqual(self.value("restored.tracking.mode"), "demo")
        self.assertEqual(self.value("restored.days[localDate()].walkSeconds"), 0)

    def test_saved_running_session_recovers_elapsed_without_duplicate_credit(self):
        self.js.eval("beginSession(state, 'walk'); testNow += 60000; const saved = JSON.stringify(state); const restored = loadState({ getItem: () => saved });")
        self.assertEqual(self.value("trackedMetrics(restored).values.steps"), 1)
        self.js.eval("finishSession(restored); finishSession(restored);")
        self.assertEqual(self.value("[restored.days[localDate()].walkSeconds, restored.tracking.sessions.length]"), [60, 1])

    def test_three_real_session_types_unlock_rare_species_without_demo_records(self):
        self.js.eval("""
            state.tracking.sessionGoals = { steps: .1, sleep: .1, screen: .1 };
            for (const kind of ['walk', 'rest', 'focus']) {
                beginSession(state, kind); testNow += 6000; finishSession(state);
            }
        """)
        self.assertEqual(self.value("trackedMetrics(state).values"), {"steps": .1, "sleep": .1, "screen": .1})
        self.assertTrue(self.value("habitatState(state).balanced"))
        self.assertEqual(len(self.value("habitatState(state).species")), 12)
        self.assertEqual(self.value("state.tracking.sessions.length"), 3)

    def test_active_session_target_stays_fixed_when_daily_goal_changes(self):
        self.js.eval("beginSession(state, 'walk'); state.tracking.sessionGoals.steps = 1; testNow += 120000;")
        self.assertEqual(self.value("state.tracking.session.targetSeconds"), 1200)
        self.assertEqual(self.value("sessionElapsed(state.tracking.session)"), 120)
        self.assertEqual(self.value("trackedMetrics(state).goals.steps"), 1)
        self.js.eval("pauseSession(state); state.tracking.sessionGoals.steps = 30; resumeSession(state);")
        self.assertEqual(self.value("state.tracking.session.targetSeconds"), 1200)

    def test_existing_v2_active_session_gets_target_on_load_and_preserves_it(self):
        self.js.eval("""
            beginSession(state, 'rest'); delete state.tracking.session.targetSeconds;
            state.tracking.sessionGoals.sleep = 10;
            const oldV2 = JSON.stringify(state);
            const restored = loadState({ getItem: () => oldV2 });
            restored.tracking.sessionGoals.sleep = 20;
            const withTarget = JSON.stringify(restored);
            const restoredAgain = loadState({ getItem: () => withTarget });
        """)
        self.assertEqual(self.value("[restored.tracking.session.targetSeconds, restoredAgain.tracking.session.targetSeconds]"), [600, 600])

    def test_live_previous_day_projection_is_pure_and_matches_finished_totals(self):
        self.js.eval("""
            testNow = new Date(2026, 10, 2, 23, 30).getTime();
            const previousDate = localDate(); beginSession(state, 'rest');
            testNow += 90 * 60000; const snapshot = JSON.stringify(state);
            const beforePrevious = sessionMinutesForDate(state, previousDate);
            const beforeToday = sessionMinutesForDate(state, localDate());
            const projectionWasPure = JSON.stringify(state) === snapshot;
            finishSession(state);
        """)
        self.assertEqual(self.value("beforePrevious"), {"steps": 0, "sleep": 30, "screen": 0})
        self.assertEqual(self.value("beforeToday"), {"steps": 0, "sleep": 60, "screen": 0})
        self.assertTrue(self.value("projectionWasPure"))
        self.assertEqual(self.value("sessionMinutesForDate(state, previousDate)"), self.value("beforePrevious"))
        self.assertEqual(self.value("sessionMinutesForDate(state, localDate())"), self.value("beforeToday"))


if __name__ == "__main__":
    unittest.main()
