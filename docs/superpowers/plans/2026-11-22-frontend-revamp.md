# Syllabot Frontend Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Syllabot chat frontend to match the visual language of `insp/design insp.jpg`: a mint backdrop, a rounded off-white app shell, a slim icon rail, a big light-weight headline, pastel tiles, and a right-hand session panel. Every current feature keeps working.

**Architecture:** Three columns inside one rounded shell: `Rail` (icons) | center (`Greeting` + `MaterialsGrid` when empty, the chat thread when not, `ProviderPills` + composer at the bottom) | `SessionPanel` (activity chart + document upload/list). File-list state moves out of `FileUpload` into a `useSessionFiles` hook so both the center grid and the panel can read it. The 1,471-line `App.css` gets split into focused files under `src/styles/`. Each task moves its own section over and deletes it from `App.css`, so the app stays styled after every task.

**Tech Stack:** React 18, Vite 5, plain CSS with custom properties, `@phosphor-icons/react`, `motion`, `react-markdown`. New: `@fontsource-variable/dm-sans`, plus dev-only `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.

**Spec:** This document's **Design Spec** section, taken from `insp/design insp.jpg`. No separate spec file exists.

## Global Constraints

- **"Do not use AI for this":** no image-generation tools and no generated bitmaps. Every visual (the logo mark, the chart, the tiles) is hand-written in CSS/SVG/JSX. There are no AI-themed visuals or copy either: no sparkles, glows, or "AI-powered" wording. Remove the existing `SparkleIcon` usage and the "AI Study Companion" suffix.
- Don't change the backend or the API: `src/api.js` stays as it is.
- Keep every existing behavior: new chat (deletes the session), send, provider override persisted in `localStorage["syllabot_provider"]`, session id in `localStorage["syllabot_session_id"]`, feedback toggle with rollback, upload (click and drag-drop), view file, delete file, clear all, sources list, confidence + latency meta.
- No fake data. The insp has friends, avatars, ratings, and student counts, but Syllabot has no users. Every number shown must come from real session state.
- Copy rules: sentence case everywhere. No all-caps labels, no monospace labels, no `→` on buttons, no `A · B · C` meta strings.
- No box-shadows on tiles or panels (the insp has none). Use color and radius for hierarchy.
- Windows reserves ports 5159–5258 on this machine, so the Vite dev server will fail on 5173. Use `npx vite --port 3001` for every manual check.
- Respect `prefers-reduced-motion`. Keep keyboard focus visible (`:focus-visible` outline, 2px `--ink`, 2px offset).

## Design Spec

**Palette (tokens in `src/styles/tokens.css`):**

| Token | Hex | Use |
|---|---|---|
| `--backdrop` | `#BFE8D5` | page background behind the shell |
| `--shell` | `#FCFAF7` | app shell / center column |
| `--sand` | `#F2EBE4` | rail and session panel |
| `--ink` | `#1C1A19` | text, active rail icon disc, user bubble, primary button |
| `--muted` | `#76706B` | secondary text |
| `--line` | `#E7DFD7` | 1px borders on white surfaces |
| `--rose` | `#F5C9C7` | tint: PDF, low confidence |
| `--peach` | `#F9DDB9` | tint: Word, medium confidence |
| `--lavender` | `#DAD5FB` | tint: notes (.md/.txt) |
| `--mint` | `#C8EEDB` | tint: data (.csv/.json), high confidence |
| `--sky` | `#CFE2F6` | tint: web page, unknown file |

Each tint also gets a `-deep` variant (about 12% darker, for the type-icon chip inside a tile), e.g. `--rose-deep: #EBA9A6`.

**Type:** DM Sans Variable (`@fontsource-variable/dm-sans`) only, replacing Outfit. Scale (rem): 0.8125 / 0.875 / 1 / 1.25 / 1.625 / 3.25. The headline is 3.25rem (clamp(2.25rem, 5vw, 3.25rem)), weight 400, line-height 1.08, letter-spacing -0.025em, max 14ch, so it wraps onto two lines like the insp. Tile titles are 1.25rem / weight 500 / line-height 1.3, clamped to 2 lines. Body is 1rem / 1.6.

