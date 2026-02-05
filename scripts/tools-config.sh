#!/bin/sh
set -e

CONFIG="$HOME/.codex/config.toml"
BLOCK='[mcp_servers.collab-architecture]
type = "http"
url = "http://127.0.0.1:7337/mcp"
'

if [ ! -f "$CONFIG" ]; then
  mkdir -p "$(dirname "$CONFIG")"
  printf "[mcp_servers]\n\n%s\n" "$BLOCK" > "$CONFIG"
  echo "Created $CONFIG with collab-architecture MCP config."
  exit 0
fi

if ! grep -q "^\[mcp_servers\]" "$CONFIG"; then
  printf "\n[mcp_servers]\n" >> "$CONFIG"
fi

if grep -q "^\[mcp_servers\.collab-architecture\]" "$CONFIG"; then
  printf "collab-architecture MCP config already exists in %s. Overwrite? [y/N] " "$CONFIG"
  read -r answer
  case "$answer" in
    y|Y)
      python3 - <<'PY'
from pathlib import Path
import re
config = Path.home() / '.codex' / 'config.toml'
text = config.read_text()
block = """[mcp_servers.collab-architecture]
type = \"http\"
url = \"http://127.0.0.1:7337/mcp\"
"""
pattern = re.compile(r"(?ms)^\[mcp_servers\.collab-architecture\][\s\S]*?(?=^\[|\Z)")
if pattern.search(text):
    text = pattern.sub(block, text)
else:
    if '[mcp_servers]' not in text:
        text = text + '\n[mcp_servers]\n'
    text = text + '\n' + block
config.write_text(text)
print('Updated', config)
PY
      ;;
    *)
      echo "Skipped; no changes made."
      exit 0
      ;;
  esac
else
  python3 - <<'PY'
from pathlib import Path
config = Path.home() / '.codex' / 'config.toml'
text = config.read_text()
block = """[mcp_servers.collab-architecture]
type = \"http\"
url = \"http://127.0.0.1:7337/mcp\"
"""
if '[mcp_servers]' not in text:
    text = text + '\n[mcp_servers]\n'
text = text + '\n' + block
config.write_text(text)
print('Updated', config)
PY
fi
