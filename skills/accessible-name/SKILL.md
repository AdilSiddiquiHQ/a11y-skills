---
name: accessible-name
description: Use when adding or reviewing alt text, icon buttons, links, or form control labels, when a control is announced as "button" or "link", or when a visible label and an aria-label disagree.
---

# Accessible names and alt text

**Criteria:** SC 1.1.1 Non-text Content, SC 1.3.1 Info and Relationships, SC 1.3.6 Identify Purpose, SC 2.4.4 Link Purpose (In Context), SC 2.5.3 Label in Name, SC 4.1.2 Name, Role, Value, SC 3.3.2 Labels or Instructions

Where a name is missing, a screen reader announces the role and nothing else —
"button", "edit text", "image". Give every control, link and image a name that is
announced usefully and that matches what is visible on screen; that is the whole
skill.

## When to use

- An icon-only button announces as "button".
- A screen reader reads "link link link" or "Read more" ten times.
- Writing `alt` text, or reviewing someone else's.
- Choosing between `aria-label`, `aria-labelledby`, `<label>`, and `title`.

## The name computation, in order

The first of these that produces text wins. Anything later is only a fallback —
never a reason to add an earlier one "as well".

1. `aria-labelledby` — points at the element(s) whose text is the name. Use it
   when the label already exists elsewhere on the page.
2. `aria-label` — literal text. Use it only when there is nothing visible to
   reference.
3. The native source: `<label>` for form controls, `alt` for `<img>`, text
   content for `<button>` and `<a>`, `<legend>` for `<fieldset>`, `<caption>`
   for `<table>`.
4. `title` — last resort. It is not reliably exposed, is not keyboard-reachable
   on all elements, and vanishes on touch.
5. `placeholder` — not a label. It disappears as soon as the user types, so it
   fails SC 3.3.2 for a field that needs one.

```html
<!-- Best: a real, visible label, referenced implicitly -->
<label for="email">Email</label>
<input id="email" type="email" autocomplete="email">

<!-- Fine when the visible text lives elsewhere and must not be duplicated -->
<h2 id="billing">Billing address</h2>
<fieldset aria-labelledby="billing"> … </fieldset>

<!-- Last resort, and it must match the visible label — see SC 2.5.3 below -->
<button type="button" aria-label="Close"><svg …></svg></button>
```

## Label in Name

The accessible name must **contain** the visible label text, word for word
(SC 2.5.3). Someone using voice control says what they see; if they say
"click Search" and the accessible name is "Submit", nothing happens.

```html
<!-- Fails SC 2.5.3: the visible word "Search" is not in the name -->
<button aria-label="Submit query">Search</button>

<!-- Passes: the name starts with the visible text -->
<button aria-label="Search products">Search</button>
```

## Alt text, as a decision

| The image… | `alt` should be | Example |
|---|---|---|
| is decoration (a divider, a background flourish) | `alt=""` — empty, present, no space | `<img src="swoosh.svg" alt="">` |
| is a functional icon inside a link or button | the **function**, not the shape | `<img src="print.svg" alt="Print this page">` |
| conveys information | the **content**, as a phrase | `<img src="chart.png" alt="Revenue rose 18% in Q3">` |
| is complex (a chart, a diagram) | a short `alt`, plus the detail in nearby text | see the failure modes |
| is an image of text | replace it with real text | — |
| is inside a link whose text already describes it | `alt=""`, so the name is not doubled | `<a href="/x"><img alt=""><span>Read the report</span></a>` |

The test that decides most cases: **would a sighted user lose information if the
image were not there?** If yes, describe it. If no, empty.

## Procedure

1. List every `<img>`, `<svg>`, `<button>`, `<a>` and form control in the
   component.
2. For each, ask what the name currently computes to, using the order above.
   Not what attributes are present — what the *result* is.
3. Fix, in this preference order: **native visible text → real label →
   `aria-labelledby` → `aria-label`**. Prefer the option that keeps one source
   of truth.
4. Delete redundant attributes. If a `<button>` already contains the word
   "Save", an `aria-label="Save"` adds a second thing to keep in sync for no
   benefit.
5. Identify the purpose of components, icons and regions, not only their content
   (SC 1.3.6, AAA). A name says what a thing is; purpose says what it is *for*, and
   SC 1.3.6 expects the purpose of user-interface components, icons and regions to be
   programmatically determinable. In practice: `aria-label="Search"` rather than a
   magnifier glyph with no name; `<main>` rather than an unlabelled `<div>`; and the
   same names used consistently across the product (see the `predictable-context`
   skill). The common failure is an icon that is *decorative by accident* — the
   designer knows it means "download", the markup says nothing, and the meaning lives
   only in the visual.

   ```html
   <!-- Fails SC 1.3.6 — purpose is in the glyph only -->
   <span class="icon icon-download"></span>

   <!-- Passes — the purpose is in the markup, and the glyph is hidden from AT -->
   <button type="button" aria-label="Download invoice">
     <span class="icon icon-download" aria-hidden="true"></span>
   </button>
   ```

## Verify

```js
// In a browser: read the computed name, do not inspect the attributes.
const name = (el) =>
  el.getAttribute('aria-label') ||
  (el.getAttribute('aria-labelledby')
    ? el.getAttribute('aria-labelledby').split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim()).join(' ')
    : null) ||
  el.textContent.trim() ||
  el.getAttribute('title') ||
  '';
// Every interactive element must yield a non-empty, non-generic string.
```

Then confirm by ear if you can — or by reading the accessible tree in browser
devtools. `aria-label="button"` passes the code check and fails the human one.

## Failure modes

- **`alt="image"` / `alt="icon"` / `alt="logo"`.** These describe that an image
  exists. They pass a linter and mislead a user.
- **Missing `alt` versus `alt=""`.** An empty alt is correct for decoration;
  a *missing* alt makes the screen reader read the filename. Deleting the
  attribute to "fix" a warning is the wrong direction.
- **Long alt text on a complex chart.** Screen reader users cannot pause inside
  an `alt` string. Put a one-line summary in `alt` and the detail in adjacent
  text that everyone can read.
- **`aria-label` on a `<div>` with no role.** A name on a nameless element is
  ignored. The role has to come first.
- **Ten "Read more" links.** Each name must identify its own target, or none of
  them is usable out of context (SC 2.4.4).
- **`title` as the only label.** Not reachable by keyboard on most elements, not
  shown on touch, and truncated in tooltips.
- **Empty name that looks non-empty.** An `<a>` containing only an `<svg>`
  with no `alt`, `aria-label`, or `aria-hidden` computes to the file name or to
  nothing at all.
