---
name: data-table
description: Use when building or reviewing a data table, when a screen reader reads a cell without its row and column headers, when a table will not fit on a phone, or when a grid of divs is doing a table's job.
---

# Data tables

**Criteria:** SC 1.3.1 Info and Relationships, SC 1.3.2 Meaningful Sequence, SC 2.4.6 Headings and Labels, SC 1.4.10 Reflow

A data table is a two-dimensional relationship between each cell and the headers
that describe it, and that relationship exists for assistive technology only if
the markup declares it. The mistake that matters most is not a missing `scope` —
it is reaching for `<table>` when the content is not tabular at all, or building
a table out of divs and CSS Grid and assuming the grid is understood as one.

## When to use

- "The screen reader reads the amounts but never says which column they are in."
- Building a results, pricing, comparison, schedule, or financial table.
- A table that overflows on a phone and someone proposed `display: block`.
- Reviewing `role="table"` / `role="grid"` on a set of divs.
- A list of key–value pairs rendered as a two-column table.

## Procedure

1. **Decide whether a table is the right pattern at all.** A real table has rows
   of records and columns of attributes, and a reader needs both axes to
   interpret a cell. None of these are tables (SC 1.3.1):

   - a layout grid — use CSS Grid or Flexbox, never a `<table>` with no headers;
   - a set of key–value pairs (label above value, specification lists) — use
     `<dl>` with `<dt>`/`<dd>`;
   - a single column of records — use `<ul>`;
   - a timeline or flow — use an ordered list.

   Reaching for a table with `role="presentation"` to satisfy a layout is the
   inverse error, and it is worse: the semantics are gone if anyone later adds
   headers.

2. **Build the simplest correct table: a `<caption>`, `<th>` cells with
   `scope`, and no ARIA.**

   ```html
   <!-- Fails SC 1.3.1: header cells are <td>, so no cell can be tied to them -->
   <table>
     <tr><td>Region</td><td>Q1</td><td>Q2</td></tr>
     <tr><td>North</td><td>10</td><td>12</td></tr>
   </table>

   <!-- Passes: caption names the table, scope ties every cell to its axes -->
   <table>
     <caption>Revenue by region, in thousands</caption>
     <thead>
       <tr>
         <th scope="col">Region</th>
         <th scope="col">Q1</th>
         <th scope="col">Q2</th>
       </tr>
     </thead>
     <tbody>
       <tr>
         <th scope="row">North</th>
         <td>10</td>
         <td>12</td>
       </tr>
     </tbody>
   </table>
   ```

   `scope="col"` on the column headers, `scope="row"` on the row stub. That is
   the whole of SC 1.3.1 for most tables. Do not add `role="table"` to a real
   `<table>` — the element already carries the role.

3. **Name the table with `<caption>`, not with a heading that sits above it.**
   The caption is programmatically associated, so a screen reader announces it
   when the user enters the table, and it is the table's accessible name
   (SC 2.4.6 Headings and Labels). A visually identical `<h3>` immediately
   outside the table is not associated with it. When a design cannot show the
   caption, keep it in the markup and move it off-screen rather than deleting it.

4. **Use two axes only when the data has two axes.** For headers that apply to
   groups of columns or rows, `<th>` with `colspan` / `rowspan` plus `scope` is
   still enough. Reach for `id` + `headers` only when one cell is genuinely
   described by headers in more than one direction, and never use `headers` as a
   blanket replacement for `scope`.

   ```html
   <!-- A cell described by both a column header and a row header -->
   <th id="q1">Q1</th>
   <th id="north" scope="row">North</th>
   <td headers="q1 north">10</td>
   ```

   If a table is complex enough that you are reasoning about header resolution,
   split it into two simpler tables instead.

5. **Keep DOM order equal to reading order (SC 1.3.2).** A table is read in DOM
   order by anyone using assistive technology, and visually in row order by
   everyone else. Do not reorder with `flex`/`order`, absolute positioning, or a
   script that appends rows, because the two orders then disagree. Sorting
   *renders* rows in a new order — move them in the DOM rather than visually.

6. **Let a wide table scroll in two dimensions, and make that scroller
   reachable.** SC 1.4.10 Reflow asks the page to work at a 320 CSS px wide
   viewport (1280 px at 400% zoom) and at a 256 CSS px high viewport for
   horizontally-scrolling content — but it exempts content that requires
   two-dimensional layout for meaning, and a data table is the canonical
   example. So a data table *is allowed* to scroll sideways. What it is not
   allowed to do is become unreachable: a scroll container with no focusable
   content cannot be scrolled by keyboard. Make the wrapper focusable and name
   it.

   ```html
   <!-- Fails SC 2.1.1 in practice: nothing focusable, so no way to scroll
        it with the keyboard, and no indication that it scrolls -->
   <div class="table-wrap" style="overflow-x:auto">…</div>

   <!-- Passes: the region is reachable with Tab and has a name -->
   <div class="table-wrap" style="overflow-x:auto"
        tabindex="0" role="region" aria-label="Revenue by region">
     <table>…</table>
   </div>
   ```

   Do not confuse this with the page itself: the surrounding page must still
   reflow. Only the table is exempt.

