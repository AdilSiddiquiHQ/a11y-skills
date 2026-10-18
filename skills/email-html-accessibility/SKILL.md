---
name: email-html-accessibility
description: Use when designing or building an HTML email or newsletter, when a template must survive Gmail and Outlook, or when images are blocked by default and the message stops making sense.
---

# Email HTML accessibility

**Criteria:** SC 1.3.1 Info and Relationships, SC 1.4.3 Contrast (Minimum), SC 1.1.1 Non-text Content, SC 2.4.4 Link Purpose (In Context)

An HTML email is the least forgiving rendering environment there is: no reliable
JavaScript, CSS that gets stripped, layout forced through tables, and images
blocked until the recipient opts in. Design for images-off and CSS-light first,
because that is the state many people actually read. The failure that survives
every preview is a layout table announced as a data table around the whole
message.

## When to use

- Building an HTML email, newsletter, or transactional message.
- "It looks fine in the preview but breaks in Outlook."
- "Images are blocked by default — what does the reader get?"
- Reviewing an email template for real clients rather than a browser.

## Procedure

1. **Design for images-off.** Many clients block images until the user allows
   them, and the alt text is all that shows. Write alt text that reads as
   content, and style it (colour, font size) so it is legible if it appears.

2. **Use real semantics where they survive.** Prefer headings, paragraphs and
   lists to styled `<div>`s. Wrap layout tables in `role="presentation"` so they
   are not announced as data tables. Keep genuine data tables as tables, with
   `<th scope>` and a `<caption>` (SC 1.3.1).

   ```html
   <!-- Fails SC 1.3.1 — a layout table announced as "table, 1 column, 12 rows"
        around the whole email — and SC 1.1.1 — a text image with no alt,
        inside a link with no name -->
   <table width="600">
     <tr><td>
       <img src="logo.png">
       <a href="https://example.com/sale"><img src="sale-banner.png"></a>
     </td></tr>
   </table>
   <p style="color:#999999;background-color:#ffffff">
     <a href="https://example.com/sale">Click here</a> for the sale.
   </p>
   ```

   ```html
   <!-- Passes SC 1.3.1 — the layout table is presentational — and SC 1.1.1 —
        every image has alt, and a decorative rule would use alt="" -->
   <table role="presentation" width="600" cellpadding="0" cellspacing="0">
     <tr><td>
       <img src="logo.png" width="120" height="32" alt="Example Co.">
       <h1 style="color:#1f2933;font-size:24px">Autumn sale</h1>
     </td></tr>
   </table>
   <p style="color:#595959;background-color:#ffffff">
     <a href="https://example.com/sale" style="color:#1a4fd6">Shop the autumn sale</a>
   </p>
   ```

3. **Set text and background together, and check the ratio (SC 1.4.3).** Body
   text needs **4.5:1**; large text — at least 24px, or at least 18.66px bold —
   needs **3:1**. `#999999` on `#ffffff` is about 2.85:1 and fails; `#595959` on
   `#ffffff` is about 7:1 and passes. Always write `color` and `background-color`
   in the same rule, because clients that strip one leave you with invisible text.

4. **Expect dark mode.** Some clients recolour or invert your palette. Set
   `color-scheme` so the client knows the message can adapt, and test in a
   client's dark theme rather than assuming your light-mode ratios hold.

5. **Write link text that means something on its own (SC 2.4.4).** "Click here"
   and "Read more" tell a screen reader user nothing, and a user tabbing through
   links hears only the link text. Name the destination.

6. **Build buttons from a real link, not an image.** A background colour with a
   solid fallback border survives CSS stripping; an image of a button disappears
   when images are blocked and is an image of text. Make sure the link is a
   single `<a>` and that any image inside it has alt.

7. **Keep one column and let the DOM order be the reading order.** Avoid `order`
   or floats that reverse columns, and avoid absolutely positioned blocks that
   move around the reading order when a screen reader walks the source.

8. **Test in real clients, not just a browser.** Save the rendered HTML or the
   `.eml` and open it, then run the checks in **Verify**.

## Verify

| Do this | Passing looks like | Criterion |
|---|---|---|
| Load with images blocked | the message is still understandable from alt text | 1.1.1 |
| Turn CSS off and read the source order | it reads top-to-bottom in a sensible order | 1.3.1 |
| Read with a screen reader | headings and lists are announced; the layout table is not | 1.3.1 |
| List the links on their own | each says where it goes | 2.4.4 |
| Measure text and links against the real background, light and dark | at least 4.5:1 body, at least 3:1 large | 1.4.3 |

```js
// Assert the two things that break most often in email: alt text and link names.
for (const img of document.querySelectorAll('img')) {
  if (img.getAttribute('alt') === null) console.error('image missing alt:', img.src);
}
for (const a of document.querySelectorAll('a')) {
  const name = (a.textContent + (a.querySelector('img')?.alt ?? '')).trim();
  if (!name) console.error('link has no accessible name:', a.href);
  if (/^(click here|read more|more|shop)$/i.test(name)) console.warn('non-descriptive link:', name);
}
// A layout table must not be exposed as a data table.
for (const t of document.querySelectorAll('table')) {
  if (!t.querySelector('th') && t.getAttribute('role') !== 'presentation') {
    console.warn('table with no headers and no role="presentation"', t);
  }
}
```

## Failure modes

- **A layout table without `role="presentation"`.** Every screen reader announces
  "table, 2 columns, 12 rows" around content that is not a table (SC 1.3.1).
- **Missing or junk alt text** — `alt="image"`, `alt="banner.png"`, or no `alt`
  at all. The browser or client may fall back to reading the filename (SC 1.1.1).
- **Text baked into images.** With images blocked the message loses its headings
  and calls to action, and live text has been replaced by an image of text.
- **Grey-on-white body text such as `#999999`.** It looks tasteful in the design
  tool and fails 4.5:1 (SC 1.4.3), often badly after a client's dark-mode
  inversion.
- **"Click here" links.** They pass every visual review and fail SC 2.4.4 for
  anyone reading links out of context.
- **White text over a background image, or a background colour that gets
  stripped.** The text becomes invisible in the clients that strip backgrounds.
- **Floats or absolute positioning that change reading order.** The visual
  columns look right; the source is read in a different sequence.
- **Overcorrection — `role="presentation"` on a real data table, or deleting all
  images.** It removes the headers from a genuine table, or strips legitimate
  imagery rather than writing alt text for it.
