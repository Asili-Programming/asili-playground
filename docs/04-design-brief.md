# Asili Playground — Design Brief

As of 7 November 2026 · Victor Kaiuki

The playground uses the website's brand (olive, copper, paper; see the website repo's
`docs/04-design-brief.md`) with one difference: the editor dominates the page, and the tool bar
makes each Pata tool a named button, not an icon puzzle.

## Principles

- **Code first.** The editor takes at least 60% of the viewport height on desktop.
- **Tools as words.** Each tool button has a Swahili label (English when `lugha=en`) and a shortcut
  in its tooltip.
- **Errors are teaching.** Diagnostics show on the line, in plain Swahili, with the code linked to
  the wiki's explanation (v2).

## Layout

```text
Desktop (≥ 960 px)
+---------------------------------------------------------------+
| Asili  [Mifano v]                         English   [Shiriki] |
| [▶ Endesha] [■ Simamisha] [Nadhifisha] [Kagua] [Jaribu]  ●    |
| kuu.as | msaada.as | +                                         |
|                                                               |
|   editor                                                      |
|                                                               |
+-------------------------------+-------------------------------+
| Matokeo | Matatizo (2) | Majaribio                            |
| output                                                         |
+---------------------------------------------------------------+

Phone (< 640 px): tool bar scrolls sideways, Endesha stays first;
output panel becomes a sheet that slides up after a run.
```

## Words

Drafts for native-speaker review:

| Element | Swahili | English |
| --- | --- | --- |
| Run | Endesha | Run |
| Stop | Simamisha | Stop |
| Format | Nadhifisha | Format |
| Lint | Kagua | Lint |
| Test | Jaribu | Test |
| Share | Shiriki | Share |
| Samples | Mifano | Samples |
| Output tab | Matokeo | Output |
| Problems tab | Matatizo | Problems |
| Tests tab | Majaribio | Tests |
| Trace tab (v2) | Ufuatiliaji | Trace |
| Clear | Futa | Clear |
| Loading | Inapakia… | Loading… |
| Link copied | Kiungo kimenakiliwa | Link copied |

The existing interface already uses Endesha, Futa and Chagua mfano; keep them.

## Colour and type

- Page colours are the website tokens: `paper`, `ink`, `muted`, `olive`, `copper`.
- **Editor theme:** a light theme on `paper` and a dark theme on `#161712` (replacing CodeMirror's
  One Dark, so the editor matches the site). Keywords in `olive`, strings in `copper-text`,
  comments in `muted`, types in `ink` bold. Every token colour meets 4.5:1 on its background.
- Diagnostics: errors use the theme's red underline; lint findings a yellow underline; both also
  carry an icon in the gutter, so colour is never the only signal.
- Code font: the system monospace stack, 15 px in the editor, 14 px in output.

## Embed mode

```text
+---------------------------------------------+
| editor (6–12 lines)                          |
| [▶ Endesha]            Fungua kwenye uwanja ↗|
| output (collapsed until first run)           |
+---------------------------------------------+
```

No header, no tabs, no tool bar beyond Run. Height follows the code; width follows the host page.

## Motion

Only the run indicator (a pulsing dot while Working) and the output sheet on phones. Off under
`prefers-reduced-motion`.
