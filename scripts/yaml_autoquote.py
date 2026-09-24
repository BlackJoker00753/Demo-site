"""Берёт в кавычки YAML-значения, в которых встречается «: » или « #».

Такие строки ломают простой (plain) YAML-скаляр. Скрипт трогает только
строки вида ``key: value`` и ``- value`` без кавычек и скобок.

    uv run python scripts/yaml_autoquote.py content/**/*.yaml
"""

import re
import sys
from pathlib import Path

LINE = re.compile(r"^(?P<indent>\s*(?:- )?[A-Za-z_]\w*: |\s*- )(?P<value>[^\"'\[{|>&*!#\s-].*)$")


def fix(text: str) -> tuple[str, int]:
    out, n = [], 0
    for line in text.splitlines():
        m = LINE.match(line)
        if m and (": " in m.group("value") or " #" in m.group("value")):
            value = m.group("value").replace("\\", "\\\\").replace('"', '\\"')
            line = f'{m.group("indent")}"{value}"'
            n += 1
        out.append(line)
    return "\n".join(out) + "\n", n


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        p = Path(arg)
        new, n = fix(p.read_text(encoding="utf-8"))
        if n:
            p.write_text(new, encoding="utf-8")
            print(f"{p}: quoted {n} value(s)")
