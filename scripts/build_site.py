#!/usr/bin/env python3
"""Validate Grove's relative links and stage only its public files for Pages."""

from html.parser import HTMLParser
from pathlib import Path
import re
import shutil
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = ("index.html", "schematic.html", "style.css", "app.js", "model.js")
REQUIRED_ASSETS = ("icon.svg", "grove.svg", "sapling.svg", "pine.svg", "blossom.svg")


class HTMLReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in {"src", "href"} and value:
                self.references.append(value)


def check_reference(reference, source, root, public_paths):
    """A local URL must work beneath a GitHub project subdirectory."""
    if "${" in reference:
        # The tree image is selected dynamically; REQUIRED_ASSETS covers it.
        return
    url = urlsplit(reference)
    if url.scheme or url.netloc or not url.path:
        return  # External links, inline data, or a same-page fragment.
    path = unquote(url.path)
    if path.startswith("/") or "\\" in path:
        raise ValueError(f"{source}: use a relative URL, not {reference!r}")
    destination = source.parent / path
    if path.endswith("/") or destination.is_dir():
        destination = destination / "index.html"
    destination = destination.resolve()
    if not destination.is_relative_to(root) or destination not in public_paths:
        raise ValueError(f"{source}: reference is not in the public build: {reference!r}")


def build(root=ROOT):
    root = root.resolve()
    assets = root / "assets"
    if assets.is_symlink():
        raise ValueError("The public assets directory must not be a symlink")
    sources = [root / name for name in PUBLIC_FILES]
    sources.extend(sorted(assets.glob("*.svg")))
    for name in REQUIRED_ASSETS:
        if assets / name not in sources:
            raise ValueError(f"Missing required asset: assets/{name}")
    for source in sources:
        if source.is_symlink() or not source.is_file():
            raise ValueError(f"Missing or symlinked public file: {source}")
    public_paths = {source.resolve() for source in sources}

    for source in sources:
        if source.suffix == ".html":
            parser = HTMLReferences()
            parser.feed(source.read_text(encoding="utf-8"))
            references = parser.references
        elif source.suffix == ".js":
            text = source.read_text(encoding="utf-8")
            references = [m[1] for m in re.findall(r'\b(?:src|href)\s*=\s*([\'"])(.*?)\1', text)]
            references += [m[1] for m in re.findall(r'\bfrom\s*([\'"])(.*?)\1', text)]
        elif source.suffix == ".css":
            references = re.findall(r'url\(\s*[\'"]?([^\s\)\'"]+)[\'"]?\s*\)', source.read_text(encoding="utf-8"))
        else:
            references = []
        for reference in references:
            check_reference(reference, source, root, public_paths)

    # Validate all sources before touching the previous build. This is the only
    # directory the script removes, and it must be an actual child of root.
    output = root / "_site"
    if output.is_symlink() or (output.exists() and not output.is_dir()):
        raise ValueError("Refusing to replace _site because it is not a regular directory")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir()
    for source in sources:
        destination = output / source.relative_to(root)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
    (output / ".nojekyll").touch()
    print(f"Staged {len(sources) + 1} public files in {output}")
    return output


if __name__ == "__main__":
    build()