**Radii (by hierarchy, not one value for everything):** shell 32px, panel and rail 24px, tile 20px, chart card 18px, file row 14px, pills and icon discs 999px.

**Layout:**

```
backdrop (mint)
┌──────────────────────────────────────────────────────────────────┐ shell
│ ┌────┐                                            ┌────────────┐ │
│ │ S  │  Study straight from                       │ This session│ │
│ │    │  your notes                                │ ┌────────┐ │ │
│ │ ●  │                                            │ │ 4 asked│ │ │
│ │ ○  │  Your materials                            │ │ ▆▃▅▇▂  │ │ │
│ │ ○  │  ┌──────────┐ ┌──────────┐                 │ └────────┘ │ │
│ │    │  │ PDF  12KB│ │ Word     │  pastel tiles   │ Documents  │ │
│ │    │  │ week3-…  │ │ syllabus │                 │ [drop zone]│ │
│ │    │  └──────────┘ └──────────┘                 │ file rows  │ │
│ │    │  (Default)(Gemini)(Groq)(Ollama)           │            │ │
│ │    │  [ Ask anything from your course…    (➤) ] │            │ │
│ └────┘                                            └────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

- Rail is 76px, the center is fluid (content max-width 760px, left-aligned the way the insp is, not centered), and the panel is 320px.
- Below 1100px the panel turns into a view you switch to from the rail.
- Below 720px the rail becomes a bottom bar, the shell loses its outer margin and radius, and the tiles go to one column.
- Once messages exist, the center swaps the greeting and grid for the thread. Pills and composer stay pinned at the bottom.

**Principles:**
1. The pastel tile is the one thing people should remember. Documents become colored tiles, and the activity bars reuse the same tints for confidence. Nothing else gets decoration.
2. Color carries meaning: the tint encodes file type in tiles and confidence in bars. It's never random.
3. There is one orchestrated motion moment: tiles settle in with a 40ms stagger on first render. Messages keep a short rise. Nothing else moves on its own.
4. Ink black is reserved for "active" and "yours": the active rail disc, the selected provider pill, user messages, and the send button.

**Copy (exact):**
- Headline: `Study straight from your notes`
- Lede: `Answers come only from the files you upload, with the passage they came from.`
- Grid heading: `Your materials`
- Empty-grid tile: title `Add your first file`, body `Lecture notes, slides or readings. PDF, Word, text, markdown, CSV, JSON or HTML.`
- Tile action (aria-label and visible on hover/focus): `Ask about {filename}`. Clicking fills the composer with `Summarize the key ideas in {filename}` and focuses it. It does not send.
- Panel headings: `This session`, `Documents`
- Stats: `{n} asked`, `{s}s average reply`. With no answers yet: `Your questions and reply times show up here.`
- Composer placeholder: `Ask anything from your course…`
- Error: `Couldn't reach Syllabot: {detail}. Check that the backend is running on port 8000.`

**Design review against generic defaults (done before writing tasks):** The first draft centered the headline and put a gradient behind it. Both are generic, and the insp is left-aligned and flat, so both were cut. The first draft also used one 16px radius on everything (the "SaaS card kit" default). That was replaced with the radius scale above. Random rotating pastels became type-encoded tints so the color tells you something. The insp's bell/settings/avatar chrome was dropped because Syllabot has no accounts or notifications.

## Review Focus

