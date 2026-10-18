---
name: carousel
description: Use when building or reviewing a carousel, slider, or auto-advancing banner, when a slideshow cannot be paused or moved with the keyboard, or when hidden slides are still reachable by Tab.
---

# Carousel

**Criteria:** SC 2.2.2 Pause, Stop, Hide, SC 2.3.3 Animation from Interactions, SC 2.1.1 Keyboard, SC 4.1.2 Name, Role, Value

A carousel is a set of panels, one visible, a pause control, and a way to move
between them. Almost every failure is one of three things: it moves on its own
with no way to stop it, the off-screen panels are still in the tab order, or the
controls have no accessible names. The mistake that matters most is autoplay
with no pause, because it takes control away from the reader.

## When to use

- "The banner rotates and I cannot stop it to read the third slide."
- Building a hero carousel, testimonial slider, or image gallery.
- Tab order jumps to content that is visually off-screen.
- Reviewing `aria-roledescription="carousel"` or a library that supplies one.

## Procedure

1. **Make autoplay opt-in, and if it is on, provide a visible pause control.**
   SC 2.2.2 Pause, Stop, Hide applies to content that moves, blinks, or
   auto-updates when it starts automatically, lasts **more than five seconds**,
   and is presented in parallel with other content. A rotating carousel meets
   all three, so it needs a mechanism to pause, stop, or hide it. The pause
   control must be visible without interaction — a control that appears only on
   mouse hover is not available to a keyboard user.

   ```html
   <!-- Passes SC 2.2.2: a real, focusable control, visible at rest -->
   <button type="button" class="carousel-pause" aria-pressed="false">
     Pause carousel
   </button>
   ```

   Follow the [WAI-ARIA Authoring Practices Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)
   for the control set: previous, next, the rotation toggle, and slide pickers,
   all as buttons.

2. **Let a toggle's name and state agree.** A rotation control is a toggle: it
   reports its own state, and its name says what it does. Update the name when
   the state flips, so a screen reader user hears "Play carousel" once it is
   paused and "Pause carousel" once it runs — an unchanged name is how a paused
   carousel gets silently resumed.

3. **Pause on focus and on hover, and do not resume without a request.** A
   carousel that pauses under the pointer but keeps advancing after focus moves
   into it will move a slide out from under the user mid-read. Pausing on
   `mouseenter` and `focusin` and resuming on `mouseleave` and `focusout` is the
   expected behaviour; resuming automatically after a timer is not.

4. **Give the carousel and its slides roles and names (SC 4.1.2 Name, Role,
   Value).** The container is a region named by its own heading, and each slide
   is a group with its position.

   ```html
   <section aria-roledescription="carousel" aria-label="Featured products">
     <div role="group" aria-roledescription="slide" aria-label="1 of 5">
       …
     </div>
     <div role="group" aria-roledescription="slide" aria-label="2 of 5" hidden>
       …
     </div>
     <div class="controls">
       <button type="button" aria-label="Previous slide">‹</button>
       <button type="button" aria-label="Next slide">›</button>
       <ul class="dots">
         <li><button type="button" aria-label="Go to slide 1" aria-current="true">1</button></li>
         <li><button type="button" aria-label="Go to slide 2">2</button></li>
       </ul>
     </div>
   </section>
   ```

   The container needs a name from a real heading or `aria-label`; a carousel
   announced as "region" with no name is not useful in a landmarks list.

5. **Keep the keyboard in the visible slide only.** Everything that is not the
   current slide must be out of the tab order. Use the `hidden` attribute or
   `inert` on inactive slides. Do not rely on `opacity: 0`, `transform:
   translateX(-100%)`, or off-screen positioning — none of those remove a link
   from the tab order, so `Tab` lands on invisible controls.

   ```html
   <!-- Fails SC 2.1.1 in practice: invisible but focusable -->
   <div class="slide" style="opacity:0; transform:translateX(-100%)">
     <a href="/product">Buy now</a>
   </div>

   <!-- Passes: inactive slides are removed from the tab order -->
   <div class="slide" inert>
     <a href="/product">Buy now</a>
   </div>
   ```

