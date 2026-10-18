---
name: tabs
description: Use when a tab strip cannot be operated with the arrow keys, when every tab is its own Tab stop, or when a screen reader cannot say which tab is selected.
---

# Tabs

**Criteria:** SC 2.1.1 Keyboard, SC 2.4.3 Focus Order, SC 4.1.2 Name, Role, Value, SC 1.3.1 Info and Relationships

Tabs are one of the few widgets with no native HTML equivalent, so the WAI-ARIA
Authoring Practices [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
pattern is the reference. Its defining feature is a *roving tabindex*: the tab
list is a single Tab stop and the arrow keys move between tabs. When every tab is
its own Tab stop, or the arrows do nothing, the pattern is broken even though it
looks right.

## When to use

- "You have to click each tab; the arrow keys do nothing."
- "A screen reader reads three tabs but never says which one is selected."
- Building or reviewing a `role="tablist"` implementation.
- Deciding between tabs, a disclosure, and plain links.

## Procedure

1. **First check that you need tabs at all.** There is no native `<tabs>`
   element, so a tab widget is ARIA you have to maintain. If the content is
   collapsible sections, use `<details>` and `<summary>`. If it is in-page
   navigation, use links. Build tabs only for mutually exclusive panes shown over
   one region.

2. **Apply the APG roles and relationships explicitly.** SC 1.3.1 requires the
   visible tab-to-panel relationship to exist in the markup, and SC 4.1.2
   requires the role, the name, and the selected state.

   ```html
   <!-- Fails SC 1.3.1 and SC 4.1.2 — no roles, no state, no relationship -->
   <div class="tabs">
     <div class="tab" onclick="show(1)">Overview</div>
     <div class="tab" onclick="show(2)">Specs</div>
   </div>
   <div id="panel1">…</div>

   <!-- Passes — roles, relationships, and selection state are explicit -->
   <div class="tabs">
     <div role="tablist" aria-label="Product details">
       <button role="tab" id="tab-1" aria-selected="true"  aria-controls="panel-1">Overview</button>
       <button role="tab" id="tab-2" aria-selected="false" aria-controls="panel-2" tabindex="-1">Specs</button>
     </div>
     <div role="tabpanel" id="panel-1" aria-labelledby="tab-1" tabindex="0">…</div>
     <div role="tabpanel" id="panel-2" aria-labelledby="tab-2" tabindex="0" hidden>…</div>
   </div>
   ```

   A `tablist` with no `aria-label` (or `aria-labelledby`) is unnamed; two tab
   widgets on one page then announce identically (SC 4.1.2).

3. **Use a roving tabindex.** The selected tab keeps `tabindex="0"`; every other
   tab gets `tabindex="-1"`. So Tab enters the tab list once and lands on the
   selected tab, and the arrows do the rest (SC 2.4.3).

   ```js
   tabs.addEventListener('keydown', (e) => {
     const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
     if (!dir) return;
     e.preventDefault();                                   // stop the page scrolling
     select((selectedIndex + dir + tabs.length) % tabs.length); // wraps, per APG
   });
   ```

4. **Update `aria-selected` and the roving tabindex together.** Exactly one tab
   is selected (`"true"`; there is no empty value) and exactly one tab is a Tab
   stop. A tab that is selected but still `tabindex="-1"` is unreachable; a tab
   that is `tabindex="0"` but not selected costs the user an extra Tab press.

5. **Pick one activation model from the APG and implement it fully.** *Automatic*
   activation switches the panel as the arrows move focus. *Manual* activation
   moves focus with the arrows and switches only on Enter or Space. Do not mix
   them: a user who presses Right and sees the ring move but not the panel has
   been given no way to know whether to press Enter.

6. **Orient the keys and say so.** Horizontal tabs use Left/Right Arrow;
   vertical tabs use Up/Down Arrow and set `aria-orientation="vertical"`. Both
   use Home and End for first and last.

7. **Hide inactive panels with `hidden` or `display: none`.** These remove the
   panel from the tab order. `opacity: 0`, `visibility` tricks, and off-screen
   positioning do not, so their links stay reachable.

## Verify

Keyboard only, in this order:

| Do this | Passing looks like | Criterion |
|---|---|---|
| Tab into the tab list | one stop, landing on the selected tab | 2.4.3 |
| Press Right Arrow, then Left Arrow | selection moves, wrapping at each end, and the active panel follows | 2.1.1 |
| Press Home, then End | first and last tab | 2.1.1 |
| Press Tab from the tab list | focus leaves the tabs for the panel or the next control after the tab list | 2.4.3 |
| Read the widget with a screen reader | it announces a tab list, each tab's name, and which one is selected | 4.1.2, 1.3.1 |

Automated checks catch the structural part; the keyboard walk is a judgement
call.

```js
const list = document.querySelector('[role="tablist"]');
const tabs = [...list.querySelectorAll('[role="tab"]')];
console.assert(tabs.filter((t) => t.tabIndex === 0).length === 1,
  'SC 2.4.3: exactly one tab must be the single Tab stop');
console.assert(tabs.filter((t) => t.getAttribute('aria-selected') === 'true').length === 1,
  'SC 4.1.2: exactly one tab must be selected');
```

## Failure modes

- **Every tab is `tabindex="0"`.** It reads as a tab list, but Tab stops on each
  tab and the arrows are never wired, so the widget has the shape of the pattern
  and none of the behaviour (SC 2.4.3).
- **Activation state desyncs.** The arrow moves the roving `tabindex` but never
  updates `aria-selected` or the visible panel, or automatic activation shows a
  new panel while `aria-selected` stays on the old tab. Sighted users and screen
  reader users are then told different things (SC 4.1.2).
- **Inactive panels are clipped, not hidden.** `max-height: 0`, `overflow:
  hidden`, or an off-screen transform leaves the panel's links in the tab order,
  so keyboard users Tab into content they cannot see.
- **`aria-controls` or `aria-labelledby` points at an id that does not exist.**
  The id is generated after render, or the panel was renamed. The relationship is
  silently absent and no linter complains (SC 1.3.1).
- **The tab list has no accessible name.** `aria-label` is omitted, so two tab
  widgets on a page are announced as two unnamed tab lists (SC 4.1.2).
- **A fake tab widget replaces navigation or a disclosure.** A list of links or a
  set of collapsible sections is rebuilt as `role="tab"` so it can only be driven
  with a mouse. Use links or `<details>` for those (see the accordion skill).
