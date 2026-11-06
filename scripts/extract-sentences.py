"""Collect Indonesian sentences from the pool's sources into one TSV, the input
for scripts/build-sentence-pool.ts.

Download into one directory (sources that are missing are skipped):

  # Tatoeba (CC BY 2.0 FR)
  T=https://downloads.tatoeba.org/exports/per_language
  curl -O $T/ind/ind_sentences.tsv.bz2 -O $T/ind/ind-eng_links.tsv.bz2 -O $T/eng/eng_sentences.tsv.bz2
  # Wiktionary via kaikki.org (CC BY-SA)
  curl -O https://kaikki.org/dictionary/Indonesian/kaikki.org-dictionary-Indonesian.jsonl
  # Leipzig Corpora Collection (CC BY), monolingual
  L=https://downloads.wortschatz-leipzig.de/corpora
  curl -O $L/ind_news_2023_1M.tar.gz -O $L/ind_wikipedia_2021_1M.tar.gz
  # TUFS Asian Language Parallel Corpus, TALPCo (CC BY 4.0)
  G=https://raw.githubusercontent.com/matbahasa/TALPCo/master
  curl -o talpco_ind.txt $G/ind/data_ind.txt -o talpco_eng.txt $G/eng/data_eng.txt
  # Amazon MASSIVE (CC BY 4.0)
  curl -O https://amazon-massive-nlu-dataset.s3.amazonaws.com/amazon-massive-dataset-1.1.tar.gz
  # Asian Language Treebank, ALT (CC BY 4.0)
  curl -O https://www2.nict.go.jp/astrec-att/member/mutiyama/ALT/ALT-Parallel-Corpus-20191206.zip
  # Global Voices via OPUS (CC BY)
  curl -o GlobalVoices-en-id.txt.zip https://object.pouta.csc.fi/OPUS-GlobalVoices/v2018q4/moses/en-id.txt.zip
  # TICO-19 (CC0)
  curl -O https://tico-19.github.io/data/tico19-testset.zip
  # Not used: OpenSubtitles v2018 via OPUS. Its translations are often
  # unrelated to the Indonesian line ("Pemikat wanita apanya." / "Man, sit
  # your candy-ass down."), and it has no stated licence. To try it anyway,
  # download it and run with WITH_OPENSUBTITLES=1:
  # curl -o OpenSubtitles-en-id.txt.zip https://object.pouta.csc.fi/OPUS-OpenSubtitles/v2018/moses/en-id.txt.zip

Usage: python3 scripts/extract-sentences.py <download dir> <out.tsv>
Output columns: source code (see src/lector/sentencePool.ts), Indonesian,
English (may be empty).
"""

import bz2
import json
import os
import re
import sys
import tarfile
import zipfile

src_dir, out_path = sys.argv[1:3]
ws = re.compile(r"\s+")
counts = {}


def path(name):
    return os.path.join(src_dir, name)


def have(*names):
    return all(os.path.exists(path(n)) for n in names)


def clean(text):
    return ws.sub(" ", text).strip()


def plausible(ind, eng):
    """Machine-aligned corpora: drop pairs whose lengths don't match."""
    return 0.5 <= len(eng) / max(len(ind), 1) <= 2.0


def tsv_lines(name):
    with bz2.open(path(name), "rt", encoding="utf-8") as f:
        for line in f:
            yield line.rstrip("\n").split("\t")


ID_QUESTION = re.compile(
    r"^(apa|apakah|siapa|kapan|di ?mana|ke ?mana|dari ?mana|bagaimana|berapa|"
    r"mengapa|kenapa|bisakah|dapatkah|maukah|adakah|bolehkah|haruskah)\b"
)
EN_QUESTION = re.compile(
    r"^(what|who|whom|whose|when|where|why|how|which|is|are|am|was|were|"
    r"do|does|did|can|could|will|would|should|shall|may|have|has)\b"
)


def sentence_case(text, question):
    """MASSIVE is lower-case without punctuation: "bangunkan saya jam lima"."""
    text = text.strip()
    if not text:
        return text
    return text[0].upper() + text[1:] + ("?" if question.match(text) else ".")


# MASSIVE localised names and places, so the two sides name different things.
MASSIVE_LOCALISED = re.compile(
    r"\[(person|place_name|business_name|artist_name|song_name|movie_name|"
    r"podcast_name|playlist_name|radio_name|app_name|event_name|game_name|"
    r"audiobook_name|house_place|transport_name|media_type) :"
)


def write(out, source, ind, eng):
    ind, eng = clean(ind), clean(eng)
    if not ind:
        return
    out.write(f"{source}\t{ind}\t{eng}\n")
    counts[source] = counts.get(source, 0) + 1


