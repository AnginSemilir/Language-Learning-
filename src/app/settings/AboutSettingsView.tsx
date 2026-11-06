import "./AboutSettingsView.css";

const BASE = "about-skola";
const REPO = "https://github.com/AnginSemilir/Language-Learning-";

export default function AboutSettingsView() {
  return (
    <div className={BASE}>
      <p>
        Kartu combines two open-source projects, both under the GNU Affero
        General Public License v3:
      </p>
      <ul>
        <li>
          <a
            href="https://github.com/h16nning/skola"
            target="_blank"
            rel="noopener noreferrer"
          >
            Skola
          </a>{" "}
          by h16nning: decks, flashcards and FSRS review.
        </li>
        <li>
          <a
            href="https://github.com/heuwels/lector"
            target="_blank"
            rel="noopener noreferrer"
          >
            Lector
          </a>{" "}
          by heuwels: the Indonesian language pack, reader, cloze practice,
          streaks and starter lessons.
        </li>
        <li>
          <a
            href="https://github.com/damzaky/sastrawijs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Sastrawi
          </a>{" "}
          (MIT): the Indonesian stemmer used to match word forms.
        </li>
      </ul>
      <p>Data used:</p>
      <ul>
        <li>
          Dictionary: English Wiktionary via kaikki.org (CC BY-SA), as packaged
          by Lector.
        </li>
        <li>Word frequencies: wordfreq (data CC BY-SA 4.0).</li>
        <li>
          Practice sentences: Tatoeba (tatoeba.org, CC BY 2.0 FR); Wiktionary
          examples (CC BY-SA); TALPCo, the TUFS Asian Language Parallel Corpus
          (CC BY 4.0); Amazon MASSIVE (CC BY 4.0); the Asian Language Treebank
          by NICT (CC BY 4.0); Global Voices via OPUS (CC BY); TICO-19 (CC0);
          and the Leipzig Corpora Collection (wortschatz.uni-leipzig.de, CC BY).
        </li>
      </ul>
      <p>
        This app is AGPL-3.0 licensed.{" "}
        <a href={REPO} target="_blank" rel="noopener noreferrer">
          Source code
        </a>
      </p>
    </div>
  );
}
