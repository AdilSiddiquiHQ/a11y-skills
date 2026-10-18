---
name: headings-and-landmarks
description: Use when a screen reader cannot navigate the page by heading, when heading levels are skipped or headings are styled divs, when there is no way past the navigation, or when page regions are unlabeled.
---

# Headings and landmarks

**Criteria:** SC 1.3.1 Info and Relationships, SC 2.4.1 Bypass Blocks, SC 2.4.6 Headings and Labels, SC 2.4.10 Section Headings

Correct structure is the cheapest navigation a page can offer: a screen reader user
jumps by heading and by landmark instead of reading the document from the top. The
mistake that matters most is a heading that *looks* like a heading — bold, larger,
spaced — but is a `div` or a `span`, because it is invisible to every heading list.
The second is a landmark soup: real `<nav>` and `<aside>` elements with no
accessible name, so "navigation, navigation, navigation" tells the user nothing.

## When to use

- "This page reads fine but I can't jump between sections in the screen reader."
- A design system ships `<div class="heading-lg">` instead of an `<h2>`.
- Heading levels jump from `h1` to `h4`, or every page opens on the site logo.
- There are three `<nav>` elements and none of them has a name.
- A long page with no skip mechanism to the main content.

## Procedure

1. **Mark up real headings.** SC 1.3.1 requires that structure conveyed visually is
   also conveyed programmatically, and SC 2.4.6 requires that the heading text
   describe its topic or purpose. A heading is `<h1>`–`<h6>`. A `role="heading"`
   with `aria-level` is the fallback only when no heading element will do, because
   the platform already carries the semantics, the keyboard behavior and the
   heading list for you.

   ```html
   <!-- Fails SC 1.3.1 — styled to look like a heading, exposed as nothing -->
   <div class="text-2xl font-bold">Shipping address</div>

   <!-- Passes — same visual weight, and the heading list sees it -->
   <h2 class="text-2xl font-bold">Shipping address</h2>
   ```

2. **Nest headings to match the outline.** WCAG does not require consecutive
   levels, so a lone `h3` is not a failure of SC 1.3.1 by itself. It does require
   the markup to represent the structure, so a `<h4>` under an `<h1>` misrepresents
   nesting and breaks heading jump and, at AAA, the sectioning SC 2.4.10 is asking
   for. Fix the level to match the real nesting rather than restyling the tag.

   ```html
   <!-- Fails SC 1.3.1 — h4 claims a nesting that does not exist -->
   <h1>Checkout</h1>
   <h4>Billing address</h4>

   <!-- Passes — the level mirrors the document structure -->
   <h1>Checkout</h1>
   <h2>Billing address</h2>
   ```

3. **Give every landmark a name when there is more than one of its type.** SC 1.3.1
   covers landmark structure and SC 2.4.6 covers the label. One `<main>` per page;
   label repeat offenders with `aria-label` or `aria-labelledby`.

   ```html
   <!-- Fails SC 2.4.6 — three navigations, indistinguishable in a rotor or
        landmarks list -->
   <nav>…</nav>
   <nav>…</nav>
   <nav>…</nav>

   <!-- Passes — each landmark announces its own name -->
   <header>…</header>
   <nav aria-label="Primary">…</nav>
   <nav aria-label="Breadcrumb">…</nav>
   <main id="main" tabindex="-1">…</main>
   <aside aria-label="Related articles">…</aside>
   <footer>…</footer>
   ```

   A `<nav>` in the `<header>` and a `<nav>` in the `<footer>` still both need names
   if a user can reach both. `<section>` and `<form>` only become landmarks when
   they have an accessible name; an unnamed `<section>` is not a landmark at all.

4. **Satisfy SC 2.4.1 Bypass Blocks.** Blocks of content repeated across pages — the
   header, the nav — must be bypassable. Either mechanism qualifies: a skip link
   (see the `skip-links` skill) or properly marked landmarks and headings. Landmarks
   alone satisfy the criterion; a skip link is still the strongest UX, because it is
   visible and works regardless of which assistive technology is running.

