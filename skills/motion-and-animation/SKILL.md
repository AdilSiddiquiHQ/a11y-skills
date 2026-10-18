---
name: motion-and-animation
description: Use when an animation or parallax effect makes someone dizzy, when a carousel auto-plays or an element flashes, when there is no way to turn off motion, or when a shake-to-undo or tilt interaction has no button alternative.
---

# Motion and animation

**Criteria:** SC 2.3.3 Animation from Interactions, SC 2.2.2 Pause, Stop, Hide, SC 2.3.1 Three Flashes or Below Threshold, SC 2.5.4 Motion Actuation

Motion on a screen is not decoration to the person it makes ill. Vestibular
disorders make large-area movement, parallax and scroll-jacking literally
nauseating, and a fast enough flash can trigger a seizure. The mistake that matters
most is honouring `prefers-reduced-motion` in the one hero component and forgetting
it in every toast, tooltip and route transition that also animates.

## When to use

- A hero, page transition, or scroll effect animates large areas of the viewport.
- A carousel, marquee, ticker, or spinner starts on its own and never stops.
- Someone reports the site makes them dizzy, or asks for a motion-free option.
- A notification flashes, or a banner blinks to draw attention.
- The app uses the device's motion sensor: shake to undo, tilt to pan, step counter.
- Reviewing `prefers-reduced-motion` support across a design system.

## Procedure

1. **Honour `prefers-reduced-motion` everywhere, not in one component (SC 2.3.3).**
   SC 2.3.3 (AAA) requires that motion triggered by interaction can be disabled
   unless the motion is essential to the functionality. The media query is the
   mechanism; it must cover every animated surface, including route transitions,
   drawers, and scroll-linked effects.

   ```css
   /* Fails SC 2.3.3 — motion only, no way to reduce it */
   .drawer { transition: transform 400ms ease; }
   .card:hover { transform: translateY(-8px); }

   /* Passes — interaction motion collapses for users who asked for less */
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```

   The `0.01ms` pattern keeps state changes instant rather than removing them, so
   elements still move from A to B; it does not remove opacity fades that carry
   meaning. Pair it with a persistent in-app toggle (`data-reduced-motion` or a
   class on `<html>`) that layers on top of the media query, because not every user
   with a vestibular disorder sets the OS preference.

   ```css
   /* The in-app toggle and the OS preference share one rule */
   @media (prefers-reduced-motion: reduce) {
     html:not([data-motion="full"]) .animated { animation: none; }
   }
   html[data-motion="reduced"] .animated { animation: none; }
   ```

2. **Give automatic motion a pause, stop, or hide control (SC 2.2.2, Level A).**
   Any content that moves, blinks, scrolls, or auto-updates, starts automatically,
   lasts more than **5 seconds**, and is presented in parallel with other content
   must have a mechanism to pause, stop, or hide it, unless the motion is essential.

   ```html
   <!-- Fails SC 2.2.2 — rotates forever with no control -->
   <div class="carousel" data-interval="4000">…</div>

   <!-- Passes — an explicit control, and it stops on both hover and focus -->
   <div class="carousel">
     <ul class="carousel__slides">…</ul>
     <button type="button" class="carousel__toggle" aria-pressed="false">
       Pause carousel
     </button>
   </div>
   ```

   Hover-pause alone is not enough: a keyboard or touch user never hovers, so pause
   on `focusin` as well and provide a real button. Auto-updating content (scores,
   feeds) must offer pause/stop/hide or a way to control the update frequency.

3. **Keep flashing under the threshold (SC 2.3.1, Level A).** No content may flash
   more than three times in any one-second period, unless the flash is below the
   general flash and red flash thresholds. Those thresholds are about the *area*
   flashing within the central 10 degrees of vision, so small elements can flash
   faster. Do not estimate this by eye — run the animation through the Photosensitive
   Epilepsy Analysis Tool (PEAT) and treat a failure as a blocker, because SC 2.3.1
   is a seizure risk, not a preference. SC 2.3.2 Three Flashes (AAA) removes the
   threshold exception entirely.

   ```js
   // Fails SC 2.3.1 — a CSS flash at ~5 Hz, over the three-per-second limit.
   @keyframes alarm { 0%, 100% { background: #f00; } 50% { background: #fff; } }
   .alert { animation: alarm 0.2s steps(1) infinite; }

   // Passes — a steady state change; the message is conveyed without flashing.
   .alert { background: #b3261e; color: #fff; border-left: 4px solid #000; }
   ```

