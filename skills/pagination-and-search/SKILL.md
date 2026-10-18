---
name: pagination-and-search
description: Use when building or reviewing pagination, a results list, or a search and filter UI, when page links are too small or unlabelled, or when users lose track of where they are in a set of results.
---

# Pagination and search

**Criteria:** SC 2.4.4 Link Purpose (In Context), SC 2.4.8 Location, SC 3.2.3 Consistent Navigation, SC 2.5.8 Target Size (Minimum)

Pagination and search are where a user answers two questions continuously: *what
will this link do*, and *where am I*. Both are answerable in the markup, and both
are routinely left to a visual design that only works with a mouse. The mistake
that matters most is replacing links with click handlers, which costs keyboard
access, middle-click, and the browser's own "where am I" affordances at once.

## When to use

- "The page numbers are 16px tall and I keep hitting the wrong one on a phone."
- Building pagination, a "load more" control, or a results list.
- A search or filter panel that reorders or relocates itself between pages.
- Reviewing breadcrumbs, page counts, or a "1 2 3 … 12" control.

## Procedure

1. **Use real links, in a named landmark.** Pagination is navigation, so it
   belongs in a `<nav>` with an accessible name, and each page is an `<a href>`.
   A `<div onclick>` or a `<button>` that runs a handler loses keyboard support
   unless it is reimplemented, and loses open-in-new-tab and copy-link entirely
   (SC 2.1.1 in practice).

   ```html
   <!-- Fails: not focusable, not a link, not operable with the keyboard -->
   <div class="page" onclick="go(2)">2</div>

   <!-- Passes: a landmark, real links, and the current page marked -->
   <nav aria-label="Search results pages">
     <ul>
       <li><a href="?page=1" aria-label="Go to page 1">1</a></li>
       <li><a href="?page=2" aria-current="page" aria-label="Go to page 2, current page">2</a></li>
       <li><a href="?page=3" aria-label="Go to page 3">3</a></li>
     </ul>
   </nav>
   ```

2. **Name every link so its purpose is clear in context (SC 2.4.4).** A single
   "Next" or "More" repeated in a list is ambiguous; page numbers inside a named
   pagination landmark are usually clear because the context supplies the
   meaning. When the visible text is a bare number or an arrow, extend the
   accessible name rather than replacing it — and keep the visible text inside
   the name, which is what Label in Name requires.

   ```html
   <!-- Passes: visible "2" is contained in the accessible name -->
   <a href="?page=2" aria-label="Go to page 2">2</a>

   <!-- Passes: an icon with no visible text gets its name from aria-label -->
   <a href="?page=3" aria-label="Go to next page">
     <svg aria-hidden="true" focusable="false">…</svg>
   </a>
   ```

3. **Say where the user is (SC 2.4.8 Location, Level AAA).** Location is the
   criteria that a slick, minimal results page usually fails: provide
   breadcrumbs, mark the current page with `aria-current="page"`, and give the
   document a title that reflects the query and the page. All three are the
   answer to "where am I".

   ```html
   <nav aria-label="Breadcrumb">
     <ol>
       <li><a href="/">Home</a></li>
       <li><a href="/shoes">Shoes</a></li>
       <li><a href="/shoes/trail" aria-current="page">Trail</a></li>
     </ol>
   </nav>
   <!-- <title>Trail shoes — page 3 of 12 — Shop</title> -->
   ```

4. **Keep navigation in the same place, in the same order, on every page
   (SC 3.2.3 Consistent Navigation).** If the page-size selector, the sort
   control, and the pagination move between page 1 and page 2 — or the sort
   resets to relevance when the user leaves page 3 — a keyboard user has to
   re-find everything. Consistency here is about relative order, not pixel
   position.

5. **Meet the target size floor (SC 2.5.8 Target Size (Minimum), Level AA:
   24 × 24 CSS px).** This is the criterion the "1 2 3" control most often
   fails, because the digits are small and tightly packed. Measure the hit area,
   not the glyph: padding counts.

   ```css
   /* Fails: the glyph is 12px, so the target is roughly 12x16 */
   .page-link { font-size: 12px; padding: 0; }

   /* Passes: at least 24x24 of hit area; the glyph is unchanged */
   .page-link { min-width: 24px; min-height: 24px;
                display: inline-flex; align-items: center; justify-content: center; }
   ```

   The exception that saves tightly-packed designs is the **spacing** exception:
   an undersized target passes if a 24px-diameter circle centred on it does not
   overlap the circle of any other target. Inline links inside a sentence are
   exempt. 44 × 44 is the AAA figure (SC 2.5.5 Target Size (Enhanced)) and a
   better default for the current-page control.

