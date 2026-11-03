"""Browser regression check. Optional dev dependency: pip install playwright.

Run against a local server: python3 tests/browser_check.py http://localhost:5175
Uses an isolated headless Chrome profile; no personal browser data is accessed.
"""
import argparse
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('url', nargs='?', default='http://localhost:5175')
parser.add_argument('--chrome', default='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
parser.add_argument('--screenshots', default='/tmp/grove-browser-check')
args = parser.parse_args()
output = Path(args.screenshots)
output.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=args.chrome, headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.clock.install(time=datetime(2026, 11, 2, 12, 0))
    page.goto(args.url, wait_until='networkidle')
    assert page.locator('.habit-status').all_text_contents() == ['25%', '25%', '25%']
    page.screenshot(path=str(output / 'sparse.png'))
    for expected in [['Thriving', '25%', '25%'], ['Thriving', 'Thriving', '25%'], ['Thriving', 'Thriving', 'Thriving']]:
        page.clock.fast_forward(10000)
        assert page.locator('.habit-status').all_text_contents() == expected
    assert page.locator('.ecosystem-totals button').first.inner_text().startswith('12')
    assert page.locator('.habitat-otter').count() == 1
    page.screenshot(path=str(output / 'balanced.png'))
    print('PASS automatic demo sync visibly restores all three habitats and twelve species')

    page.get_by_role('button', name='Wildlife', exact=True).click()
    assert page.locator('.species-card.discovered').count() == 12
    page.screenshot(path=str(output / 'wildlife.png'))
    page.get_by_role('button', name='Water', exact=True).click()
    assert page.locator('.species-card').count() == 4
    page.get_by_role('button', name='Otter, here now').click()
    assert 'All three habitats reach 100%' in page.locator('dialog').inner_text()
    page.get_by_role('button', name='Close', exact=True).click()
    print('PASS wildlife guide, category filter, and species detail')

    page.get_by_role('button', name='Demo sync', exact=True).click()
    page.get_by_role('button', name='My timed sessions', exact=False).click()
    page.get_by_role('button', name='Track', exact=True).click()
    page.get_by_role('button', name='Walk', exact=True).click()
    page.get_by_role('button', name='Start walk', exact=True).click()
    page.clock.fast_forward(60000)
    assert page.locator('[data-session-elapsed]').first.inner_text() == '01:00'
    page.get_by_role('button', name='Pause', exact=True).click()
    page.clock.fast_forward(3600000)
    assert page.locator('[data-session-elapsed]').first.inner_text() == '01:00'
    page.get_by_role('button', name='Keep going', exact=True).click()
    page.clock.fast_forward(60000)
    page.get_by_role('button', name='Finish & save', exact=True).click()
    state = page.evaluate('JSON.parse(localStorage.getItem("grove-local-v1"))')
    tracked = sum(day.get('walkSeconds', 0) for day in state['days'].values())
    assert 120 <= tracked < 123, tracked  # Real click latency is also tracked.
    assert state['tracking']['mode'] == 'sessions'
    assert state['tracking']['demo']['running'] is False
    assert len(state['ecosystem']['discoveredIDs']) == 12
    page.screenshot(path=str(output / 'track.png'))
    page.reload(wait_until='networkidle')
    assert page.get_by_role('button', name='Session tracking', exact=True).count() == 1
    assert page.locator('.habit-values strong').all_text_contents() == ['2m', '0m', '0m']
    assert page.locator('input[name=value]').count() == 0
    print('PASS real session timing, pause/resume, source separation, and reload persistence')

    # Goal changes must never retroactively shorten a running countdown.
    page.get_by_role('button', name='Track', exact=True).click()
    page.get_by_role('button', name='Walk', exact=True).click()
    page.get_by_role('button', name='Start walk', exact=True).click()
    page.clock.fast_forward(120000)
    page.get_by_role('button', name='Settings', exact=True).click()
    page.locator('dialog [data-habit=steps]').click()
    page.locator('#goal').fill('1')
    page.get_by_role('button', name='Save goal', exact=True).click()
    page.clock.fast_forward(1000)
    state = page.evaluate('JSON.parse(localStorage.getItem("grove-local-v1"))')
    assert state['tracking']['session']['targetSeconds'] == 1200
    assert state['tracking']['sessionGoals']['steps'] == 1
    assert page.get_by_role('button', name='Pause', exact=True).count() == 1
    page.get_by_role('button', name='Finish & save', exact=True).click()
    print('PASS an active timer retains its target after a daily goal edit')

    # A background wake-up completes at the original target, not at wake-up time.
    page.get_by_role('button', name='Focus', exact=True).click()
    page.get_by_role('button', name='15m', exact=True).click()
    page.get_by_role('button', name='Start focus', exact=True).click()
    page.clock.fast_forward(20 * 60000)
    state = page.evaluate('JSON.parse(localStorage.getItem("grove-local-v1"))')
    assert state['tracking']['session'] is None
    focus = [session for session in state['tracking']['sessions'] if session['kind'] == 'focus']
    assert len(focus) == 1 and focus[0]['elapsedSeconds'] == 900, focus
    page.reload(wait_until='networkidle')
    assert page.locator('.habit-values strong').nth(2).inner_text() == '15m'
    print('PASS background timer completion is capped at the original target and saved once')

    # Every viewport and primary screen remains inside its horizontal bounds.
    for width, height in [(320, 740), (390, 844), (1440, 1000)]:
        page.set_viewport_size({'width': width, 'height': height})
        for name in ['Grove', 'Track', 'Wildlife', 'Trends']:
            page.get_by_role('button', name=name, exact=True).click()
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), (name, width)
            assert page.locator('h1').count() == 1
        page.screenshot(path=str(output / f'trends-{width}.png'))
    assert not errors, errors
    print('PASS mobile/desktop screen bounds and no JavaScript errors')
    browser.close()
