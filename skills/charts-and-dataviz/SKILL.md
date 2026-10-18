---
name: charts-and-dataviz
description: Use when building or reviewing a chart, graph, dashboard, or data visualisation, when a canvas or SVG shows nothing to a screen reader, or when a series is distinguished by colour alone.
---

# Charts and data visualisation

**Criteria:** SC 1.1.1 Non-text Content, SC 1.4.1 Use of Color, SC 1.4.11 Non-text Contrast, SC 1.3.1 Info and Relationships

A chart is a picture until you give it words. `<canvas>` and `<svg>` draw pixels;
neither carries meaning for assistive technology unless you attach a text
equivalent and, for anything quantitative, the data behind it. The mistake that
matters most is shipping a beautiful chart whose accessible name is "chart" —
a label that names the widget and conveys none of the information.

## When to use

- "Our dashboard fails an audit because the graphs are images."
- Rendering with Chart.js, D3, Recharts, Highcharts, or a hand-rolled `<canvas>`.
- A series is only distinguishable by colour — red vs green, blue vs teal.
- Someone added `aria-label="Bar chart"` and considers the chart handled.

## Procedure

1. **Write the text alternative first, before the chart.** SC 1.1.1 Non-text
   Content requires an equivalent for non-text content, and for a chart the
   equivalent is the *finding*, not the artwork: the trend, the range, the
   outliers, and the values a reader needs. "A bar chart" is not an alternative;
   "Revenue rose from 10 to 12 thousand between Q1 and Q2, with the North region
   highest and flat elsewhere" is.

2. **Provide the underlying data in a real table, and associate it.** A chart is
   a rendering of a table (SC 1.3.1). Ship the table and give the chart a name
   that says the table is available.

   ```html
   <!-- Passes SC 1.1.1 and SC 1.3.1: name, short description, and the data -->
   <figure>
     <svg role="img" aria-labelledby="chart-t" aria-describedby="chart-d">
       <title id="chart-t">Revenue by region, Q1 and Q2</title>
       <desc id="chart-d">Revenue rose in every region; North is the highest.</desc>
       <!-- decorative shapes only; text lives in the table below -->
     </svg>
     <figcaption>Revenue by region, in thousands</figcaption>
   </figure>

   <table>
     <caption>Revenue by region, in thousands</caption>
     <thead>
       <tr><th scope="col">Region</th><th scope="col">Q1</th><th scope="col">Q2</th></tr>
     </thead>
     <tbody>
       <tr><th scope="row">North</th><td>10</td><td>12</td></tr>
       <tr><th scope="row">South</th><td>8</td><td>9</td></tr>
     </tbody>
   </table>
   ```

   When the table is long, put it behind a disclosure that *opens onto the
   table* — a link or button whose text names it, such as "View the data table"
   — rather than a collapsed container that no one can find.

3. **Handle `<canvas>` explicitly, because its internals are unreachable.**
   Anything drawn into a `<canvas>` is a bitmap: text painted on it cannot be
   selected, zoomed, or read by a screen reader. Give the canvas a role and a
   name, and give it fallback content so the no-canvas case still says
   something.

   ```html
   <!-- Fails SC 1.1.1: a screen reader sees nothing at all -->
   <canvas id="c" width="600" height="300"></canvas>

   <!-- Passes: named for AT, with the equivalent as fallback content -->
   <canvas id="c" width="600" height="300" role="img"
           aria-label="Revenue by region, Q1 and Q2"
           aria-describedby="chart-d">
     Revenue rose in every region; North is the highest at 12 thousand.
   </canvas>
   ```

   Never rely on "zoom in to read the axis labels" — that is an alternative for
   sighted users only, and it fails SC 1.1.1 for everyone else.

4. **Give SVG a `role` and an accessible name, and hide decorative markup.** An
   `<svg>` without `role="img"` may be walked as a tree of unnamed shapes; with
   it, the name is announced once. `<title>` supplies the name or the
   description depending on the reference; using both `aria-labelledby` and
   `aria-describedby` makes which is which explicit. Decorative paths,
   gradients, and gridlines get `aria-hidden="true"` and `focusable="false"`.