1. **Very long or unbroken filenames** (`Lecture_03_Final_FINAL_v2_reviewed_by_TA.pdf`): the tile title clamps to 2 lines with `overflow-wrap: anywhere` and the file row ellipsizes. Neither may widen the layout. Test in Task 4.
2. **Many documents (10+):** the grid wraps and scrolls inside the center column, and the panel list scrolls inside the panel. The composer must stay visible. Test in Task 4 (renders 12 tiles).
3. **Answers without numeric `latency_ms`, or with `confidence: "error"`:** stats skip non-numeric latency and the chart uses the neutral sand tint for unknown confidence. Nothing renders `NaN`. Test in Task 1.
4. **Backend down on page load:** `listSessionFiles` rejects, so the grid shows the empty tile, not an error, and the chat error copy appears only after a send fails. Test in Task 3.
5. **Narrow phones (360px):** no horizontal scroll, the bottom-bar rail doesn't cover the composer, and the documents view is reachable. Checked manually in Task 6 with a screenshot at 360×780.

---

### Task 1: Test harness and pure helpers

**Files:**
- Modify: `frontend/package.json` (add `"test": "vitest run"`, the dev deps above)
- Modify: `frontend/vite.config.js` (add `test: { environment: "jsdom", setupFiles: "./src/test/setup.js", globals: true }`)
- Create: `frontend/src/test/setup.js` (`import "@testing-library/jest-dom/vitest";`)
- Create: `frontend/src/lib/fileKinds.js`
- Create: `frontend/src/lib/sessionStats.js`
- Test: `frontend/src/lib/fileKinds.test.js`, `frontend/src/lib/sessionStats.test.js`

**Interfaces:**
- Produces: `fileKind(ext: string) -> { label: string, tint: "rose"|"peach"|"lavender"|"mint"|"sky" }`. Case-insensitive, accepts `"pdf"` or `".pdf"`. Mapping: pdf→`PDF`/rose, docx→`Word`/peach, md→`Notes`/lavender, txt→`Notes`/lavender, csv→`Data`/mint, json→`Data`/mint, html→`Web page`/sky, anything else (including `""`/undefined)→`File`/sky.
- Produces: `formatSize(bytes: number) -> string`, moved verbatim from `FileUpload.jsx`.
- Produces: `confidenceTint(c: string|undefined) -> "mint"|"peach"|"rose"|"sand"`: high→mint, medium→peach, low→rose, anything else→sand.
- Produces: `sessionStats(messages) -> { asked: number, avgSeconds: number|null, bars: Array<{ seconds: number, tint: string, heightPct: number }> }`. `asked` counts `role === "user"`. `bars` covers the last 7 assistant messages that have a finite numeric `latency_ms`, oldest first. `seconds` is rounded to 1 decimal. `heightPct` is `max(8, round(seconds / maxSeconds * 100))`. `avgSeconds` is the mean over those bars rounded to 1 decimal, or `null` when there are none.

- [ ] **Step 1: Install deps**

Run: `cd frontend && npm i @fontsource-variable/dm-sans && npm i -D vitest@^2 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`
Expected: exits 0.

- [ ] **Step 2: Write the failing tests**

```js
// fileKinds.test.js
test.each([
  [".pdf", "PDF", "rose"], ["PDF", "PDF", "rose"], [".docx", "Word", "peach"],
  [".md", "Notes", "lavender"], [".txt", "Notes", "lavender"], [".csv", "Data", "mint"],
  [".json", "Data", "mint"], [".html", "Web page", "sky"], [".xyz", "File", "sky"], [undefined, "File", "sky"],
])("fileKind(%s)", (ext, label, tint) => expect(fileKind(ext)).toEqual({ label, tint }));
test("formatSize", () => {
  expect(formatSize(512)).toBe("512 B"); expect(formatSize(2048)).toBe("2.0 KB");
  expect(formatSize(3 * 1024 * 1024)).toBe("3.0 MB");
});

// sessionStats.test.js
test("empty", () => expect(sessionStats([])).toEqual({ asked: 0, avgSeconds: null, bars: [] }));
test("skips non-numeric latency and maps error confidence to sand", () => {
  const s = sessionStats([
    { role: "user" }, { role: "assistant", latency_ms: 2000, confidence: "high" },
    { role: "user" }, { role: "assistant", confidence: "error" },
    { role: "user" }, { role: "assistant", latency_ms: 4000, confidence: "error" },
  ]);
  expect(s.asked).toBe(3); expect(s.avgSeconds).toBe(3);
  expect(s.bars).toEqual([{ seconds: 2, tint: "mint", heightPct: 50 }, { seconds: 4, tint: "sand", heightPct: 100 }]);
});
test("keeps only last 7 bars and floors height at 8", () => {
  const msgs = [{ role: "assistant", latency_ms: 100 }, ...Array.from({ length: 8 }, () => ({ role: "assistant", latency_ms: 10000 }))];
  const s = sessionStats(msgs);
  expect(s.bars).toHaveLength(7); expect(s.bars.every((b) => b.heightPct === 100)).toBe(true);
  expect(sessionStats([{ role: "assistant", latency_ms: 100 }, { role: "assistant", latency_ms: 100000 }]).bars[0].heightPct).toBe(8);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement `fileKinds.js` and `sessionStats.js`** (`confidenceTint` lives in `sessionStats.js`)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/src/test frontend/src/lib
git commit -m "test: add vitest harness and file/session helpers"
```

