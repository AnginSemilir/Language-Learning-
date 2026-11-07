"""Build the Indonesian word-frequency list the app uses for "known % of the
top 1,000 / 2,000 / 5,000 / 10,000 words".

Source: wordfreq (https://github.com/rspeer/wordfreq), code Apache-2.0, data
CC BY-SA 4.0. Requires `pip install wordfreq` (not an app dependency).

Usage:
  python3 scripts/build-frequency-json.py public/data/dictionary-id.json \\
    public/data/frequency-id.json ind_news_2023_1M-words.txt ind_wikipedia_2021_1M-words.txt

(the word lists are in the Leipzig corpora's tarballs, see
scripts/build-dictionary-extra.py).

Keeps word forms in frequency order that the dictionary knows (directly, as a
di- passive, with a -nya/-ku/-mu/-lah/-kah/-pun ending, or among the words
build-dictionary-extra.py added), drops names, and leaves out what clearly
isn't Indonesian:
  - single letters, and abbreviations of up to three letters (rp, yg, km);
  - words far more common in English or another European language than in
    Indonesian ("to", "we", "but", "los") that are also rare in Indonesian
    news and Wikipedia, or that the dictionary only knows as a letter's name
    or an initialism. wordfreq's Indonesian counts include subtitles and
    social media, where English is common; these words get into the list
    through look-alike entries (Wiktionary's "we" is the letter W, its "had"
    means "limit").
Writes enough forms for 10,000 headwords: the app groups forms into
headwords (dibeli with beli) the same way the reader does, so the bands
count distinct words.
"""

import collections
import json
import re
import sys
from importlib.metadata import version

import wordfreq

LIMIT = 14500
CLITICS = ("nya", "ku", "mu", "lah", "kah", "pun")
WORD = re.compile(r"^[a-z]+(-[a-z]+)*$")
OTHER_LANGUAGES = ("en", "nl", "es", "fr", "de", "pt", "it")
# In news and Wikipedia at under a tenth of the rate wordfreq gives it.
RARE_IN_NEWS = 0.1
NOT_A_WORD = re.compile(
    r"^(initialism|abbreviation|acronym|syllabic abbreviation) of|"
    r"name of the latin script letter",
    re.I,
)

dict_path, dst, *word_lists = sys.argv[1:]
d = json.load(open(dict_path, encoding="utf-8"))
extra = d.get("x", {})
known = set(d["e"]) | set(d["i"]) | set(d["v"]) | set(d["n"]) | set(extra)
names = set(d["p"])

lower, total = collections.Counter(), 0
for path in word_lists:
    for line in open(path, encoding="utf-8"):
        parts = line.rstrip("\n").split("\t")
        if len(parts) != 3:
            continue
        word, count = parts[1], int(parts[2])
        total += count
        if word.islower():
            lower[word] += count


def in_dictionary(w):
    if w in known:
        return True
    for c in CLITICS:
        if w.endswith(c) and w[: -len(c)] in known:
            return True
    return w.startswith("di") and w[2:] in d["e"]


# Indonesian words that look foreign by these tests: the article "si" (only
# initialisms in Wiktionary), and spoken "lo" (you) and "yo" (come on).
INDONESIAN = {"si", "lo", "yo"}


def senses_of(w):
    """Glosses, with symbols ("rp": rupiah) marked as not words."""
    own = [("initialism of " if p == "symbol" else "") + g for p, g in d["e"].get(w, [])]
    return own or [g for _, g, _ in extra.get(w, [])]


def foreign(w):
    """Clearly not Indonesian (see the module docstring)."""
    if w in INDONESIAN:
        return False
    if len(w) == 1:
        return True
    # Short abbreviations and chat shorthand (rp, km, yg, dgn), not words to
    # learn. Longer ones that are words (narkoba, pemilu) stay.
    glosses = senses_of(w)
    if len(w) <= 3 and glosses and all(NOT_A_WORD.search(g) for g in glosses):
        return True
    indonesian = wordfreq.zipf_frequency(w, "id")
    if max(wordfreq.zipf_frequency(w, l) for l in OTHER_LANGUAGES) < indonesian + 1:
        return False
    in_news = lower[w] / total / wordfreq.word_frequency(w, "id") if total else 1
    glosses = senses_of(w)
    only_letters = bool(glosses) and all(NOT_A_WORD.search(g) for g in glosses)
    return in_news < RARE_IN_NEWS or only_letters


words, dropped = [], []
for w in wordfreq.iter_wordlist("id"):
    if len(words) >= LIMIT:
        break
    if not WORD.match(w) or w in names or not in_dictionary(w):
        continue
    if foreign(w):
        dropped.append(w)
        continue
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
print(f"{len(words)} words -> {dst}; left out {len(dropped)}: {' '.join(dropped)}")