7. **Never reflow a table by breaking its semantics.** `display: block` (or
   `display: grid`) on `table`, `thead`, `tbody`, `tr`, or `td` removes the
   table roles in browsers that implement the display-property mapping, and the
   accessible table disappears. The common "responsive table" recipe that sets
   `td { display: block }` and injects the header text with `::before` ships the
   visual result and destroys the data. If the design demands cards on small
   screens, render a real list (or a second, real table) and hide one of them
   with `hidden`, not with CSS that leaves both in the accessibility tree.

## Verify

Table checks split between the automatic part and the judgement part. The DOM
audit below finds structure problems; only listening to a screen reader tells
you whether a cell is announced with the right headers, and that needs a human.

```js
// Structural audit. Run on any page that renders a data table.
for (const table of document.querySelectorAll('table')) {
  const caption = table.querySelector(':scope > caption');
  const headers = [...table.querySelectorAll('th')];
  const unlinked = headers.filter(
    (th) =>
      !th.hasAttribute('scope') &&
      !(th.id && table.querySelector(`[headers~="${th.id}"]`)) &&
      !th.closest('tr')?.querySelector('th'),
  );
  const brokenByDisplay = [...table.querySelectorAll('thead,tbody,tfoot,tr,td,th')].filter(
    (el) => getComputedStyle(el).display === 'block',
  );
  console.log({
    table: table.className || '(unnamed)',
    caption: caption?.textContent.trim() ?? 'MISSING',
    headers: headers.length,
    headersWithNoAxis: unlinked.length,
    cellsBrokenByDisplayBlock: brokenByDisplay.length,
  });
}
```

| Do this | Passing looks like | Criterion |
|---|---|---|
| Move cell to cell with the screen reader's table commands (NVDA `Ctrl`+`Alt`+arrows, VoiceOver `Ctrl`+`Option`+arrows) | every data cell is announced with its row and column header | 1.3.1 |
| Read the whole page top to bottom with no table commands | the order matches the visual order | 1.3.2 |
| Move keyboard focus to the end of the document | each wide table's scroll container is reachable with `Tab` | 1.4.10 |
| Zoom the browser to 400% at 1280 CSS px wide | the page reflows; a table may scroll, the page may not scroll sideways | 1.4.10 |
| Enter each data table | its caption is announced as the table's name | 2.4.6 |
| Check every `<th>` when the table has row headers | a cell reads as "North, Q1, 10" and not "10" | 1.3.1 |

Automated tooling catches the mechanical half: axe-core rules
`th-has-data-cells`, `scope-attr-valid`, `td-headers-attr`, and `table-duplicate-name`.
A green axe run is compatible with a completely unusable table, because only a
listener can tell you the headers resolve to the right cells.

## Failure modes

- **A table rendered from divs and CSS Grid.** Visually indistinguishable from a
  table, announced as an undifferentiated run of text. `role="table"`,
  `role="row"`, `role="columnheader"` exist, but use them only when a real
  `<table>` cannot be used, and never with a partial set of the required roles.
- **`scope="col"` on the row stubs too.** Every cell in the first column then
  resolves to a column header, and each row loses the header that identifies it.
  The row stub is `scope="row"`.
- **The heading-instead-of-caption swap.** A `<h3>` above the table looks like a
  caption and is not one; the table is entered with no name. Fix the markup
  rather than the design.
- **`display: block` on `td` to make the table "responsive".** The visual layout
  survives and the table semantics do not. Card layouts need a real list or a
  second real markup structure, chosen in the markup, not by CSS alone.
- **Empty header cells used as spacers.** The screen reader announces "blank" as
  the header for every cell beneath, which is the same as no header. Merge or
  remove the spacer column.
- **`aria-hidden="true"` on `<th>` elements** to silence a duplicate visual
  header row. The row looks fine and every cell below it is orphaned; use a
  caption or visually-shifted text instead.
- **`role="presentation"` added to quiet a linter.** On a real data table it
  removes the relationship that SC 1.3.1 requires, and the linter goes green.
- **Reordering rows with CSS to keep a sort stable in the DOM.** DOM order is
  the reading order (SC 1.3.2); if the sort changes what a user reads, it must
  change the DOM.
