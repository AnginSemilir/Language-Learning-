"""Convert Lector's Indonesian dictionary (SQLite, built from Wiktionary via
kaikki.org, CC BY-SA) into the compact JSON the app loads at runtime.

Source: https://github.com/heuwels/lector/releases/download/dict-id-2026-08-21/dictionary-id.db
sha256: d060a38c19560966867e6800aecdcd875c852262c9a8e055a8118d40bb8d05a2

Usage: python3 scripts/build-dictionary-json.py dictionary-id.db public/data/dictionary-id.json

Output shape:
  {"e": {word: [[pos, gloss], ...]},   # up to 4 senses per word
   "i": {inflected: [lemma, type]},     # e.g. "mengecat": ["cat", "active"]
   "v": {word: root},                   # verb forms from the etymology: "menitip": "titip"
   "n": {word: root},                   # derived nouns: "tuduhan": "tuduh"
   "p": [word, ...]}                    # proper nouns (only sense is a name)

Verb forms (meN-, di-, ter-, ber-, per-, -kan, -i) are grouped under their root
by the reader; derived nouns (peN-, pe-, per-…-an, ke-…-an, -an) are kept as
their own words because their meaning differs from the root's.
"""

import json
import re
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

pos_by_word = {}
for word, pos in con.execute("SELECT word, pos FROM senses"):
    pos_by_word.setdefault(word, set()).add(pos or "")

# Wiktionary's form table mixes real verb forms (dibeli → beli) with
# "alternative" and "imperative" rows that are often unrelated or reversed
# (yang → sayang, beli → dibeli). Keep only verb voice and plural forms that
# are longer than their lemma; a form with its own entry must be a verb.
FORM_TYPES = ("active", "passive", "causative", "plural")

inflections = {}
for form, lemma, kind in con.execute(
    "SELECT inflected_form, lemma, type FROM inflections"
):
    kind = kind or ""
    if form == lemma or lemma not in entries or " " in form:
        continue
    if not any(t in kind for t in FORM_TYPES) or len(form) <= len(lemma):
        continue
    if "plural" in kind and not form.startswith(lemma + "-"):
        continue
    if form[:2] in ("di", "me") and lemma[:2] in ("di", "me"):
        continue  # menjual → dijual: another voice of the same verb, not its root
    if "plural" not in kind and form in pos_by_word and "verb" not in pos_by_word[form]:
        continue
    current = inflections.get(form)
    if current is None or len(lemma) < len(current[0]):
        inflections[form] = [lemma, kind]

VERB_PREFIXES = {
    "meng", "me", "mem", "men", "meny", "menge", "ng", "ny",
    "di", "ter", "ber", "be", "bel", "memper", "diper", "per",
}
VERB_SUFFIXES = {"kan", "i"}
NOUN_PREFIXES = {"peng", "pe", "pem", "pen", "peny", "penge", "ke"}
NOUN_SUFFIXES = {"an", "wan", "wati"}

AFFIX = re.compile(r"(?<![\w-])(?:([a-z]+)-|-([a-z]+))(?![\w-])")
WORD = re.compile(r"(?<![\w-])([a-z]+(?:-[a-z]+)*)(?![\w-])")
GLOSS = re.compile(r"\(“[^”]*”\)|“[^”]*”|\([^)]*\)")


def classify(word, etymology):
    """Return ("v"|"n", root) when the etymology shows Indonesian affixation."""
    for sentence in re.split(r"(?<=\.)\s+", etymology):
        if "+" not in sentence:
            continue
        text = GLOSS.sub("", sentence)
        prefixes = {m.group(1) for m in AFFIX.finditer(text) if m.group(1)}
        suffixes = {m.group(2) for m in AFFIX.finditer(text) if m.group(2)}
        if not prefixes and not suffixes:
            return None  # a compound, not affixation
        bare = AFFIX.sub(" ", text)
        roots = [
            w for w in WORD.findall(bare)
            if w != word and w in entries and w not in ("from", "of", "to")
        ]
        if not roots:
            return None
        root = roots[0]
        if prefixes & NOUN_PREFIXES or (suffixes & NOUN_SUFFIXES and not prefixes & {"ber"}):
            return ("n", root)
        if prefixes & VERB_PREFIXES or suffixes & VERB_SUFFIXES:
            return ("v", root)
        return None
    return None


verb_forms = {}
noun_forms = {}
for word, etymology in con.execute(
    "SELECT word, etymology FROM entries WHERE etymology LIKE '%+%'"
):
    if word not in entries or " " in word:
        continue
    result = classify(word, etymology)
    if result:
        kind, root = result
        # Only group words that are actually verbs (berapa "how many" is not).
        if kind == "v" and "verb" not in pos_by_word.get(word, set()):
            continue
        (verb_forms if kind == "v" else noun_forms)[word] = root

proper = sorted(w for w, p in pos_by_word.items() if p == {"name"})

with open(dst, "w", encoding="utf-8") as f:
    json.dump(
        {"e": entries, "i": inflections, "v": verb_forms, "n": noun_forms, "p": proper},
        f,
        ensure_ascii=False,
        separators=(",", ":"),
    )

print(
    f"{len(entries)} entries, {len(inflections)} inflections, "
    f"{len(verb_forms)} verb forms, {len(noun_forms)} derived nouns, "
    f"{len(proper)} proper nouns -> {dst}"
)
