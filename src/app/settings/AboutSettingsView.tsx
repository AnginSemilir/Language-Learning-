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
        <li>
          Practice sentences: Tatoeba (tatoeba.org), CC BY 2.0 FR, as packaged
          by Lector.
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