6. **Keep the search control a real form with a real label.** Wrap it in
   `<form role="search">`, give the input a `<label>` (visually hidden if the
   design wants a magnifier only), and submit with a button rather than only on
   Enter. Announce the result count as a status message so a `polite` update
   tells the user the search ran.

   ```html
   <form role="search" action="/search">
     <label for="q" class="visually-hidden">Search products</label>
     <input id="q" name="q" type="search">
     <button type="submit">Search</button>
     <p role="status" aria-live="polite">12 results for “trail shoes”</p>
   </form>
   ```

7. **Apply filters on request, not on selection (SC 3.2.2 On Input).** A
   filter that reloads the page the moment a checkbox is ticked, or a sort that
   reorders immediately, is a change of context on input; provide an "Apply"
   control, or trigger on the input's own blur/commit in a way the user expects.
   This is also what keeps the results count live region from firing on every
   keystroke.

## Verify

| Do this | Passing looks like | Criterion |
|---|---|---|
| Tab to each page control and read its name | the name states the destination, not just the number or the arrow | 2.4.4 |
| Read the current page link with a screen reader | it is announced as the current page | 2.4.8 |
| Compare page 1 and page 2 | pagination, sort, and page-size controls are in the same relative order | 3.2.3 |
| Measure every pagination target | at least 24 × 24 CSS px, or non-overlapping 24px spacing circles | 2.5.8 |
| Open a page link in a new tab | it works, because it is an `href` | 2.4.4 |

```js
// Target size: flag pagination controls under the AA floor, then apply the
// spacing exception before reporting.
const pagination = document.querySelector('nav[aria-label*="page" i]');
for (const a of pagination?.querySelectorAll('a, button') ?? []) {
  const r = a.getBoundingClientRect();
  if (r.width >= 24 && r.height >= 24) continue;
  const others = [...pagination.querySelectorAll('a, button')].filter((o) => o !== a);
  const overlaps = others.some((o) => {
    const b = o.getBoundingClientRect();
    return Math.hypot(
      r.left + r.width / 2 - (b.left + b.width / 2),
      r.top + r.height / 2 - (b.top + b.height / 2),
    ) < 24;
  });
  console.log(a.textContent.trim(), `${Math.round(r.width)}x${Math.round(r.height)}`,
    overlaps ? 'fails (spacing circles overlap)' : 'passes via the spacing exception');
}
```

The name-quality rows need judgement: whether "3" is unambiguous depends on the
surrounding heading and landmark, and no automated rule reads that.

## Failure modes

- **Pagination built from `onclick` handlers on `div`s or `span`s.** Not
  focusable, not operable with `Enter`, not openable in a new tab, and invisible
  to the accessibility tree as navigation.
- **A repeated "Next" with no context.** Every link named "Next" or ">" on the
  page, with nothing in the state to tell them apart, fails SC 2.4.4.
- **The current page is a link to itself, or to `#`.** It reloads the same
  results and offers no indication of location. Render it as marked-up current
  state with `aria-current="page"`.
- **The sort or page-size control resets or moves between pages.** SC 3.2.3
  covers consistent navigation; a control that changes relative order forces the
  user to re-search for it.
- **Tiny, tightly-packed page numbers.** The classic SC 2.5.8 failure in this
  pattern, and the spacing exception is often unavailable because the numbers
  are adjacent by design.
- **Filters that reload on every checkbox tick.** A change of context on input,
  and it makes any result-count live region chatter.
- **Only "Load more" and infinite scroll, with no pagination.** Nothing marks
  location, the keyboard cannot reach the end of the set reliably, and a shared
  link cannot point at a page.
- **The overcorrection: an `aria-label` that replaces the visible number.**
  `aria-label="Page 2"` on a link whose visible text is "Next" breaks Label in
  Name, because the visible words are not in the accessible name. Extend the
  name, do not overwrite it.