---

### Task 2: Tokens, shell, and rail

**Files:**
- Create: `frontend/src/styles/tokens.css` (palette, radii, type scale, `:focus-visible`, reduced-motion block)
- Create: `frontend/src/styles/base.css` (reset, body = `--backdrop`, DM Sans)
- Create: `frontend/src/styles/shell.css` (`.shell` grid `76px minmax(0,1fr) 320px`, shell margin 20px, radius 32px, height `calc(100dvh - 40px)`; `.rail`)
- Create: `frontend/src/styles/index.css` (imports the above in order; later tasks append their file)
- Create: `frontend/src/components/Rail.jsx`
- Create: `frontend/src/components/BrandMark.jsx` (hand-drawn 28×28 inline SVG: a black rounded bookmark with a notch, no text)
- Modify: `frontend/src/main.jsx` (swap the Outfit import for `@fontsource-variable/dm-sans`; import `./styles/index.css`)
- Modify: `frontend/src/App.jsx` (remove blobs, navbar, and FAB; render `<div className="shell"><Rail/><section className="center">…</section><aside className="panel">…</aside></div>`; add `view` state `"chat"|"documents"`)
- Modify: `frontend/src/App.css` (delete the sections: Theme tokens, Reset, Ambient background, Floating Navbar, Workspace, FAB, Focus, Reduced transparency)
- Modify: `frontend/package.json` (remove `@fontsource-variable/outfit`)
- Test: `frontend/src/components/Rail.test.jsx`

**Interfaces:**
- Produces: `<Rail view={"chat"|"documents"} onViewChange={(v) => void} onNewChat={() => void} canReset={boolean} />`. It renders, top to bottom: BrandMark, then a `nav` with buttons `New chat` (Plus icon, disabled when `!canReset`), `Chat` (ChatsCircle), and `Documents` (Files). The active view's button has `aria-current="page"` and gets the 44px ink disc with a white icon. Inactive buttons are 44px white discs with ink icons. Every button has an `aria-label` and a `title`.
- Produces: in App, `view` state. On desktop (≥1100px) `Documents` also calls `panelHeadingRef.current?.focus()`.

- [ ] **Step 1: Write the failing test**

```jsx
test("marks the active view and fires callbacks", async () => {
  const onViewChange = vi.fn(), onNewChat = vi.fn();
  render(<Rail view="chat" onViewChange={onViewChange} onNewChat={onNewChat} canReset />);
  expect(screen.getByRole("button", { name: "Chat" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "Documents" })).not.toHaveAttribute("aria-current");
  await userEvent.click(screen.getByRole("button", { name: "Documents" }));
  expect(onViewChange).toHaveBeenCalledWith("documents");
  await userEvent.click(screen.getByRole("button", { name: "New chat" }));
  expect(onNewChat).toHaveBeenCalled();
});
test("new chat disabled without messages", () => {
  render(<Rail view="chat" onViewChange={() => {}} onNewChat={() => {}} canReset={false} />);
  expect(screen.getByRole("button", { name: "New chat" })).toBeDisabled();
});
```

