"""Exercise the built application at a project subpath in Chromium."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    screenshots = ROOT / "browser-checks"
    screenshots.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        shutil.copytree(ROOT / "dist", Path(temporary) / "example-tool")
        server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=temporary))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch()
                page = browser.new_page(viewport={"width": 1280, "height": 1000})
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(f"http://127.0.0.1:{server.server_port}/example-tool/")
                page.get_by_text('$4.25 difference for this visit').wait_for()
                assert '$7.25' in page.locator('#compare').inner_text()
                page.locator('#results summary').first.click()
                assert page.locator('#results details[open] a').is_visible()
                page.locator('#start').fill('09:00')
                page.locator('#end').fill('15:30')
                page.get_by_role('button',name='Compare this visit').click()
                page.locator('#status').select_option('excluded')
                assert 'Ruled out' in page.locator('#results').inner_text()
                page.locator('#place').select_option('custom')
                page.locator('#coords').fill('90, 0')
                page.get_by_role('button',name='Compare this visit').click()
                assert 'No matching' in page.locator('#results').inner_text()
                page.reload()
                page.get_by_text('$4.25 difference for this visit').wait_for()
                page.screenshot(path=str(screenshots / "desktop.png"), full_page=True)
                page.set_viewport_size({"width": 390, "height": 844})
                assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
                page.screenshot(path=str(screenshots / "mobile.png"), full_page=True)
                assert not errors, errors
                browser.close()
            print("Browser checks passed")
        finally:
            server.shutdown()


if __name__ == "__main__":
    main()
