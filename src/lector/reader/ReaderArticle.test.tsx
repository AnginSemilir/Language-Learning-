import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReaderArticle from "./ReaderArticle";
import { blockWords } from "./phrase";

describe("ReaderArticle", () => {
  it("tells where a tapped word is in its block", () => {
    const onWordClick = vi.fn();
    render(
      <ReaderArticle
        content={"Mereka pergi bulan madu ke Bali.\n\nLalu pulang."}
        stateOf={() => "new"}
        activeWord={null}
        onWordClick={onWordClick}
        onActivateWord={() => {}}
      />
    );
    fireEvent.click(screen.getByText("bulan"));
    const [word, sentence, place] = onWordClick.mock.calls[0];
    expect(word).toBe("bulan");
    expect(sentence).toBe("Mereka pergi bulan madu ke Bali.");
    expect(place.wordIndex).toBe(2);
    expect(blockWords(place.parts).words).toEqual([
      "Mereka",
      "pergi",
      "bulan",
      "madu",
      "ke",
      "Bali",
    ]);
  });
});
