---
name: page-title-and-language
description: Use when the browser tab or screen reader announces the wrong page, when every page shares one title, when a single-page app never updates the title, or when text is read aloud in the wrong language or accent.
---

# Page title and language

**Criteria:** SC 2.4.2 Page Titled, SC 3.1.1 Language of Page, SC 3.1.2 Language of Parts, SC 1.3.1 Info and Relationships

The title and the `lang` attributes are the two pieces of metadata a screen reader
consumes before it reads a single word, and both are trivial to ship wrong. The
failure that matters most is a single-page app whose `<title>` stays on the value
from first load, because every automated scanner sees a non-empty title and passes
it while the user hears the wrong page name on every route change.

## When to use

- The tab says "Home" or the app name on every route.
- A dynamic view (search results, a product, an invoice) has a static title.
- A screen reader reads an English word with a French or German pronunciation, or
  reads a French phrase with English phonetics.
- The document has no `lang`, or `lang="en"` on a page whose content is not English.
- Text is switched to right-to-left and the layout or punctuation breaks.
- An SPA route change updates the view and announces nothing.

## Procedure

1. **Put a title on every page, and make it specific and front-loaded
   (SC 2.4.2).** The title must describe the topic or purpose. Put the unique part
   first, because tab strips, screen reader lists and browser lists truncate:
   `Invoice 4821 — Acme Billing`, not `Acme Billing — Invoice 4821`.

2. **Update `document.title` on every route and view change (SC 2.4.2).** In an
   SPA the title is not re-derived by navigation. Set it where you set the view.
   Pair it with a focus move or a live-region announcement if the content changes,
   or the user is told the new name but stays on the old content.

   ```js
   // Fails SC 2.4.2 in an SPA — set once at startup and never again.
   document.title = 'Acme Billing';

   // Passes — each route owns its title, and the change is announced.
   function render(route) {
     document.title = `${route.title} — Acme Billing`;
     app.replaceChildren(route.view());
     main.focus(); // moves the reading position to the new content
   }
   ```

3. **Mark the language of the page on the root element (SC 3.1.1).** The value is a
   BCP 47 language tag. Without it, a screen reader guesses, and the guess is
   usually the user's default voice rather than the content's actual language.

   ```html
   <!-- Fails SC 3.1.1 — no language, so assistive technology guesses -->
   <html>

   <!-- Passes — the page language is declared in the markup, not by a plugin -->
   <html lang="en">
   ```

4. **Mark the language of parts that differ from the page (SC 3.1.2).** Every
   passage or phrase in a language other than the page's needs its own `lang` on the
   nearest containing element — the inline phrase, the quote, or the block. SC 3.1.2
   has an exception: a single word or phrase that a speaker would not distinguish,
   such as a proper noun or a term already standardized in the page's language, does
   not need a tag.

   ```html
   <!-- Fails SC 3.1.2 — a French quotation read with English phonetics -->
   <blockquote>
     La trahison des clercs is the phrase Benda made famous.
   </blockquote>

   <!-- Passes — the distinctive phrase carries its own language -->
   <blockquote>
     <span lang="fr">La trahison des clercs</span> is the phrase Benda made famous.
   </blockquote>
   ```

5. **Set direction when the language implies it (SC 1.3.1, SC 3.1.2).** `dir="rtl"`
   belongs on the element whose content is right-to-left; the `dir` attribute and
   the `lang` attribute are separate concerns, and a correct `lang` without `dir`
   produces reordered punctuation and mangled numbers.

   ```html
   <!-- Passes — language and direction travel together on the island -->
   <p lang="ar" dir="rtl">مرحبا بالعالم</p>
   ```

6. **Keep the structure beneath the title honest (SC 1.3.1).** The title names the
   page, but the page's real structure is carried by its landmarks and headings.
   When a route swaps the visible content, ensure the heading that names the new view
   is present and the landmarks are not duplicated.

7. **Do not rely on `<title>` alone as a label.** A button or frame that must be
   named uses `aria-label` or visible text, not the `title` attribute. The `title`
   attribute is not reliably announced and does not appear on touch devices.

## Verify

Check the three facts in the accessibility tree, per route, not once at load.

```js
// SC 2.4.2 and SC 3.1.1 — run after every route change, not only at startup.
const title = document.title.trim();
const lang = document.documentElement.lang;
const uniqueEnough = title.length > 0 && !/^(home|index|app|acme)$/i.test(title);
console.log({ title, lang, uniqueEnough });
if (!lang) console.warn('SC 3.1.1: no lang on <html>');
```

```js
// SC 3.1.2 — find text nodes whose language differs from the page but carries no
// lang attribute. This is a heuristic; confirm each hit by reading it aloud.
function unmarkedForeignText(root = document.body) {
  const pageLang = (document.documentElement.lang || '').split('-')[0].toLowerCase();
  const out = [];
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.trim();
        const inTagged = child.parentElement?.closest('[lang]');
        if (text && !inTagged) out.push({ text: text.slice(0, 60), lang: pageLang });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  };
  walk(root);
  return out;
}
console.log(unmarkedForeignText());
```

Read the title and language aloud with a screen reader: NVDA reads the title on
focus of the window and the document language determines the synthesizer voice.
Switching voices mid-sentence is the signal that `lang` is right or wrong; that
part is judgement, and no scanner makes it for you.

## Failure modes

- **The SPA title that never changes.** `index.html` ships `<title>Acme</title>` and
  nothing rewrites it. Axe reports a pass because the title is present and
  non-empty.
- **The title that only names the site.** Every route is `Acme` or `Acme Billing`.
  The title describes the *site*, not the page, which fails the "topic or purpose"
  part of SC 2.4.2 even though it is non-empty.
- **`lang` on `<html>` but nothing on foreign passages.** A mostly-English site
  quotes a German paragraph and a screen reader pronounces it as English. This is
  the SC 3.1.2 failure that ships most often, because the page-level tag is correct
  and the page-level check passes.
- **`lang="en-US"` mismatch, or an invalid tag.** `lang="eng"`, `lang="English"` or
  a two-letter tag on a language that needs a script subtag (`zh-Hans` vs `zh-Hant`)
  makes the synthesizer guess. Use a valid BCP 47 tag.
- **`dir` used without `lang`, or `lang` without `dir`.** Switching to `dir="rtl"`
  on an element but leaving the language English gives English pronunciation with
  RTL layout; the reverse gives the right voice with LTR layout and misplaced
  punctuation.
- **Overcorrection: wrapping every foreign proper noun.** Putting `lang="fr"` on
  "Paris" or `lang="de"` on a brand name in otherwise English prose makes the
  synthesizer stumble on the one word it would have read correctly. SC 3.1.2
  explicitly exempts single words and phrases that need no distinction.
- **Using the `title` attribute as the page's or control's name.** It is not
  reachable by keyboard or touch and is announced inconsistently, so it does not
  satisfy SC 2.4.2 or SC 1.3.1 in practice.
