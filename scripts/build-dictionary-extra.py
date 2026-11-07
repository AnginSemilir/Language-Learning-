"""Add meanings for words the Indonesian Wiktionary data lacks to
public/data/dictionary-id.json, as a separate "x" map that only the word
lookup uses (the lemmatizer, known words and sentence pool keep using "e").

English Wiktionary files many words Indonesian shares with Malay (cemburu,
entah, begini) under Malay only, and has no entry for many derived words
(pertunjukan, menyedihkan, membiarkan). Two open sources fill in:

  1. Wiktionary's Malay entries (kaikki.org, CC BY-SA), source "m".
  2. Wordnet Bahasa (Francis Bond et al., MIT), Indonesian words linked to
     English WordNet 3.0 meanings (WordNet licence), source "w". It was
     built partly automatically, so the app marks these as approximate.
     Meanings are ranked by how often the English words are used, and kept
     to the parts of speech the word's affixes allow (pe-...-an is a noun,
     meN- a verb or adjective).

  3. A short list of everyday spoken words (sih, kagak, gitu), source "s".

Only words that occur in Indonesian text (the Leipzig news and Wikipedia
word lists) are added, so Malaysia-only words and stray Wordnet lemmas stay
out.

Inputs (download commands):
  curl -O https://kaikki.org/dictionary/Indonesian/kaikki.org-dictionary-Indonesian.jsonl
  curl -O https://kaikki.org/dictionary/Malay/kaikki.org-dictionary-Malay.jsonl
  curl -O https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/omw-1.4.zip
  curl -O https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip
  unzip omw-1.4.zip; unzip wordnet.zip
  The -words.txt lists in ind_news_2023_1M.tar.gz and ind_wikipedia_2021_1M.tar.gz
  from https://wortschatz.uni-leipzig.de/en/download/Indonesian

Usage:
  python3 scripts/build-dictionary-extra.py kaikki.org-dictionary-Indonesian.jsonl \\
    kaikki.org-dictionary-Malay.jsonl \\
    omw-1.4/msa/wn-data-ind.tab wordnet/ ind_news_2023_1M-words.txt \\
    ind_wikipedia_2021_1M-words.txt [public/data/dictionary-id.json]
"""

import collections
import json
import re
import sys

MAX_SENSES = 4
MAX_GLOSS = 160
WORDNET_SENSES = 2
ENGLISH_WORDS = 3
MIN_USES = 3

indonesian_path, malay_path, wn_path, pwn_dir, *rest = sys.argv[1:]
freq_paths = [p for p in rest if p.endswith(".txt")]
dict_path = next(
    (p for p in rest if p.endswith(".json")), "public/data/dictionary-id.json"
)

data = json.load(open(dict_path, encoding="utf8"))
known = set(data["e"]) | set(data["p"])
WORD = re.compile(r"^[a-z]+(?:-[a-z]+)*$")

uses = collections.Counter()  # in lower case
capitalised = collections.Counter()
for path in freq_paths:
    for line in open(path, encoding="utf8"):
        parts = line.rstrip("\n").split("\t")
        if len(parts) != 3:
            continue
        if WORD.match(parts[1]):
            uses[parts[1]] += int(parts[2])
        elif WORD.match(parts[1].lower()):
            capitalised[parts[1].lower()] += int(parts[2])


def wanted(word):
    # Two-letter words from these sources are mostly notes, letters and
    # foreign words ("re", "pi", "ek").
    return (
        WORD.match(word)
        and len(word) >= 3
        and word not in known
        and uses[word] >= MIN_USES
    )


def short(gloss):
    return gloss if len(gloss) <= MAX_GLOSS else gloss[: MAX_GLOSS - 1] + "…"


extra = {}

