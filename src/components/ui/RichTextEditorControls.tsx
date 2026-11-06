import {
  IconBold,
  IconClearFormatting,
  IconCode,
  IconHighlight,
  IconItalic,
  IconLetterA,
  IconLink,
  IconLinkOff,
  IconList,
  IconListNumbers,
  IconStrikethrough,
  IconSubscript,
  IconSuperscript,
  IconUnderline,
} from "@tabler/icons-react";
import { Editor } from "@tiptap/react";
import { RichTextEditorControl } from "./RichTextEditor";

import { memo, useCallback, useRef, useState } from "react";

interface ControlProps {
  editor: Editor | null;
}

export const BoldControl = memo(function BoldControl({ editor }: ControlProps) {
  return (
    <RichTextEditorControl
      onClick={() => editor?.chain().focus().toggleBold().run()}
      active={editor?.isActive("bold")}
      disabled={!editor?.can().chain().focus().toggleBold().run()}
      title="Bold (Ctrl+B)"
    >
      <IconBold />
    </RichTextEditorControl>
  );
});

export const ItalicControl = memo(function ItalicControl({
  editor,
}: ControlProps) {
  return (
    <RichTextEditorControl
      onClick={() => editor?.chain().focus().toggleItalic().run()}
      active={editor?.isActive("italic")}
      disabled={!editor?.can().chain().focus().toggleItalic().run()}
      title="Italic (Ctrl+I)"
    >
      <IconItalic />
    </RichTextEditorControl>
  );
});

export const UnderlineControl = memo(function UnderlineControl({
  editor,
}: ControlProps) {
  return (
    <RichTextEditorControl
      onClick={() => editor?.chain().focus().toggleUnderline().run()}
      active={editor?.isActive("underline")}
      disabled={!editor?.can().chain().focus().toggleUnderline().run()}
      title="Underline (Ctrl+U)"
    >
      <IconUnderline />
    </RichTextEditorControl>
  );
});

export const StrikethroughControl = memo(function StrikethroughControl({
  editor,
}: ControlProps) {
  return (
    <RichTextEditorControl
      onClick={() => editor?.chain().focus().toggleStrike().run()}
      active={editor?.isActive("strike")}
      disabled={!editor?.can().chain().focus().toggleStrike().run()}
      title="Strikethrough"
    >
      <IconStrikethrough />
    </RichTextEditorControl>
  );
});

export const HighlightControl = memo(function HighlightControl({
  editor,
}: ControlProps) {
  return (
    <RichTextEditorControl
      onClick={() => editor?.chain().focus().toggleHighlight().run()}
      active={editor?.isActive("highlight")}
      disabled={!editor?.can().chain().focus().toggleHighlight().run()}
      title="Highlight"
    >
      <IconHighlight />
    </RichTextEditorControl>
  );
});

export const CodeControl = memo(function CodeControl({ editor }: ControlProps) {
  return (
    <RichTextEditorControl
      onClick={() => editor?.chain().focus().toggleCode().run()}
      active={editor?.isActive("code")}
      disabled={!editor?.can().chain().focus().toggleCode().run()}
      title="Code"
    >
      <IconCode />
    </RichTextEditorControl>
  );
});

export const SubscriptControl = memo(function SubscriptControl({
  editor,
}: ControlProps) {
  return (
    <RichTextEditorControl
      onClick={() => editor?.chain().focus().toggleSubscript().run()}
      active={editor?.isActive("subscript")}
      disabled={!editor?.can().chain().focus().toggleSubscript().run()}
      title="Subscript"
    >
      <IconSubscript />
    </RichTextEditorControl>
  );
});

export const SuperscriptControl = memo(function SuperscriptControl({
  editor,
}: ControlProps) {
  return (
    <RichTextEditorControl
      onClick={() => editor?.chain().focus().toggleSuperscript().run()}
      active={editor?.isActive("superscript")}
      disabled={!editor?.can().chain().focus().toggleSuperscript().run()}
      title="Superscript"
    >
      <IconSuperscript />
    </RichTextEditorControl>
  );
});