6. **Operate it from the keyboard (SC 2.1.1).** Previous, next, pause, and each
   slide picker must be reachable with `Tab` and activate with `Enter` and
   `Space` — which they are, if they are `<button>` elements. Do not add arrow
   key handling that hijacks the browser's scrolling unless the carousel is a
   composite widget with a single tab stop, as in the APG pattern. A carousel
   with a tab stop per control is simpler and passes; keep it that way.

7. **Honour reduced motion (SC 2.3.3 Animation from Interactions, Level AAA).**
   A slide transition is motion animation triggered by an interaction, and it
   must be disableable unless the motion is essential. Leave the content change
   in place and drop the movement.

   ```css
   /* Passes SC 2.3.3: content still changes, motion does not */
   @media (prefers-reduced-motion: reduce) {
     .carousel-track { transition: none; }
   }
   ```

   Note that this is separate from SC 2.2.2: SC 2.2.2 is about the carousel
   moving on its own, SC 2.3.3 is about the motion that a user's own action
   triggers, and both can be failed at once.

8. **Do not make the slides a live region.** `aria-live` on the carousel
   container makes every autoplay advance interrupt or queue an announcement.
   The rotation control is the accessible affordance; the slides are not.

## Verify

```js
// Off-screen controls must not be focusable, and every control must be named.
const carousel = document.querySelector('[aria-roledescription="carousel"]');
for (const btn of carousel?.querySelectorAll('button') ?? []) {
  const name = btn.getAttribute('aria-label') || btn.textContent.trim();
  const visible = btn.offsetParent !== null || getComputedStyle(btn).position === 'fixed';
  if (!name) console.warn('carousel control has no accessible name', btn);
  if (!visible) console.warn('carousel control is invisible but may be focusable', btn);
}
for (const slide of carousel?.querySelectorAll('[aria-roledescription="slide"]') ?? []) {
  const inactive = slide.hidden || slide.inert || slide.getAttribute('aria-hidden') === 'true';
  const focusable = [...slide.querySelectorAll('a[href], button, input, [tabindex]')];
  if (inactive && !slide.inert && !slide.hidden && focusable.length) {
    console.warn('inactive slide still contains focusable controls', slide);
  }
}
```

| Do this | Passing looks like | Criterion |
|---|---|---|
| Load the page and watch the carousel | it does not advance, or a visible pause control stops it | 2.2.2 |
| Move focus into the carousel | it stops advancing while focus is inside | 2.2.2 |
| Tab through the whole carousel | only the current slide's content and the controls are reached | 2.1.1 |
| Press `Enter` and `Space` on each control | previous, next, pause and each picker work | 2.1.1 |
| Read each control with a screen reader | name, role and, for the toggle, its state are announced | 4.1.2 |
| Emulate `prefers-reduced-motion: reduce` and change slides | the content changes with no animation | 2.3.3 |
| Toggle pause and read the control again | the name reflects the new state | 2.2.2 |

The "does not advance" rows are observed over time, not asserted in the DOM;
give the carousel more than five seconds before concluding anything about
SC 2.2.2.

## Failure modes

- **Autoplay with no pause, or a pause control only on hover.** The most common
  failure in this pattern. A keyboard user cannot reach a control that appears
  on `mouseenter`.
- **A pause toggle whose accessible name never changes.** It reads "Pause"
  while paused, so pressing it resumes the carousel and the user hears nothing
  that explains why.
- **Inactive slides hidden with `opacity: 0` or an off-canvas transform.** All
  of their links and buttons stay in the tab order, and `Tab` walks through
  content nobody can see.
- **`aria-roledescription="carousel"` with no `role` and no name.** The
  description replaces the role's announcement in some screen readers even when
  the element has no meaningful role, and the container is announced as an
  unnamed region.
- **Dots built as `div`s or list items with click handlers.** Not focusable, not
  buttons, no name, and no state — three failures at once rather than one.
- **`aria-live="polite"` on the carousel container.** Every automatic advance is
  announced, and a polite queue of five slides' worth of text arrives after the
  user has moved on.
- **A single global reduced-motion kill.** `* { transition: none !important }`
  also removes transitions that reveal state, and it is a blunter fix than
  scoping it to the carousel's track.
- **The overcorrection: deleting the carousel.** Replacing it with five stacked
  images is not the fix; a labelled, pausable, keyboard-operable carousel meets
  every criterion listed here.
