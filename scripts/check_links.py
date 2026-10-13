"""Check local Markdown targets without touching files or checking web links."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
failures = []
for path in root.rglob('*.md'):
    if any(part in {'.git', '.local', 'node_modules', 'dist', '.next', '.twenty', 'test-results', 'playwright-report'} for part in path.parts):
        continue
    for link in re.findall(r'\]\(([^)]+)\)', path.read_text()):
        target = link.split('#', 1)[0]
        if not target or '://' in target or target.startswith(('mailto:', '/')):
            continue
        if not (path.parent / target).exists():
            failures.append(f'{path.relative_to(root)}: {target}')
if failures:
    print('\n'.join(failures))
    sys.exit(1)
print('Local Markdown targets exist.')
