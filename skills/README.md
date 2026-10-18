# Skills

30 skills. Each is a procedure with a named failure-mode list, and
each declares the WCAG 2.2 success criteria it addresses. Every citation is
checked against the spec in CI, so a skill cannot cite a criterion that does not
exist, or name one differently from the spec.

**This file is generated.** Edit a skill, then run `npm run index`. CI fails if
it is stale.

## By task

| Skill | Reach for it when |
|---|---|
| [`accessible-authentication`](./accessible-authentication/) | Building or reviewing a login, sign-up, password reset, or two-factor step, when paste is blocked, when a password manager will not fill the form, or when a CAPTCHA or code entry stands between a user and their account. |
| [`accessible-forms`](./accessible-forms/) | Building or reviewing a form, when a screen reader cannot tell which field failed, when autofill does not work, or when a multi-step process asks for the same information twice. |
| [`accessible-name`](./accessible-name/) | Adding or reviewing alt text, icon buttons, links, or form control labels, when a control is announced as "button" or "link", or when a visible label and an aria-label disagree. |
| [`accordion-disclosure`](./accordion-disclosure/) | A section opens on click but not with the keyboard, when a screen reader will not say whether a panel is open or closed, or when a collapsed panel still swallows Tab presses. |
| [`audit-component`](./audit-component/) | Asked to review a component, page, or HTML snippet for accessibility, or when an accessibility claim needs evidence attached to it rather than an opinion. |
| [`carousel`](./carousel/) | Building or reviewing a carousel, slider, or auto-advancing banner, when a slideshow cannot be paused or moved with the keyboard, or when hidden slides are still reachable by Tab. |
| [`charts-and-dataviz`](./charts-and-dataviz/) | Building or reviewing a chart, graph, dashboard, or data visualisation, when a canvas or SVG shows nothing to a screen reader, or when a series is distinguished by colour alone. |
| [`combobox-autocomplete`](./combobox-autocomplete/) | A search or autocomplete field cannot be driven with the arrow keys, when a label is missing or replaced by a placeholder, or when a screen reader cannot say how many suggestions are showing. |
| [`data-table`](./data-table/) | Building or reviewing a data table, when a screen reader reads a cell without its row and column headers, when a table will not fit on a phone, or when a grid of divs is doing a table's job. |
| [`email-html-accessibility`](./email-html-accessibility/) | Designing or building an HTML email or newsletter, when a template must survive Gmail and Outlook, or when images are blocked by default and the message stops making sense. |
| [`fix-color-contrast`](./fix-color-contrast/) | Text or a UI control is hard to read against its background, or when a palette needs a fix that keeps the brand colour while passing WCAG contrast minimums. |
| [`forced-colors-and-dark-mode`](./forced-colors-and-dark-mode/) | Contrast fails in dark mode, when a component disappears in Windows High Contrast, when status is shown only with color, or when a border or focus ring is a box-shadow that vanishes under forced colors. |
| [`headings-and-landmarks`](./headings-and-landmarks/) | A screen reader cannot navigate the page by heading, when heading levels are skipped or headings are styled divs, when there is no way past the navigation, or when page regions are unlabeled. |
| [`keyboard-focus`](./keyboard-focus/) | Something cannot be operated without a mouse, when focus order or a focus indicator is wrong, when a dialog or menu loses focus, or when a sticky header hides the focused control. |
| [`live-regions`](./live-regions/) | A status message is not announced, when a screen reader repeats the same message twice, when a page reads its own status out loud on load, or when a toast, spinner, or save confirmation needs to reach assistive technology. |
| [`media-captions`](./media-captions/) | Publishing video, audio, or a podcast, when a video has no captions, when someone asks for a transcript, or when audio plays automatically on page load. |
| [`menu-button`](./menu-button/) | A button opens a menu that the arrow keys cannot navigate, when Tab gets stuck inside an open menu, or when a hover menu vanishes as you move the pointer towards it. |
| [`modal-dialog`](./modal-dialog/) | A dialog opens and Tab goes behind it, when focus is lost or jumps to the top of the page after closing, or when Escape does not close the dialog. |
| [`motion-and-animation`](./motion-and-animation/) | An animation or parallax effect makes someone dizzy, when a carousel auto-plays or an element flashes, when there is no way to turn off motion, or when a shake-to-undo or tilt interaction has no button alternative. |
| [`page-title-and-language`](./page-title-and-language/) | The browser tab or screen reader announces the wrong page, when every page shares one title, when a single-page app never updates the title, or when text is read aloud in the wrong language or accent. |
| [`pagination-and-search`](./pagination-and-search/) | Building or reviewing pagination, a results list, or a search and filter UI, when page links are too small or unlabelled, or when users lose track of where they are in a set of results. |
| [`progress-and-loading`](./progress-and-loading/) | Building or reviewing a spinner, progress bar, upload, loading state, or session timeout, when a screen reader never hears that loading finished, or when a progress indicator has no name or too little contrast. |
| [`screen-reader-test-plan`](./screen-reader-test-plan/) | Asked to test a page or flow with a screen reader, when writing an accessibility test script, or when reading order and focus order cannot be judged from the markup alone. |
| [`skip-links`](./skip-links/) | A keyboard user must tab through the whole navigation on every page, when a "skip to content" link is unreachable or does nothing, or when focus lands in the wrong place after using one. |
| [`svg-and-icons`](./svg-and-icons/) | Adding an SVG, an icon font, or an icon-only button, when a screen reader announces an unlabelled graphic, or when an icon is invisible or conveyed only by colour against its background. |
| [`tabs`](./tabs/) | A tab strip cannot be operated with the arrow keys, when every tab is its own Tab stop, or when a screen reader cannot say which tab is selected. |
| [`tooltip-popover`](./tooltip-popover/) | A tooltip only appears on hover and not on keyboard focus, when it vanishes as the pointer moves onto it, or when Escape does not dismiss it. |
| [`triage-automated-results`](./triage-automated-results/) | An automated accessibility scan reports issues to triage, when a Lighthouse or axe score is being treated as conformance, or when a tool finding needs a verdict, an owner, and a criterion. |
| [`wcag22-new-criteria`](./wcag22-new-criteria/) | Reviewing against WCAG 2.2 specifically, when a target size or drag interaction is in scope, when help links must be consistent across pages, or when someone cites 4.1.1 Parsing and needs to know it was removed. |
| [`zoom-reflow-text-spacing`](./zoom-reflow-text-spacing/) | Zooming or pinch-zoom breaks the layout, when text is clipped or overlaps at 320px or 400% zoom, when increasing text spacing cuts content off, or when the viewport meta disables zoom. |