5. **Never distinguish a series by colour alone (SC 1.4.1).** A legend of colour
   swatches fails: a reader who cannot tell red from green cannot recover the
   meaning. Give each series a second channel — a direct label at the end of the
   line, a distinct marker shape, a dash pattern, or a pattern fill.

   ```html
   <!-- Fails SC 1.4.1: the only difference between the two lines is hue -->
   <line x1="0" y1="10" x2="100" y2="40" stroke="#d33"/>
   <line x1="0" y1="40" x2="100" y2="10" stroke="#3a3"/>

   <!-- Passes: colour plus a non-colour channel, labelled in the legend -->
   <line x1="0" y1="10" x2="100" y2="40" stroke="#d33" stroke-width="2"/>
   <line x1="0" y1="40" x2="100" y2="10" stroke="#3a3" stroke-width="2"
         stroke-dasharray="6 3"/>
   ```

   The same rule applies to a donut or pie: if two adjacent slices carry
   different values, colour cannot be the only way to tell them apart.

6. **Check the contrast of the chart itself, not only of its labels.**
   SC 1.4.11 Non-text Contrast, Level AA, applies to graphical objects needed to
   understand the content: the fills of bars, the strokes of lines, the
   boundaries between adjacent areas, and the tick marks that delimit a scale.
   The requirement is a **3:1** ratio against adjacent colours. A pale yellow
   series on a white background, or a light grey gridline that *is* the only
   scale reference, is a failure. Axis label text is text, and answers to 4.5:1
   or 3:1 for large text, not to this criterion.

7. **Make hover-only values keyboard-reachable.** A data point whose value
   appears in a tooltip on mouse hover is unreachable by keyboard and touch.
   Either show the values in the table (step 2), make each point focusable with
   a name, or provide a data table view. `title="…"` on an SVG element is not a
   keyboard-reachable tooltip.

## Verify

```js
// Every chart surface must be either named or explicitly hidden.
for (const el of document.querySelectorAll('canvas, svg')) {
  const labelledBy = el.getAttribute('aria-labelledby');
  const name =
    el.getAttribute('aria-label') ||
    (labelledBy &&
      labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent)
        .join(' '));
  const hidden =
    el.getAttribute('aria-hidden') === 'true' ||
    el.closest('[aria-hidden="true"]');
  if (!name && !hidden) {
    console.warn('chart exposed with no accessible name', el);
  }
  if (el.tagName === 'svg' && !el.hasAttribute('role') && !hidden) {
    console.warn('svg with no role — its shapes may be walked individually', el);
  }
  if (el.tagName === 'canvas' && !el.textContent.trim() && !name) {
    console.warn('canvas with neither a name nor fallback content', el);
  }
}
```

| Do this | Passing looks like | Criterion |
|---|---|---|
| Read the chart with a screen reader | a name and a description describing the finding, not the widget | 1.1.1 |
| Find the data behind the chart | a real table with a caption and scoped headers, reachable by keyboard | 1.3.1 |
| View the chart in greyscale (a browser extension or a screenshot filter) | every series is still distinguishable and labelled | 1.4.1 |
| Sample each series fill and line stroke against what is behind it | at least 3:1 | 1.4.11 |
| Tab through the page | any value that a mouse user sees on hover is also reachable | 1.1.1 |

The greyscale check and the description quality are judgement calls. Automated
tools can compare two `getComputedStyle` colours, but nothing automated knows
whether "North is highest" is a true description of your data.

## Failure modes

- **`aria-label="chart"`, "Bar chart", or "Graph".** The commonest failure there
  is: it satisfies a linter looking for a name and tells the reader nothing.
  The name must carry the information the graphic carries.
- **Canvas with nothing drawn for anyone who cannot see it.** Library output
  dropped into the page with no label and no table. The screen reader reaches an
  empty canvas and announces nothing, because the text is pixels.
- **An SVG `<title>` with no `role="img"`.** Some browsers and screen readers
  then expose the `<path>` and `<rect>` children as a stream of unlabelled
  graphics instead of one named image, and the title may not be announced.
- **A colour-swatch legend.** The chart and the legend both rely on hue, so the
  chart fails SC 1.4.1 even when every other label is perfect. Add a marker,
  dash, or direct label.
- **A data table hidden with `display: none` behind a toggle.** The table is
  gone from the accessibility tree as well as the screen, so the alternative
  exists only in the source. Toggle with `hidden` on a wrapper, or navigate to a
  separate table.
- **A gridline or boundary that is the only scale reference, drawn at 1.5:1.**
  Low-contrast chart furniture is easy to miss because the bars are vivid; the
  axis is what makes the values readable, and it fails SC 1.4.11 below 3:1.
- **A "high contrast" or "monochrome print" mode that paints every series
  black.** The contrast problem is solved and the series become
  indistinguishable — the overcorrection for SC 1.4.11 that reintroduces a
  SC 1.4.1 failure.
- **Tooltips as the only route to the values.** Fine with a mouse, absent for a
  keyboard or touch user, and absent from the accessible name of the chart.