export const ClearFormattingControl = memo(function ClearFormattingControl({
  editor,
}: ControlProps) {
  return (
    <RichTextEditorControl
      onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
      title="Clear formatting"
    >
      <IconClearFormatting />
    </RichTextEditorControl>
  );
});

export const BulletListControl = memo(function BulletListControl({
  editor,
}: ControlProps) {
  return (
    <RichTextEditorControl
      onClick={() => editor?.chain().focus().toggleBulletList().run()}
      active={editor?.isActive("bulletList")}
      title="Bullet list"
    >
      <IconList />
    </RichTextEditorControl>
  );
});

export const OrderedListControl = memo(function OrderedListControl({
  editor,
}: ControlProps) {
  return (
    <RichTextEditorControl
      onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      active={editor?.isActive("orderedList")}
      title="Numbered list"
    >
      <IconListNumbers />
    </RichTextEditorControl>
  );
});

export const LinkControl = memo(function LinkControl({ editor }: ControlProps) {
  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  return (
    <RichTextEditorControl
      onClick={setLink}
      active={editor?.isActive("link")}
      title="Add link"
    >
      <IconLink />
    </RichTextEditorControl>
  );
});

export const UnlinkControl = memo(function UnlinkControl({
  editor,
}: ControlProps) {
  return (
    <RichTextEditorControl
      onClick={() => editor?.chain().focus().unsetLink().run()}
      disabled={!editor?.isActive("link")}
      title="Remove link"
    >
      <IconLinkOff />
    </RichTextEditorControl>
  );
});

/** Text colours that read well on both the light and the dark theme. */
export const TEXT_COLOURS = [
  { name: "Red", value: "#e03131" },
  { name: "Orange", value: "#e8590c" },
  { name: "Green", value: "#2f9e44" },
  { name: "Blue", value: "#1c7ed6" },
  { name: "Purple", value: "#9c36b5" },
] as const;

export const ColorControl = memo(function ColorControl({
  editor,
}: ControlProps) {
  const [open, setOpen] = useState(false);
  // Clicking the toolbar moves the cursor to the end of the text, so the
  // selection is remembered when the palette opens and restored to colour it.
  const selection = useRef<{ from: number; to: number } | null>(null);
  const current: string | undefined = editor?.getAttributes("textStyle").color;
  const apply = (colour: string | null) => {
    let chain = editor?.chain().focus();
    if (selection.current) chain = chain?.setTextSelection(selection.current);
    if (colour) chain?.setColor(colour).run();
    else chain?.unsetColor().run();
    setOpen(false);
  };
  const remember = () => {
    if (!open && editor) {
      const { from, to } = editor.state.selection;
      selection.current = { from, to };
    }
  };
  return (
    <span className="rte-colour">
      <span
        className="rte-colour__keep-selection"
        // Read the selection before the press moves it (mouse, touch or pen).
        onPointerDownCapture={remember}
      >
        <RichTextEditorControl
          onClick={() => setOpen(!open)}
          active={!!current}
          title="Text colour"
        >
          <IconLetterA
            className="rte-colour__icon"
            style={{ borderBottomColor: current ?? "currentColor" }}
          />
        </RichTextEditorControl>
      </span>
      {open && (
        <span
          className="rte-colour__palette"
          role="group"
          aria-label="Text colour"
        >
          {TEXT_COLOURS.map((c) => (
            <button
              key={c.value}
              type="button"
              className="rte-colour__swatch"
              style={{ background: c.value }}
              title={c.name}
              aria-label={c.name}
              // Keep the text selected while choosing.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply(c.value)}
            />
          ))}
          <button
            type="button"
            className="rte-colour__swatch rte-colour__swatch--none"
            title="No colour"
            aria-label="No colour"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(null)}
          />
        </span>
      )}
    </span>
  );
});