# 0. Entries whose first senses crowd out the real meaning: Lector's data
#    keeps four senses in Wiktionary's order, so "api" shows four initialisms
#    and not "fire". Put the word's own senses first (from the current
#    Indonesian extract), then fill up with the rest.
NOT_A_MEANING = re.compile(
    r"^(initialism|abbreviation|acronym|syllabic abbreviation) of|"
    r"name of the latin script letter",
    re.I,
)
own = collections.defaultdict(list)
for line in open(indonesian_path, encoding="utf8"):
    entry = json.loads(line)
    if entry.get("pos") == "name":
        continue
    for sense in entry.get("senses", []):
        gloss = (sense.get("glosses") or [""])[0]
        if gloss and not NOT_A_MEANING.search(gloss) and not sense.get("form_of"):
            own[entry["word"]].append([entry.get("pos", ""), short(gloss)])
reordered = []
for word, senses in data["e"].items():
    first_pos, first_gloss = senses[0]
    # A name or an initialism first is right for Bandung or Jabar (West
    # Java), not for antara ("among", also the news agency ANTARA) or api
    # ("fire"): only when the word is mostly written in lower case.
    crowded = first_pos in ("name", "symbol") or NOT_A_MEANING.search(first_gloss)
    if crowded and own.get(word) and uses[word] > capitalised[word]:
        shown = {g for _, g in senses}
        real = [s for s in own[word] if s[1] not in shown][:2]
        if real:
            data["e"][word] = (real + senses)[:MAX_SENSES]
            reordered.append(word)

# 1. Wiktionary's Malay entries.
for line in open(malay_path, encoding="utf8"):
    entry = json.loads(line)
    word = entry.get("word", "")
    if not wanted(word):
        continue
    senses = extra.setdefault(word, [])
    for sense in entry.get("senses", []):
        glosses = sense.get("glosses")
        if not glosses or len(senses) >= MAX_SENSES:
            continue
        if any(t in sense.get("tags", []) for t in ("Malaysia", "Brunei", "Singapore")):
            continue
        if entry.get("pos") == "name":
            continue
        senses.append([entry.get("pos", ""), short(glosses[-1]), "m"])
    if not senses:
        del extra[word]
malay_count = len(extra)

# 2. Wordnet Bahasa, with English WordNet 3.0.
POS = {"n": "noun", "v": "verb", "a": "adj", "r": "adv"}
lemmas = {}  # synset -> English lemmas
for name in ("noun", "verb", "adj", "adv"):
    for line in open(f"{pwn_dir}/data.{name}", encoding="latin-1"):
        if line.startswith("  "):
            continue
        parts = line.split("|")[0].split()
        kind = "a" if parts[2] in "as" else parts[2]
        count = int(parts[3], 16)
        names = [parts[4 + 2 * i].replace("_", " ") for i in range(count)]
        # Places and people (London, Einstein): names, not words.
        if all(n[:1].isupper() for n in names):
            continue
        lemmas[f"{parts[0]}-{kind}"] = [n.lower() for n in names]
# How often each English word is used in each meaning (SemCor counts).
used = collections.Counter()
for line in open(f"{pwn_dir}/index.sense", encoding="latin-1"):
    key, offset, _, count = line.split()
    lemma, rest_ = key.split("%")
    kind = {"1": "n", "2": "v", "3": "a", "4": "r", "5": "a"}[rest_[0]]
    used[(f"{offset}-{kind}", lemma.replace("_", " "))] += int(count)

synsets = collections.defaultdict(list)
for line in open(wn_path, encoding="utf8"):
    if line.startswith("#"):
        continue
    sid, kind, *value = line.rstrip("\n").split("\t")
    if kind == "ind:lemma":
        synsets[value[-1].strip().lower()].append(sid)


def allowed(word):
    """Parts of speech a word's affixes allow."""
    if re.match(r"^(pe|per|pem|pen|peng|peny|ke)\w+an$", word):
        return {"n"}
    if re.match(r"^(me|mem|men|meng|meny|memper|di|diper)\w{3,}", word):
        return {"v", "a"}
    if word.startswith("ber"):
        return {"v", "a"}
    return set(POS)


# Roots a derived word may come from (menyakiti → sakit), by its affixes.
PREFIXES = ["memper", "diper", "meng", "meny", "men", "mem", "me", "di", "ber",
            "ter", "per", "peng", "peny", "pen", "pem", "pe", "ke", "se"]