- [ ] **Step 2: Run it to verify it fails** (`npm test`: Rail not found)
- [ ] **Step 3: Implement Rail, BrandMark, the style files, and the App/main changes**
- [ ] **Step 4: Run `npm test` and `npm run build`.** Expected: tests pass, build exits 0.
- [ ] **Step 5: Visual check.** Run `npx vite --port 3001` and screenshot at 1440×900. Expected: mint backdrop, rounded off-white shell, sand rail with discs. The old navbar and blobs are gone and the existing chat still works.
- [ ] **Step 6: Commit** (`feat(ui): new shell, tokens and icon rail`)

---

### Task 3: Shared file state, session panel, and activity chart

**Files:**
- Create: `frontend/src/lib/useSessionFiles.js`
- Create: `frontend/src/components/SessionPanel.jsx`
- Create: `frontend/src/components/ActivityChart.jsx`
- Create: `frontend/src/styles/panel.css` (panel, chart card, upload zone, file rows, doc viewer, docs empty state)
- Modify: `frontend/src/components/FileUpload.jsx` (drop its own `files`/`refresh` state and take them as props; use `fileKind`/`formatSize` from `lib/fileKinds`; each row's icon chip uses `tile--{tint}`; remove the `Indexed` badge, since every listed file is indexed)
- Modify: `frontend/src/App.jsx` (call `useSessionFiles(sessionId)`; render `<SessionPanel>` in the `aside`; also call `refresh()` after a new chat)
- Modify: `frontend/src/App.css` (delete: Documents panel, Upload zone, File list, Doc viewer, Empty state)
- Test: `frontend/src/lib/useSessionFiles.test.js`, `frontend/src/components/ActivityChart.test.jsx`

**Interfaces:**
- Consumes: `sessionStats`, `confidenceTint`, `fileKind`, `formatSize` (Task 1).
- Produces: `useSessionFiles(sessionId: string) -> { files: Array<{filename, size_bytes, extension}>, refresh: () => Promise<void>, loaded: boolean }`. A rejected `listSessionFiles` gives `files = []` and `loaded = true`, with no throw.
- Produces: `<FileUpload sessionId files onRefresh inputRef />`. `inputRef` is forwarded to the hidden file input so the center's empty tile can open the picker.
- Produces: `<SessionPanel sessionId messages files onRefresh uploadInputRef headingRef />`. It contains the heading `This session` (with `tabIndex={-1}` and `ref={headingRef}`), `<ActivityChart messages>`, the heading `Documents`, and `<FileUpload>`.
- Produces: `<ActivityChart messages />`. White card, radius 18px. The top line shows `{asked} asked` (1.625rem/500) and, when `avgSeconds` isn't null, `{avgSeconds}s average reply` in `--muted`. Below that are up to 7 bars in a 96px-tall flex row. Each bar is `<span className="bar bar--{tint}" style={{height: heightPct+"%"}} title="{seconds}s, {confidence}" />` with radius 10px. The newest bar gets a 2px `--ink` outline, echoing the insp's highlighted "Dec" bar. With no bars it shows the empty copy from the Design Spec.

- [ ] **Step 1: Write the failing tests**

```js
// useSessionFiles.test.js — vi.mock("../api")
test("loads files", async () => {
  listSessionFiles.mockResolvedValue({ files: [{ filename: "a.pdf", size_bytes: 1, extension: ".pdf" }] });
  const { result } = renderHook(() => useSessionFiles("s1"));
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current.files).toHaveLength(1);
});
test("backend down yields empty list, no throw", async () => {
  listSessionFiles.mockRejectedValue(new Error("Network Error"));
  const { result } = renderHook(() => useSessionFiles("s1"));
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current.files).toEqual([]);
});
```
```jsx
// ActivityChart.test.jsx
test("empty state", () => {
  render(<ActivityChart messages={[]} />);
  expect(screen.getByText("0 asked")).toBeInTheDocument();
  expect(screen.getByText("Your questions and reply times show up here.")).toBeInTheDocument();
});
test("one bar per timed answer, tinted by confidence", () => {
  const { container } = render(<ActivityChart messages={[
    { role: "user" }, { role: "assistant", latency_ms: 3000, confidence: "medium" }]} />);
  expect(screen.getByText("1 asked")).toBeInTheDocument();
  expect(screen.getByText("3s average reply")).toBeInTheDocument();
  expect(container.querySelectorAll(".bar")).toHaveLength(1);
  expect(container.querySelector(".bar--peach")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run them to verify they fail**
- [ ] **Step 3: Implement the hook, chart, and panel, refactor FileUpload, and write panel.css.** Upload zone: dashed 1.5px `--line` border, radius 18px, white fill, ink upload disc. Drag-over: `--mint` fill.
- [ ] **Step 4: Run `npm test` and `npm run build`.** Expected: pass.
- [ ] **Step 5: Manual check on port 3001 with the backend running.** Upload a .pdf and see a rose-chip row. View it, delete it, then clear all. Ask one question and see one bar appear.
- [ ] **Step 6: Commit** (`feat(ui): session panel with activity chart and shared file state`)

---

### Task 4: Center: headline, materials grid, provider pills, and composer

**Files:**
- Create: `frontend/src/components/MaterialsGrid.jsx`
- Create: `frontend/src/components/ProviderPills.jsx`
- Create: `frontend/src/styles/center.css` (greeting, grid, tiles, pills, composer)
- Modify: `frontend/src/components/Greeting.jsx` (copy from the Design Spec; no icon mark; `h1.greeting__title`, `p.greeting__lede` at max 52ch, `--muted`)
- Modify: `frontend/src/components/ChatInput.jsx` (remove the provider dropdown and its menu state; make it controlled; add `ProviderPills` above the field row)
- Modify: `frontend/src/App.jsx` (`draft` state; `handleAsk(filename)`; render `Greeting` + `MaterialsGrid` when `!hasMessages`)
- Modify: `frontend/src/App.css` (delete: Greeting, Composer, provider selector)
- Test: `frontend/src/components/MaterialsGrid.test.jsx`, `frontend/src/components/ProviderPills.test.jsx`

**Interfaces:**
- Consumes: `fileKind`, `formatSize` (Task 1); `files`, `uploadInputRef` (Task 3).
- Produces: `<MaterialsGrid files onAsk={(filename) => void} onAddFile={() => void} />`. It renders the `h2` `Your materials` and a 2-column grid (`repeat(auto-fill, minmax(240px, 1fr))`, gap 14px). Each file is a `<button className="tile tile--{tint}" aria-label="Ask about {filename}">`, min-height 150px, radius 20px, padding 18px. Top row: a white 30px icon disc plus the kind label on the left, and a white pill with `formatSize` on the right. Bottom: the filename as the tile title (2-line clamp, `overflow-wrap: anywhere`). With `files.length === 0` it shows a single `tile tile--sky tile--add` button using the empty-tile copy, which calls `onAddFile`. Entrance: motion stagger 40ms, y 10→0, 0.35s, skipped under reduced motion.
- Produces: `<ProviderPills value={string} onChange={(key) => void} />`. It renders `role="radiogroup"` with `aria-label="Model"` and 4 `role="radio"` buttons, keys `""`/`gemini`/`groq`/`ollama`, labels `Default`/`Gemini`/`Groq`/`Ollama`. Icons: Cube for Default, Cloud for Gemini (no Sparkle), Lightning for Groq, Cpu for Ollama. Each pill is a white button with an icon in a 26px sand square, radius 999px. The selected pill is ink with white text, matching the insp's "All" pill. Arrow keys move the selection.
- Produces: `<ChatInput value onValueChange onSend loading provider onProviderChange inputRef />`. Send and Enter behavior is unchanged.
- Produces: `handleAsk(filename)` in App: `setDraft(\`Summarize the key ideas in ${filename}\`)`, then focus `composerRef`. On mobile it also sets `view = "chat"`.

- [ ] **Step 1: Write the failing tests**

```jsx
// MaterialsGrid.test.jsx
const files = [{ filename: "week3.pdf", size_bytes: 2048, extension: ".pdf" }];
test("tile per file, tinted by kind, click asks", async () => {
  const onAsk = vi.fn();
  render(<MaterialsGrid files={files} onAsk={onAsk} onAddFile={() => {}} />);
  const tile = screen.getByRole("button", { name: "Ask about week3.pdf" });
  expect(tile).toHaveClass("tile--rose");
  expect(screen.getByText("2.0 KB")).toBeInTheDocument();
  await userEvent.click(tile); expect(onAsk).toHaveBeenCalledWith("week3.pdf");
});
test("empty shows add tile", async () => {
  const onAddFile = vi.fn();
  render(<MaterialsGrid files={[]} onAsk={() => {}} onAddFile={onAddFile} />);
  await userEvent.click(screen.getByRole("button", { name: /Add your first file/ }));
  expect(onAddFile).toHaveBeenCalled();
});
test("12 files with a long unbroken name all render", () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ filename: `Lecture_${i}_Final_FINAL_v2_reviewed_by_TA_xxxxxxxxxxxxxxxx.pdf`, size_bytes: 1, extension: ".pdf" }));
  render(<MaterialsGrid files={many} onAsk={() => {}} onAddFile={() => {}} />);
  expect(screen.getAllByRole("button", { name: /^Ask about/ })).toHaveLength(12);
});
// ProviderPills.test.jsx
test("selected pill is checked; clicking changes", async () => {
  const onChange = vi.fn();
  render(<ProviderPills value="groq" onChange={onChange} />);
  expect(screen.getByRole("radio", { name: "Groq" })).toHaveAttribute("aria-checked", "true");
  await userEvent.click(screen.getByRole("radio", { name: "Ollama" }));
  expect(onChange).toHaveBeenCalledWith("ollama");
});
```

- [ ] **Step 2: Run them to verify they fail**
- [ ] **Step 3: Implement.** Composer: a white field row, radius 999px, 1px `--line` border, 56px tall. The send button is a 44px ink disc that goes `--line`-colored when disabled. The textarea auto-grows to 144px, at which point the row's radius drops to 24px. Long tile names go in CSS: `display:-webkit-box; -webkit-line-clamp:2; overflow:hidden; overflow-wrap:anywhere`.
- [ ] **Step 4: Run `npm test` and `npm run build`.** Expected: pass.
- [ ] **Step 5: Manual check.** Upload 3 files of different types and see 3 different tints. Click a tile and the composer fills and focuses without sending. Switch provider, reload, and the selection is kept.
- [ ] **Step 6: Commit** (`feat(ui): headline, pastel materials grid and provider pills`)

---

### Task 5: Thread restyle

**Files:**
- Create: `frontend/src/styles/chat.css` (thread, messages, meta, sources, feedback, pending, error)
- Modify: `frontend/src/components/ChatMessage.jsx` (replace the GraduationCap avatar with the 32px `BrandMark` on a sand disc; the confidence chip uses `chip chip--{confidenceTint}`; the time and latency share one muted line, as `{time}` and `{n}s` in two separate spans with a 10px gap)
- Modify: `frontend/src/components/SourcesPanel.jsx` (each source becomes a row with a kind-tinted chip from `fileKind(ext of src.file)`; the score is shown as a match percentage `Math.round(score*100)%` when `score <= 1`, otherwise the raw value)
- Modify: `frontend/src/App.jsx` (error copy from the Design Spec; the pending row shows `Reading your files…`)
- Modify: `frontend/src/App.css` (delete: Chat pane, Messages, Message meta, Sources, Feedback, Pending)
- Test: `frontend/src/components/ChatMessage.test.jsx`

**Interfaces:**
- Consumes: `confidenceTint`, `fileKind`, `BrandMark`.
- Visuals: user messages are an ink bubble with white text, right-aligned, radius 22px 22px 6px 22px, max-width 70%. Assistant messages are a white card with a 1px `--line` border, radius 20px, padding 18px 20px, and markdown styles (code is on `--sand`). Feedback buttons are 32px pills, and the selected one fills with `--mint`.

- [ ] **Step 1: Write the failing test**

```jsx
test("assistant message shows tinted confidence, latency and feedback", async () => {
  const onFeedback = vi.fn();
  const msg = { role: "assistant", content: "**Hi**", confidence: "low", latency_ms: 2400, query_id: 7, createdAt: "10:00" };
  render(<ChatMessage message={msg} onFeedback={onFeedback} />);
  expect(screen.getByText("low")).toHaveClass("chip--rose");
  expect(screen.getByText("2s")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Helpful" }));
  expect(onFeedback).toHaveBeenCalledWith(7, "up", msg);
});
```

- [ ] **Step 2: Run it to verify it fails** (chip class missing)
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run `npm test` and `npm run build`.** Expected: pass.
- [ ] **Step 5: Manual check.** Ask a question, expand sources, toggle feedback on and off. Stop the backend, send, and the new error copy shows.
- [ ] **Step 6: Commit** (`feat(ui): restyle chat thread, sources and feedback`)

---

### Task 6: Responsive, cleanup, and final verification

**Files:**
- Create: `frontend/src/styles/responsive.css` (last import in `index.css`)
- Delete: `frontend/src/App.css` (by now only the Responsive and Reduced-motion sections should be left; move anything still referenced and delete the file); remove its import from `App.jsx`
- Modify: `frontend/index.html` (title `Syllabot`; description `Ask questions about your course files and get answers with the passages they came from.`; `<meta name="theme-color" content="#BFE8D5">`; favicon becomes the BrandMark SVG path, ink on mint)
- Modify: `frontend/src/App.jsx` (`className={\`shell shell--${view}\`}`)

**Interfaces:**
- Breakpoints:
  - `<1100px`: grid `76px 1fr`. `.panel` is hidden unless `.shell--documents`, in which case it replaces the center (`.center` hidden).
  - `<720px`: the shell gets `margin: 0`, `border-radius: 0`, `height: 100dvh`, grid `1fr` with the rail as a fixed bottom bar 64px tall (sand, top radius 24px, buttons in a row, BrandMark hidden). `.center` and `.panel` get `padding-bottom: 80px` so the composer sits above the bar. The tile grid goes to 1 column and the headline floors at 2.25rem.

- [ ] **Step 1: Write responsive.css and delete App.css.** Run `grep -rn "App.css" frontend/src`. Expected: no matches.
- [ ] **Step 2: Check for orphaned classes.** For each `className` in `src/components` and `App.jsx`, confirm a rule exists under `src/styles/`. Run `npm run build`. Expected: exits 0.
- [ ] **Step 3: Run `npm test`.** Expected: all suites pass.
- [ ] **Step 4: Take screenshots** (Chrome, `npx vite --port 3001`, backend running) at 1440×900 (empty, with 3 files, mid-chat), 1024×768 (documents view via the rail), and 360×780 (chat and documents). Expected: no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`), the composer is not covered by the bottom bar, focus rings are visible when tabbing through rail → tiles → pills → composer, and with reduced motion emulated the tiles appear without animating.
- [ ] **Step 5: Docker check.** Run `docker compose build frontend`. Expected: succeeds (nginx serves `dist`).
- [ ] **Step 6: Commit** (`feat(ui): responsive layout, remove legacy stylesheet`)
