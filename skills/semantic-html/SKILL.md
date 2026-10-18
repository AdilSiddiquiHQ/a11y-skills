---
name: semantic-html
description: Use when a screen reader announces no list, no list length, or no definition list; when a list, definition list, or heading is built from div, p or span elements; or when bold paragraphs are used where headings belong.
---

# Semantic HTML

**Criteria:** SC 1.3.1 Info and Relationships, SC 4.1.2 Name, Role, Value

The elements are the accessibility API. `<ul>` gives a screen reader the role, the
item count, and "list, 12 items" on entry; a `<div>` with the same styling gives it
nothing. Almost every rule in this area is the same rule in a costume: the visual
structure exists, the programmatic structure does not, and SC 1.3.1 requires the two
to agree.

This skill covers lists, definition lists, and text that looks like a heading but is
not. Headings and landmarks have their own skill (`headings-and-landmarks`).

## When to use

- A screen reader announces "link" where sighted users see a bulleted list, or
  never announces an item count.
- A list is `<div class="item">` repeated inside `<div class="list">`.
- A `<dt>` or `<dd>` sits outside a `<dl>`, or a `<li>` sits outside a `<ul>`/`<ol>`.
- A "heading" is a `<p>` with `font-weight: bold` and a larger size.
- axe reports `list`, `listitem`, `definition-list`, `dlitem` or `p-as-heading`.
- A design system ships `list-style: none` on every `<ul>`.

## Procedure

1. **Use the element whose job it is.** SC 1.3.1 is about relationships conveyed
   with markup, and SC 4.1.2 is about the role being exposed. The native element
   supplies both. Reach for ARIA only when no element fits.

   ```html
   <!-- Fails SC 1.3.1 — no role, no item count, no list navigation -->
   <div class="nav-list">
     <div class="nav-item"><a href="/pricing">Pricing</a></div>
     <div class="nav-item"><a href="/docs">Docs</a></div>
   </div>

   <!-- Passes — "list, 2 items", and a screen reader can step item by item -->
   <ul class="nav-list">
     <li><a href="/pricing">Pricing</a></li>
     <li><a href="/docs">Docs</a></li>
   </ul>
   ```

   Reset the browser's bullets in CSS, not by changing the element. A `<li>` is not
   a list item without its container, and axe's `listitem` rule is right to flag one
   that has no `<ul>`, `<ol>` or `<menu>` parent.

2. **Keep the list role when you remove the markers.** Safari 16 and earlier (and
   therefore every VoiceOver user on those versions) drops the list semantics from
   a `<ul>` that has `list-style: none` — the styling change is treated as a
   deliberate removal of the list. Adding `role="list"` restores it and costs
   nothing anywhere else.

   ```html
   <!-- Announced as a list in Chrome and Firefox, as plain text in Safari -->
   <ul style="list-style: none">
     <li>One</li>
   </ul>

   <!-- Passes everywhere: the role is stated rather than inherited -->
   <ul role="list" style="list-style: none">
     <li>One</li>
   </ul>
   ```

   Only do this where you actually removed the markers. Adding `role="list"` to every
   list is noise; the point is to replace the semantics you deleted.

3. **Use `<dl>` for term/description pairs, and nothing else.** `<dl>` means "a list
   of associations": one or more `<dt>` naming something, followed by one or more
   `<dd>` describing it. It is the correct markup for a FAQ, a glossary, a
   spec/property table, or a set of metadata labels and values.

   ```html
   <!-- Fails SC 1.3.1 — the pairing between label and value is only visual -->
   <div class="meta"><span class="label">Status</span><span class="value">Open</span></div>

   <!-- Passes — the pairing is in the markup and survives without CSS -->
   <dl class="meta">
     <dt>Status</dt>
     <dd>Open</dd>
   </dl>
   ```

   A `<dl>` is not a two-column layout tool. If there is no name/description
   relationship, it is a table (see `data-table`) or a plain list.

4. **Do not use a `<dl>` wrapper to satisfy a linter.** Grouping each pair in its
   own `<dl>` inside a `<div>` — a common React pattern — produces a run of
   one-pair definition lists. It is valid, but a screen reader user hears "definition
   list, 1 item" repeatedly rather than one list of ten. Prefer one `<dl>` with all
   the pairs, and use valid wrapper `<div>`s around each group only when the tooling
   forces it.

5. **A paragraph is not a heading.** SC 1.3.1 requires structure to be
   programmatic, and `p-as-heading` looks for a `<p>` that is visually styled like a
   heading while adjacent text is plain. If it looks like a heading, it is a heading:
   use `<h1>`–`<h6>` or `role="heading"` with `aria-level`.

   ```html
   <!-- Fails — bold, larger, and invisible to every heading list -->
   <p style="font-size: 1.5rem; font-weight: 700">Shipping address</p>

   <!-- Passes — same appearance, present in the heading list -->
   <h2 style="font-size: 1.5rem; font-weight: 700">Shipping address</h2>
   ```

