"""Convert Lector's Indonesian dictionary (SQLite, built from Wiktionary via
kaikki.org, CC BY-SA) into the compact JSON the app loads at runtime.

Source: https://github.com/heuwels/lector/releases/download/dict-id-2026-08-21/dictionary-id.db
sha256: d060a38c19560966867e6800aecdcd875c852262c9a8e055a8118d40bb8d05a2

Usage: python3 scripts/build-dictionary-json.py dictionary-id.db public/data/dictionary-id.json

Output shape:
  {"e": {word: [[pos, gloss], ...]},   # up to 4 senses per word
   "i": {inflected: [lemma, type]}}     # e.g. "mengecat": ["cat", "active"]
"""

import json
import sqlite3
import sys

MAX_SENSES = 4
MAX_GLOSS = 160

src, dst = sys.argv[1], sys.argv[2]
con = sqlite3.connect(src)

entries = {}
for word, pos, gloss in con.execute(
    "SELECT word, pos, gloss FROM senses ORDER BY word, sort_order"
):
    senses = entries.setdefault(word, [])
    if len(senses) < MAX_SENSES and gloss:
        g = gloss if len(gloss) <= MAX_GLOSS else gloss[: MAX_GLOSS - 1] + "…"
        senses.append([pos or "", g])

inflections = {}
for form, lemma, kind in con.execute(
    "SELECT inflected_form, lemma, type FROM inflections"
):
    if form != lemma and lemma in entries and form not in entries:
        inflections.setdefault(form, [lemma, kind or ""])

with open(dst, "w", encoding="utf-8") as f:
    json.dump({"e": entries, "i": inflections}, f, ensure_ascii=False, separators=(",", ":"))

print(f"{len(entries)} entries, {len(inflections)} inflections -> {dst}")