## By success criterion

Which skill to read when a report names a criterion. 52 of the 86 criteria in WCAG 2.2 are covered.

| Criterion | Skills |
|---|---|
| SC 1.1.1 Non-text Content | `accessible-name`, `audit-component`, `charts-and-dataviz`, `email-html-accessibility`, `svg-and-icons`, `triage-automated-results` |
| SC 1.2.1 Audio-only and Video-only (Prerecorded) | `media-captions` |
| SC 1.2.2 Captions (Prerecorded) | `media-captions` |
| SC 1.2.3 Audio Description or Media Alternative (Prerecorded) | `media-captions` |
| SC 1.2.4 Captions (Live) | `media-captions` |
| SC 1.2.5 Audio Description (Prerecorded) | `media-captions` |
| SC 1.3.1 Info and Relationships | `accessible-forms`, `accessible-name`, `accordion-disclosure`, `audit-component`, `charts-and-dataviz`, `data-table`, `email-html-accessibility`, `headings-and-landmarks`, `live-regions`, `page-title-and-language`, `screen-reader-test-plan`, `skip-links`, `tabs` |
| SC 1.3.2 Meaningful Sequence | `audit-component`, `data-table` |
| SC 1.3.5 Identify Input Purpose | `accessible-authentication`, `accessible-forms`, `combobox-autocomplete` |
| SC 1.4.1 Use of Color | `audit-component`, `charts-and-dataviz`, `fix-color-contrast`, `forced-colors-and-dark-mode`, `svg-and-icons` |
| SC 1.4.2 Audio Control | `media-captions` |
| SC 1.4.3 Contrast (Minimum) | `audit-component`, `email-html-accessibility`, `fix-color-contrast`, `forced-colors-and-dark-mode`, `triage-automated-results` |
| SC 1.4.4 Resize Text | `zoom-reflow-text-spacing` |
| SC 1.4.6 Contrast (Enhanced) | `forced-colors-and-dark-mode` |
| SC 1.4.8 Visual Presentation | `zoom-reflow-text-spacing` |
| SC 1.4.10 Reflow | `data-table`, `zoom-reflow-text-spacing` |
| SC 1.4.11 Non-text Contrast | `charts-and-dataviz`, `fix-color-contrast`, `forced-colors-and-dark-mode`, `progress-and-loading`, `svg-and-icons`, `tooltip-popover`, `triage-automated-results` |
| SC 1.4.12 Text Spacing | `zoom-reflow-text-spacing` |
| SC 1.4.13 Content on Hover or Focus | `keyboard-focus`, `menu-button`, `tooltip-popover` |
| SC 2.1.1 Keyboard | `accordion-disclosure`, `audit-component`, `carousel`, `combobox-autocomplete`, `keyboard-focus`, `live-regions`, `menu-button`, `modal-dialog`, `tabs`, `tooltip-popover` |
| SC 2.1.2 No Keyboard Trap | `keyboard-focus`, `menu-button`, `modal-dialog` |
| SC 2.2.1 Timing Adjustable | `progress-and-loading` |
| SC 2.2.2 Pause, Stop, Hide | `carousel`, `motion-and-animation` |
| SC 2.3.1 Three Flashes or Below Threshold | `motion-and-animation` |
| SC 2.3.3 Animation from Interactions | `carousel`, `motion-and-animation` |
| SC 2.4.1 Bypass Blocks | `headings-and-landmarks`, `skip-links` |
| SC 2.4.2 Page Titled | `page-title-and-language` |
| SC 2.4.3 Focus Order | `audit-component`, `keyboard-focus`, `modal-dialog`, `screen-reader-test-plan`, `skip-links`, `tabs` |
| SC 2.4.4 Link Purpose (In Context) | `accessible-name`, `audit-component`, `email-html-accessibility`, `pagination-and-search` |
| SC 2.4.6 Headings and Labels | `accessible-forms`, `accordion-disclosure`, `audit-component`, `data-table`, `headings-and-landmarks` |
| SC 2.4.7 Focus Visible | `audit-component`, `keyboard-focus`, `skip-links` |
| SC 2.4.8 Location | `pagination-and-search` |
| SC 2.4.10 Section Headings | `headings-and-landmarks` |
| SC 2.4.11 Focus Not Obscured (Minimum) | `keyboard-focus`, `wcag22-new-criteria` |
| SC 2.4.12 Focus Not Obscured (Enhanced) | `wcag22-new-criteria` |
| SC 2.4.13 Focus Appearance | `wcag22-new-criteria` |
| SC 2.5.3 Label in Name | `accessible-name` |
| SC 2.5.4 Motion Actuation | `motion-and-animation` |
| SC 2.5.7 Dragging Movements | `wcag22-new-criteria` |
| SC 2.5.8 Target Size (Minimum) | `pagination-and-search`, `wcag22-new-criteria` |
| SC 3.1.1 Language of Page | `page-title-and-language` |
| SC 3.1.2 Language of Parts | `page-title-and-language` |
| SC 3.2.3 Consistent Navigation | `pagination-and-search` |
| SC 3.2.6 Consistent Help | `wcag22-new-criteria` |
| SC 3.3.1 Error Identification | `accessible-authentication`, `accessible-forms` |
| SC 3.3.2 Labels or Instructions | `accessible-forms`, `accessible-name`, `combobox-autocomplete` |
| SC 3.3.3 Error Suggestion | `accessible-forms` |
| SC 3.3.7 Redundant Entry | `accessible-forms`, `wcag22-new-criteria` |
| SC 3.3.8 Accessible Authentication (Minimum) | `accessible-authentication`, `accessible-forms`, `wcag22-new-criteria` |
| SC 3.3.9 Accessible Authentication (Enhanced) | `accessible-authentication`, `wcag22-new-criteria` |
| SC 4.1.2 Name, Role, Value | `accessible-name`, `accordion-disclosure`, `audit-component`, `carousel`, `combobox-autocomplete`, `menu-button`, `modal-dialog`, `progress-and-loading`, `screen-reader-test-plan`, `svg-and-icons`, `tabs`, `tooltip-popover`, `triage-automated-results` |
| SC 4.1.3 Status Messages | `accessible-forms`, `live-regions`, `progress-and-loading`, `screen-reader-test-plan` |

The remaining criteria are not covered because they cannot be meaningfully
addressed by a procedure — see [../docs/COVERAGE.md](../docs/COVERAGE.md) for
the generated picture and an honest account of what is and is not covered.

## Adding a skill

See [../docs/AUTHORING.md](../docs/AUTHORING.md) for the specification and
[../CONTRIBUTING.md](../CONTRIBUTING.md) for the workflow.
`npm test` rejects a skill that is malformed, cites a criterion wrongly, or is
missing from this index.
