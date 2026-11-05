import { Button } from "@/components/ui/Button";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import "./WelcomeView.css";

const BASE = "welcome-view";

export default function WelcomeView() {
  const [_, setRegistered] = useLocalStorage("registered", false);

  return (
    <div className={BASE}>
      <div className={`${BASE}__container`}>
        <header className={`${BASE}__header`}>
          <h1 className={`${BASE}__title`}>Kartu</h1>
          <p className={`${BASE}__tagline`}>
            Indonesian flashcards, reading and sentence practice, right here in
            your browser.
          </p>
        </header>

        <section className={`${BASE}__hero`}>
          <p className={`${BASE}__description`}>
            Everything is stored on this device. No account, no tracking. Add it
            to your home screen to use it like an app, even offline.
          </p>
          <Button
            onClick={() => setRegistered(true)}
            size="lg"
            variant="primary"
          >
            Get Studying
          </Button>
        </section>

        <section className={`${BASE}__features`}>
          <div className={`${BASE}__feature`}>
            <h2 className={`${BASE}__feature-title`}>Your flashcards</h2>
            <p className={`${BASE}__feature-text`}>
              Import your cards from a CSV and review them with FSRS spaced
              repetition, the scheduler Anki uses.
            </p>
          </div>

          <div className={`${BASE}__feature`}>
            <h2 className={`${BASE}__feature-title`}>Read and tap</h2>
            <p className={`${BASE}__feature-text`}>
              Read graded stories or paste any text. Tap a word to hear it, see
              its meaning and turn it into a card.
            </p>
          </div>

          <div className={`${BASE}__feature`}>
            <h2 className={`${BASE}__feature-title`}>Fill the gap</h2>
            <p className={`${BASE}__feature-text`}>
              Practise 7,000 real sentences built around the most common 2,000
              words, with streaks and points.
            </p>
          </div>
        </section>

        <footer className={`${BASE}__footer`}>
          <div className={`${BASE}__footer-branding`}>
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt=""
              className={`${BASE}__footer-logo`}
            />
            <span className={`${BASE}__footer-name`}>Kartu</span>
          </div>
          <p className={`${BASE}__footer-text`}>
            Built on the open-source apps{" "}
            <a
              href="https://github.com/h16nning/skola"
              target="_blank"
              rel="noopener noreferrer"
              className={`${BASE}__link`}
            >
              Skola
            </a>{" "}
            and{" "}
            <a
              href="https://github.com/heuwels/lector"
              target="_blank"
              rel="noopener noreferrer"
              className={`${BASE}__link`}
            >
              Lector
            </a>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}
