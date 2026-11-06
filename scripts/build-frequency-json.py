"""Build the Indonesian word-frequency list the app uses for "known % of the
top 1,000 / 2,000 / 5,000 words".

Source: wordfreq (https://github.com/rspeer/wordfreq), code Apache-2.0, data
CC BY-SA 4.0. Requires `pip install wordfreq` (not an app dependency).

Usage: python3 scripts/build-frequency-json.py public/data/dictionary-id.json public/data/frequency-id.json

Keeps word forms in frequency order that the dictionary knows (directly, as a
di- passive, or with a -nya/-ku/-mu/-lah/-kah/-pun ending), drops names, and
writes the first 9,000. The app groups forms into headwords (dibeli with beli)
the same way the reader does, so the bands count distinct words.
"""

import json
import re
import sys
from importlib.metadata import version

import wordfreq

LIMIT = 9000
CLITICS = ("nya", "ku", "mu", "lah", "kah", "pun")
WORD = re.compile(r"^[a-z]+(-[a-z]+)*$")

dict_path, dst = sys.argv[1], sys.argv[2]
d = json.load(open(dict_path, encoding="utf-8"))
known = set(d["e"]) | set(d["i"]) | set(d["v"]) | set(d["n"])
names = set(d["p"])


def in_dictionary(w):
    if w in known:
        return True
    for c in CLITICS:
        if w.endswith(c) and w[: -len(c)] in known:
            return True
    return w.startswith("di") and w[2:] in d["e"]


words = []
for w in wordfreq.iter_wordlist("id"):
    if len(words) >= LIMIT:
        break
    if WORD.match(w) and w not in names and in_dictionary(w):
        words.append(w)

with open(dst, "w", encoding="utf-8") as f:
    json.dump(
        {
            "source": f"wordfreq {version('wordfreq')} (data CC BY-SA 4.0)",
            "words": words,
        },
        f,
        ensure_ascii=False,
        separators=(",", ":"),
    )
print(f"{len(words)} words -> {dst}")