6. **Do not rebuild roles that already exist.** `role="list"` on a `<ul>` that still
   has its markers, `role="listitem"` on an `<li>`, `role="navigation"` on a
   `<nav>` — each is a second, hand-maintained copy of something the element already
   exposes. When the two disagree, the ARIA wins and the page breaks in a new way.

## Verify

Read the shape of the document as the accessibility tree sees it. A count of zero in
the first list is the finding that matters; the second check finds paragraphs that
were only ever headings visually.

```js
// Real list containers, their items, and the definition lists.
const lists = [...document.querySelectorAll('ul,ol,menu')];
console.log('list containers:', lists.length);
for (const l of lists) {
  const items = l.querySelectorAll(':scope > li').length;
  const stripped = getComputedStyle(l).listStyleType === 'none';
  console.log(
    `  ${l.tagName.toLowerCase()} ${items} items` +
      (stripped && l.getAttribute('role') !== 'list'
        ? '  <- markers removed with no role="list" (Safari drops the list)'
        : '')
  );
}

const dls = [...document.querySelectorAll('dl')];
console.log('definition lists:', dls.length);
for (const dl of dls) {
  const orphans = [...dl.children].filter(
    (c) => !['DT', 'DD', 'DIV', 'SCRIPT', 'TEMPLATE'].includes(c.tagName)
  );
  if (orphans.length) console.log(`  unexpected child: ${orphans.map((c) => c.tagName).join(', ')}`);
  const stranded = dl.querySelectorAll(':scope > dt + dt, :scope > dd + dd').length;
  if (stranded) console.log(`  ${stranded} dt/dd with no counterpart`);
}

// A paragraph pretending to be a heading: bold, bigger than its neighbours.
for (const p of document.querySelectorAll('p,div,span')) {
  const s = getComputedStyle(p);
  const parentSize = parseFloat(getComputedStyle(p.parentElement).fontSize);
  if (parseFloat(s.fontWeight) >= 600 && parseFloat(s.fontSize) > parentSize * 1.2) {
    console.log(`possible heading: <${p.tagName.toLowerCase()}> "${p.textContent.trim().slice(0, 40)}"`);
  }
}
```

```js
// Items whose container role is not actually exposed.
for (const li of document.querySelectorAll('li')) {
  const p = li.parentElement;
  const ok = ['UL', 'OL', 'MENU'].includes(p.tagName) || p.getAttribute('role') === 'list';
  if (!ok) console.log(`li inside <${p.tagName.toLowerCase()}> — no list role`);
}
```

Keyboard and screen reader walkthrough: in VoiceOver or NVDA, move through the
navigation and step item by item. Confirm the count is announced, that Safari
(on macOS or iOS) announces the list at all when markers are hidden, and that a
glossary or metadata block is announced as a definition list rather than read as a
run of unconnected text.

`list-style: none` is one of the very few places where a purely visual CSS
declaration changes the accessibility tree, which is why it is worth a convention in
the codebase rather than a one-off fix.

## Failure modes

- **Div-soup lists.** `<div class="list">` and `<div class="item">` with flexbox.
  Visually identical, and every screen reader user loses the role, the item count
  and the item-to-item navigation. This is the single most common finding in this
  area and the cheapest to fix.
- **`list-style: none` without `role="list"`.** Modern Chrome and Firefox keep the
  list semantics; Safari, on affected versions, does not. Reported as "Safari reads
  my list as plain text" and misdiagnosed as a Safari bug.
- **`<li>` with no list parent.** A React component returns `<li>` into a
  `<div class="items">`, or a `<ul>` is replaced by a fragment. The `listitem` rule
  fires because an item exists with nothing to be an item of.
- **`<dl>` as a layout primitive.** Using `<dt>`/`<dd>` for label/value pairs with
  no definitional relationship, or for a two-column grid. A screen reader announces
  definition-list semantics for something that is not one.
- **One `<dl>` per pair.** A wrapper component renders a fresh `<dl>` around every
  `<dt>`/`<dd>`, so a ten-item glossary is ten one-item lists. Valid HTML, wrong
  announcement.
- **Bold paragraphs as headings.** `p.as-heading` with a larger font. Invisible to
  heading navigation, and the `p-as-heading` rule exists precisely for it.
- **Overcorrection: ARIA on top of native elements.** `role="list"` on a normal
  `<ul>`, `role="navigation"` on `<nav>`, `role="listitem"` on `<li>`. Duplicated
  semantics drift from the real ones and break the moment the element changes.
- **Overcorrection: converting every `<p>` to a heading.** The verification script
  above reports candidates, not failures. A large pull quote or a card title is not
  a section heading; promoting it fills the heading list with entries that lead
  nowhere.