SUFFIXES = ["kan", "an", "i", "nya", ""]
# meN- and peN- drop a root's first sound: menulis → tulis, memukul → pukul.
RESTORE = {"meny": "s", "peny": "s", "men": "t", "pen": "t", "mem": "p",
           "pem": "p", "meng": "k", "peng": "k"}
STOP = set("the and for with from that this which used form something someone".split())


def roots(word):
    found = set()
    for prefix in PREFIXES + [""]:
        if not word.startswith(prefix):
            continue
        stem = word[len(prefix):]
        for suffix in SUFFIXES:
            if suffix and not stem.endswith(suffix):
                continue
            core = stem[: len(stem) - len(suffix)] if suffix else stem
            for root in (core, RESTORE.get(prefix, "") + core):
                if len(root) >= 3 and root != word and root in data["e"]:
                    found.add(root)
    return found


def root_words(word):
    """English words in the glosses of the word's roots."""
    out = set()
    for root in roots(word):
        for _, gloss in data["e"][root]:
            out.update(w for w in re.findall(r"[a-z]+", gloss.lower()) if len(w) > 2)
    return out - STOP


def english(sid):
    """A meaning's English words, most used first; rare ones left out."""
    ranked = sorted(lemmas[sid], key=lambda w: -used[(sid, w)])
    common = [w for w in ranked if used[(sid, w)] > 0]
    return (common or ranked[:1])[:ENGLISH_WORDS]


for word, ids in synsets.items():
    if word in extra or not wanted(word):
        continue
    ok = allowed(word)
    hints = root_words(word)
    # Meanings sharing a word with the root's meaning first, then by use.
    ranked = sorted(
        (s for s in ids if s in lemmas and s[-1] in ok),
        key=lambda s: (
            -bool(hints & {w for l in lemmas[s] for w in l.split()}),
            -sum(used[(s, w)] for w in lemmas[s]),
        ),
    )
    senses, shown = [], set()
    for sid in ranked:
        words = english(sid)
        # A meaning whose words were all shown already adds nothing.
        if set(words) <= shown:
            continue
        shown.update(words)
        senses.append([POS[sid[-1]], ", ".join(words), "w"])
        if len(senses) == WORDNET_SENSES:
            break
    if senses:
        extra[word] = senses

# 3. Everyday spoken words that neither source has (or has only as something
#    else: "nih" is an initialism in Wiktionary). Glosses written for Kartu.
SPOKEN = {
    "sih": ("particle", "softens a question or statement: anyway, actually (Kenapa sih? Why, then?)"),
    "kagak": ("adv", "no, not (Jakarta, for tidak)"),
    "gitu": ("adv", "like that, so (spoken form of begitu)"),
    "tdk": ("adv", "no, not (written short for tidak)"),
    "lho": ("particle", "shows surprise or insists: you know!, hey!"),
    "ntar": ("adv", "later, in a moment (spoken form of nanti)"),
    "pingin": ("verb", "to want to (spoken form of ingin)"),
    "nunggu": ("verb", "to wait (spoken form of menunggu)"),
    "bro": ("noun", "bro, mate (term of address)"),
    "sob": ("noun", "mate, buddy (from sobat)"),
    "kak": ("noun", "older sibling; used to address someone a little older (from kakak)"),
    "wkwk": ("intj", "haha (laughter in writing)"),
    "nih": ("particle", "here, this (spoken form of ini): here you go"),
    "ngga": ("adv", "no, not (spoken form of enggak, tidak)"),
}
for word, (pos, gloss) in SPOKEN.items():
    if word in data["e"]:
        if data["e"][word][0][1] != gloss:
            data["e"][word] = [[pos, gloss]] + data["e"][word][: MAX_SENSES - 1]
    else:
        extra[word] = [[pos, gloss, "s"]]

data["x"] = dict(sorted(extra.items()))
with open(dict_path, "w", encoding="utf8") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
by_source = collections.Counter(senses[0][2] for senses in extra.values())
print(
    f"added {len(extra)} words: {by_source['m']} from Malay Wiktionary, "
    f"{by_source['w']} from Wordnet Bahasa, {by_source['s']} spoken words; "
    f"real meanings put first for {len(reordered)}: {' '.join(reordered)}"
)
