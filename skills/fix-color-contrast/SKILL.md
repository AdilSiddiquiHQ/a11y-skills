---
name: fix-color-contrast
description: Use when text or a UI control is hard to read against its background, or when a palette needs a fix that keeps the brand colour while passing WCAG contrast minimums.
---

# Fix colour contrast

**Criteria:** SC 1.4.3 Contrast (Minimum), SC 1.4.11 Non-text Contrast, SC 1.4.1 Use of Color

Make text and UI components meet the WCAG 2.2 contrast minimums **without
replacing the brand colour** — adjust lightness, keep the hue.

## When to use

- A contrast checker (axe, Lighthouse, a design review) reports a failure.
- A palette is being chosen and you want the thresholds applied up front.
- Someone asks "is this grey readable on white?"

## The thresholds, exactly

Do not guess these. They are the whole task:

| What | Minimum | Criterion |
|---|---|---|
| Body text under 24px | **4.5:1** | SC 1.4.3 Contrast (Minimum), AA |
| Large text: ≥24px, or ≥18.66px **bold** | **3:1** | SC 1.4.3, AA |
| Icons, borders, focus rings, chart lines, form control outlines | **3:1** | SC 1.4.11 Non-text Contrast, AA |
| Any text (stricter, optional) | **7:1** | SC 1.4.6 Contrast (Enhanced), AAA |

Anchors worth memorising, on white:

| Foreground on `#FFFFFF` | Ratio | Verdict |
|---|---|---|
| `#000000` | 21:1 | passes everything |
| `#767676` | 4.54:1 | the **lightest grey that passes** AA for body text |
| `#949494` | 3.03:1 | passes non-text only; **fails** as body text |
| `#B0B0B0` | ~2.1:1 | fails everything for text |

## Procedure

1. **Compute the ratio.** Relative luminance, per WCAG's definition — do not
   eyeball it, and do not use a "luminosity" helper from a plotting library,
   which is a different formula and gives wrong answers near the threshold.

   ```js
   const channel = (c) => {
     const s = c / 255;
     return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
   };
   const luminance = ([r, g, b]) =>
     0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
   const ratio = (a, b) => {
     const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
     return (hi + 0.05) / (lo + 0.05);
   };
   ratio([118, 118, 118], [255, 255, 255]); // 4.54
   ```

2. **Decide which side to move.** Prefer darkening the foreground over
   lightening the background: it preserves the background's role in the design
   and produces the smallest visual change. Only move the background if the
   foreground colour is fixed by brand.

3. **Search along the lightness axis, keeping hue and saturation.** Walk the
   foreground toward black in small steps and stop at the **first** value that
   passes. Stopping at the first passing value keeps the colour as close to the
   original design intent as possible.

4. **Check the states you forgot.** A link that passes at rest fails on
   `:hover`, `:visited` or against a `.selected` row background. Enumerate
   states and re-run the check on each pair.

5. **Never fix contrast by removing the colour.** If the only way to pass is to
   make two states identical, the design needs a second cue — see below.

## Verify

```js
// Assert, do not eyeball. This is the check that goes in the test suite.
for (const [fg, bg, min] of [
  [[118, 118, 118], [255, 255, 255], 4.5],  // body text
  [[148, 148, 148], [255, 255, 255], 3.0],  // icon
]) {
  const r = ratio(fg, bg);
  console.log(r.toFixed(2), r >= min ? 'pass' : 'FAIL');
}
```

Also confirm the colour is not **the only** signal, which is a separate
criterion (SC 1.4.1 Use of Color):

```html
<!-- Fails SC 1.4.1: red text is the only thing marking the error -->
<p style="color:#c00">Enter a valid date</p>

<!-- Passes: an icon and a word carry the meaning, colour is decoration -->
<p style="color:#c00"><span aria-hidden="true">✕</span> Error: enter a valid date</p>
```

## Failure modes

- **Using a contrast tool's "close enough" rounding.** 4.49 is a failure. The
  threshold is not a guideline.
- **Checking only `#fff` backgrounds.** The same grey on a tinted surface
  (`#F6F8FA`, a zebra-striped row, a disabled field) is a different ratio.
  Enumerate the real backgrounds.
- **Testing large text as body text.** A 24px heading is allowed 3:1. Flagging
  it as a failure wastes the reviewer's time and erodes trust in the report.
- **Forgetting translucent overlays.** `rgba(0,0,0,.6)` over an image has no
  single ratio; it depends on the pixel underneath. Either sample the worst
  case or state that it cannot be determined statically.
- **Applying "contrast" to a logo or a photograph.** Logos and incidental
  imagery are exempt from SC 1.4.3. Do not report them.
- **Making the focus ring pass contrast and then removing it.** SC 2.4.7 is
  separate and stricter in practice: an indicator that exists but cannot be
  seen is a failure of its own.