4. **Provide a UI alternative for motion actuation (SC 2.5.4, Level A).**
   Functionality operated by device or user motion — shake to undo, tilt to steer,
   rotate to change view, step counting — must also be operable by ordinary user
   interface components, and responding to motion must be disableable to prevent
   accidental actuation. The exceptions are motion that is essential to the
   function, and motion actuated through an accessibility-supported interface.

   ```html
   <!-- Fails SC 2.5.4 — shake is the only way to undo -->
   <p class="hint">Shake your phone to undo.</p>

   <!-- Passes — a real control plus an off switch -->
   <button type="button" id="undo">Undo</button>
   <!-- ...and a "Disable shake gestures" checkbox in settings. -->
   ```

   Detect the sensor through feature APIs and only enable gesture handling when the
   user has not disabled it.

5. **Do not decorate with a shake.** Shaking a form field on invalid input is a
   common pattern that both disorients vestibular users and, at high frequency, can
   cross into flashing. Replace it with a static error style and a message tied to
   the field. The message, not the movement, is the accessible feedback.

## Verify

Emulate the OS preference rather than trusting the CSS by inspection. In Chrome
DevTools open **Rendering → Emulate CSS media feature prefers-reduced-motion** and
set it to `reduce`, then walk the page.

```js
// SC 2.3.3 — assert the preference is actually read and applied.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const stillAnimating = [...document.querySelectorAll('*')].filter((el) => {
    const cs = getComputedStyle(el);
    const securing = cs.animationDuration !== '0s' && cs.animationName !== 'none';
    return securing;
  });
  console.warn('SC 2.3.3: animation still running under reduce', stillAnimating.slice(0, 20));
}
```

```js
// SC 2.2.2 — flag motion longer than 5 seconds with no obvious control.
const animated = [...document.querySelectorAll('*')]
  .filter((el) => {
    const cs = getComputedStyle(el);
    return cs.animationName !== 'none' && cs.animationIterationCount === 'infinite';
  })
  .map((el) => `${el.tagName}.${el.className || ''}`);
console.warn('SC 2.2.2: infinite animation — confirm a pause/stop/hide control exists', animated);

// SC 2.5.4 — find sensor listeners that may need a UI alternative.
const writes = ['DeviceMotionEvent', 'DeviceOrientationEvent']
  .filter((name) => typeof window[name] === 'function');
console.log('sensor APIs present:', writes);
```

Neither script can confirm that a control *works* or that a flash is under
threshold. Toggle the pause button with the keyboard and confirm the motion stops;
run any flashing asset through PEAT. Those steps are judgement, and no scanner
replaces them.

## Failure modes

- **Partial `prefers-reduced-motion` support.** The hero is fixed, but the modal
  slide-in, the toast, the skeleton shimmer and the route transition still animate.
  Users notice the one thing you missed, not the ten you fixed.
- **A "reduce motion" toggle that defaults to off, resets on reload, or only exists
  after login.** A setting nobody finds or that does not persist is not a mechanism.
  Persist it and apply it before first paint.
- **Pausing only on hover.** Carousels that stop on `mouseenter` leave keyboard and
  touch users with no control at all, and they fail SC 2.2.2 despite "having a
  pause".
- **Scroll-jacking and parallax that ignore the media query.** Custom scroll
  handlers (`scroll` listeners that translate sections) are CSS-invisible and are
  the effects most likely to be missed. Guard them in JavaScript too.
- **A GIF or Lottie that flashes above the threshold.** Compressing or looping an
  animation can push it over three flashes per second. "It's just a small icon" is
  not a defence if it exceeds the area and rate limits.
- **Shake-to-undo with no button.** Common on mobile, satisfies a designer's demo
  and fails SC 2.5.4 outright. It is also unreachable by anyone using a wheelchair
  or a phone on a desk.
- **Overcorrection: removing all animation and feedback.** Stripping every
  transition, progress indicator, focus movement and loading state to be safe
  removes information sighted users rely on. Reduce motion, do not delete meaning.
- **Overcorrection: a global `transition: none !important` unconditionally.** It
  disables motion for users who never asked for less and still leaves
  JavaScript-driven motion running, because the guards are in the wrong layer.
