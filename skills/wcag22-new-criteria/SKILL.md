---
name: wcag22-new-criteria
description: Use when reviewing against WCAG 2.2 specifically, when a target size or drag interaction is in scope, when help links must be consistent across pages, or when someone cites 4.1.1 Parsing and needs to know it was removed.
---

# The WCAG 2.2 criteria everyone skips

**Criteria:** SC 2.4.11 Focus Not Obscured (Minimum), SC 2.4.12 Focus Not Obscured (Enhanced), SC 2.4.13 Focus Appearance, SC 2.5.7 Dragging Movements, SC 2.5.8 Target Size (Minimum), SC 3.2.6 Consistent Help, SC 3.3.7 Redundant Entry, SC 3.3.8 Accessible Authentication (Minimum), SC 3.3.9 Accessible Authentication (Enhanced)

WCAG 2.2 added nine success criteria and removed one. Most audits still run the
2.1 checklist, so these are the failures that ship unnoticed. This skill is the
checklist for them.

## When to use

- An audit claims conformance to 2.2 and the reviewer only knows 2.1.
- Touch targets, drag interactions, sticky headers, or help links are in scope.
- Someone files "fails 4.1.1 Parsing" and you need the correct answer: it was
  **removed** in 2.2. It cannot be failed any more.

## What changed

| Criterion | Level | Applies to |
|---|---|---|
| 2.4.11 Focus Not Obscured (Minimum) | AA | sticky headers/footers/banners covering the focused element |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | nothing of the focused element may be hidden |
| 2.4.13 Focus Appearance | AAA | the size and contrast of the focus indicator itself |
| 2.5.7 Dragging Movements | AA | sliders, sortable lists, drag-and-drop, map panning |
| 2.5.8 Target Size (Minimum) | AA | every pointer target: 24 × 24 CSS px |
| 3.2.6 Consistent Help | A | help/contact mechanisms across a set of pages |
| 3.3.7 Redundant Entry | A | multi-step flows asking for the same data twice |
| 3.3.8 Accessible Authentication (Minimum) | AA | login and verification |
| 3.3.9 Accessible Authentication (Enhanced) | AAA | the same, with no exceptions |
| ~~4.1.1 Parsing~~ | — | **removed**. Do not report it. |

## Procedure

1. **Target size — 24 × 24 CSS px (SC 2.5.8, AA).** Measure the *hit area*, not
   the icon. A 16px icon inside a 24px padding box passes. The exceptions are
   narrow; check them before reporting:

   | Exception | Means |
   |---|---|
   | Spacing | an undersized target passes if a 24px-diameter circle centred on it does not overlap another target's circle |
   | Inline | targets inside a sentence or block of text are exempt |
   | Essential | the size is essential to the information conveyed |
   | User agent | the control is drawn by the browser and unstyled |

   ```css
   /* Fails: a 16px icon with no padding is a 16px target */
   .icon-btn { width: 16px; height: 16px; }
   /* Passes: 24px of actual hit area, icon unchanged */
   .icon-btn { width: 24px; height: 24px; display: grid; place-items: center; }
   ```

   Note this is the *minimum*, at Level AA. 2.5.5 Target Size (Enhanced) asks for
   44 × 44 at AAA. Do not report a 24px target as a failure of the enhanced
   criterion.

2. **Dragging — provide a single-pointer alternative (SC 2.5.7, AA).** Anything
   that can be dragged must also be operable by one pointer without dragging,
   unless dragging is essential to the function.

   ```html
   <!-- Fails: the only way to set the value is dragging the handle -->
   <input type="range" min="0" max="100" class="styled-slider">
   <!-- Wait — a native range input is NOT a failure: arrow keys operate it.
        The failure is a custom div-based slider that removed keyboard/step controls. -->

   <!-- For a sortable list, add explicit controls rather than "drag only" -->
   <li>
     Item
     <button type="button" aria-label="Move item up">↑</button>
     <button type="button" aria-label="Move item down">↓</button>
   </li>
   ```

   Native controls (`<input type="range">`, `<select>`, scrollers) already
   satisfy this. Custom implementations usually do not.

3. **Consistent Help (SC 3.2.6, Level A).** If a help mechanism — a phone
   number, a chat launcher, an FAQ link — appears on more than one page, it must
   appear in the **same relative order** in each. A chat widget that moves from
   bottom-right on one page to the footer on another fails.

4. **Focus not obscured (SC 2.4.11 AA, 2.4.12 AAA).** The focused component must
   not be *entirely* hidden (AA) and must not be *partly* hidden (AAA) by
   author-created content.

   ```css
   /* The AA fix, and it is usually the whole fix */
   html { scroll-padding-top: var(--sticky-header-height); }
   ```

5. **Focus appearance (SC 2.4.13, AAA).** If you are claiming AAA, the
   indicator needs an area equivalent to a 2 CSS px thick perimeter of the
   component, and a **3:1** contrast ratio between the focused and unfocused
   states. This is a stricter, measurable restatement of SC 2.4.7.

6. **Redundant entry (SC 3.3.7, A) and authentication (SC 3.3.8 AA / 3.3.9 AAA).**
   Covered in depth in the `accessible-forms` skill. Restated here because they
   are the two 2.2 criteria most often omitted from a checklist entirely: check
   that steps 2..n of any flow pre-fill what step 1 collected, and that paste and
   password managers are not blocked.

## Verify

```js
// Target size: find every interactive element smaller than 24x24, then check
// the spacing exception before reporting it.
const tooSmall = [...document.querySelectorAll('a,button,input,select,[role=button]')]
  .map((el) => ({ el, r: el.getBoundingClientRect() }))
  .filter(({ r }) => r.width > 0 && (r.width < 24 || r.height < 24))
  .map(({ el, r }) => `${el.tagName}.${el.className} ${Math.round(r.width)}x${Math.round(r.height)}`);
console.log(tooSmall);
```

```js
// Focus not obscured: tab through and check nothing covers the focused node.
document.addEventListener('focusin', (e) => {
  const r = e.target.getBoundingClientRect();
  const covered = document.elementFromPoint(
    Math.min(Math.max(r.left + 4, 0), innerWidth - 1),
    Math.min(Math.max(r.top + 4, 0), innerHeight - 1)
  );
  if (covered && !e.target.contains(covered) && covered !== e.target) {
    // Only relevant when anchored to the viewport (position: fixed/sticky)
    const cs = getComputedStyle(covered);
    if (cs.position === 'fixed' || cs.position === 'sticky') {
      console.warn('focus obscured by', covered);
    }
  }
});
```

## Failure modes

- **Reporting 4.1.1 Parsing.** Removed in 2.2. Every "duplicate ID" finding
  filed under it is either a 4.1.2 Name, Role, Value issue or not an issue.
- **Measuring the icon instead of the target.** Padding and pseudo-elements
  count toward the hit area.
- **Reporting every inline link as too small.** Inline targets are explicitly
  exempt from SC 2.5.8.
- **Treating 24px as the recommended size.** It is the floor. 44px is the
  enhanced target and a better default.
- **Flagging a drag interaction that has native keyboard support.** Check for
  arrows, `Home`/`End`, and step controls before reporting SC 2.5.7.
- **Skipping the AA criteria to audit AAA.** SC 2.4.11, 2.5.7 and 3.3.8 are AA.
  They are the ones that block conformance claims.