5. **Use headings and section elements for structure, not for font size.** SC 2.4.10
   (AAA) expects section headings to organize content. If you reach for `h5` because
   `h5` is the size you want, you have inverted the relationship: style the heading,
   do not tag-soup the design.

6. **Do not use headings for non-heading emphasis.** A pull quote, a product price,
   or a card's button label is not a section heading. `role="heading"` on a `<p>`
   that is really a label pollutes the heading list with items that go nowhere.

## Verify

Turn the DOM into the two lists the user actually navigates by, and read them for
sense. This is a judgement call, not an automated one — a heading that is
semantically valid can still be a useless label.

```js
// Heading outline, indented by level. Read it as the screen reader lists it.
const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')]
  .map((h) => {
    const level = Number(h.getAttribute('aria-level') || h.tagName[1]);
    const name = h.getAttribute('aria-label') || h.textContent.trim().replace(/\s+/g, ' ');
    return '  '.repeat(Math.max(level - 1, 0)) + `${'h'.repeat(1)}${level} ${name.slice(0, 60)}`;
  });
console.log(headings.join('\n'));
```

```js
// Landmark list, with a flag for the unnamed repeats that fail SC 2.4.6.
const landmarks = [...document.querySelectorAll(
  'header,nav,main,aside,footer,form,section,[role="banner"],[role="navigation"],[role="main"],[role="complementary"],[role="contentinfo"],[role="region"],[role="search"]'
)].map((el) => {
  const role = el.getAttribute('role') || el.tagName.toLowerCase();
  const name = el.getAttribute('aria-label') ||
    (el.getAttribute('aria-labelledby')
      ? document.getElementById(el.getAttribute('aria-labelledby'))?.textContent.trim()
      : '');
  return { role, name: name || null };
});
const byRole = {};
for (const { role, name } of landmarks) (byRole[role] ??= []).push(name);
for (const [role, names] of Object.entries(byRole)) {
  if (names.length > 1 && names.some((n) => !n)) {
    console.warn(`SC 2.4.6: ${names.length} x ${role}, ${names.filter((n) => !n).length} unnamed`);
  }
}
```

Keyboard walkthrough: in NVDA, JAWS or VoiceOver, press the heading-navigation key
(`H` / `H`, or the VoiceOver rotor with `VO`+`U`) and confirm you can reach every
section with a meaningful name in document order. Tab to the first element and
confirm the skip mechanism works before doing anything else.

## Failure modes

- **Styled-text headings.** `<div class="h2">`, `<span class="title">`, or styled
  `<p>` used for visual hierarchy. Linters that only check "outline starts at h1"
  pass it; the heading list is empty.
- **Heading levels chosen by font size.** The designer wanted 20px, so the developer
  reached for `<h5>`. The outline now lies about nesting. SC 1.3.1 is about
  structure, not type scale.
- **Landmark soup.** Wrapping every sidebar widget in `<nav>` or `<aside>` with no
  name. This passes an axe landmark check and makes the rotor unusable. Fewer, named
  landmarks beat many anonymous ones.
- **The logo-only `h1` on every page.** A template puts the site name in the `h1`
  and the page's real title in an `h2`. Every page's first heading is the brand, so
  heading navigation can never answer "what is on this page?".
- **Two `<main>` elements, or `<main>` nested inside another `<main>`.** Duplicate
  `main` landmarks make "skip to main" ambiguous and confuse a screen reader's
  region list.
- **Overcorrection: deleting visible headings to satisfy a rule.** Removing an `h3`
  that carried a visible "Related" label, or downgrading a genuine section to plain
  text, removes structure the user had. If it is visually a heading, it is a heading.
- **Overcorrection: adding `role="heading"` everywhere.** Applying
  `role="heading"` to labels, table captions and card titles floods the heading list
  with noise and is often paired with a wrong `aria-level`, which is worse than
  leaving them alone.