with open(out_path, "w", encoding="utf-8") as out:
    # Tatoeba: Indonesian sentences, English through the ind-eng links.
    if have("ind_sentences.tsv.bz2", "ind-eng_links.tsv.bz2", "eng_sentences.tsv.bz2"):
        links = {}
        for ind_id, eng_id in tsv_lines("ind-eng_links.tsv.bz2"):
            links.setdefault(ind_id, []).append(eng_id)
        wanted = {e for ids in links.values() for e in ids}
        english = {}
        for row in tsv_lines("eng_sentences.tsv.bz2"):
            if row[0] in wanted:
                english[row[0]] = row[2]
        for row in tsv_lines("ind_sentences.tsv.bz2"):
            eng = next((english[e] for e in links.get(row[0], []) if e in english), "")
            write(out, "t", row[2], eng)

    # Wiktionary usage examples. "a ― b" lines are glossed collocations, not sentences.
    if have("kaikki.org-dictionary-Indonesian.jsonl"):
        with open(path("kaikki.org-dictionary-Indonesian.jsonl"), encoding="utf-8") as f:
            for line in f:
                for sense in json.loads(line).get("senses", []):
                    for ex in sense.get("examples", []):
                        text = ex.get("text", "")
                        if text and " ― " not in text:
                            write(out, "w", text, ex.get("english") or ex.get("translation") or "")

    # TALPCo: "<id>\t<sentence>" per language, joined on the id.
    if have("talpco_ind.txt", "talpco_eng.txt"):
        def talpco(name):
            with open(path(name), encoding="utf-8") as f:
                return dict(line.rstrip("\n").split("\t", 1) for line in f if "\t" in line)

        eng = talpco("talpco_eng.txt")
        for key, ind in talpco("talpco_ind.txt").items():
            write(out, "k", ind, eng.get(key, ""))

    # MASSIVE: voice-assistant requests, joined on the id across locales.
    if have("amazon-massive-dataset-1.1.tar.gz"):
        with tarfile.open(path("amazon-massive-dataset-1.1.tar.gz"), "r:gz") as tar:
            def massive(locale):
                f = tar.extractfile(f"1.1/data/{locale}.jsonl")
                return {d["id"]: d for d in map(json.loads, f)}

            eng = massive("en-US")
            for key, d in massive("id-ID").items():
                e = eng.get(key)
                if not e or MASSIVE_LOCALISED.search(d["annot_utt"]):
                    continue
                write(
                    out,
                    "m",
                    sentence_case(d["utt"], ID_QUESTION),
                    sentence_case(e["utt"], EN_QUESTION),
                )

    # ALT: Wikinews translated by NICT, "SNT.<url>.<n>\t<sentence>".
    if have("ALT-Parallel-Corpus-20191206.zip"):
        with zipfile.ZipFile(path("ALT-Parallel-Corpus-20191206.zip")) as z:
            def alt(lang):
                lines = z.read(f"ALT-Parallel-Corpus-20191206/data_{lang}.txt").decode("utf-8")
                return dict(l.split("\t", 1) for l in lines.splitlines() if "\t" in l)

            eng = alt("en")
            for key, ind in alt("id").items():
                if key in eng and plausible(ind, eng[key]):
                    write(out, "a", ind, eng[key])

    # Global Voices (OPUS, Moses format: one sentence per line, line-aligned).
    if have("GlobalVoices-en-id.txt.zip"):
        with zipfile.ZipFile(path("GlobalVoices-en-id.txt.zip")) as z:
            ind = z.read("GlobalVoices.en-id.id").decode("utf-8").splitlines()
            eng = z.read("GlobalVoices.en-id.en").decode("utf-8").splitlines()
            for i, e in zip(ind, eng):
                if i.strip() and e.strip() and plausible(i, e):
                    write(out, "g", i, e)

    # TICO-19: COVID-19 health texts, professionally translated.
    if have("tico19-testset.zip"):
        with zipfile.ZipFile(path("tico19-testset.zip")) as z:
            for part in ("dev/dev", "test/test"):
                rows = z.read(f"tico19-testset/{part}.en-id.tsv").decode("utf-8").splitlines()
                for row in rows[1:]:
                    cols = row.split("\t")
                    if len(cols) >= 4:
                        write(out, "c", cols[3], cols[2])

    # OpenSubtitles (OPUS): off unless asked for (see the header). Subtitle
    # lines often have a space before punctuation ("Kami menyelesaikan ini .").
    if os.environ.get("WITH_OPENSUBTITLES") and have("OpenSubtitles-en-id.txt.zip"):
        space_before = re.compile(r"\s+([.,!?;:])")
        with zipfile.ZipFile(path("OpenSubtitles-en-id.txt.zip")) as z:
            with z.open("OpenSubtitles.en-id.id") as fi, z.open("OpenSubtitles.en-id.en") as fe:
                for i, e in zip(fi, fe):
                    i = space_before.sub(r"\1", i.decode("utf-8").strip())
                    e = space_before.sub(r"\1", e.decode("utf-8").strip())
                    if i and e and not i.startswith("-") and plausible(i, e):
                        write(out, "o", i, e)

    # Leipzig: "<id>\t<sentence>" in the *-sentences.txt member of each archive.
    for name, source in [("ind_news_2023_1M", "n"), ("ind_wikipedia_2021_1M", "p")]:
        if not have(f"{name}.tar.gz"):
            continue
        with tarfile.open(path(f"{name}.tar.gz"), "r:gz") as tar:
            f = tar.extractfile(tar.getmember(f"{name}/{name}-sentences.txt"))
            for raw in f:
                parts = raw.decode("utf-8").rstrip("\n").split("\t", 1)
                if len(parts) == 2:
                    write(out, source, parts[1], "")

for source, n in counts.items():
    print(f"{source}: {n} sentences")
