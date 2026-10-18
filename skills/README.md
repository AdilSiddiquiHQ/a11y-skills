# Skills

Six skills. Each one is a procedure with a named failure mode list, and each
cites the WCAG 2.2 success criteria it addresses — checked by
`verify/verify-skills.js` in CI, so a skill cannot cite a criterion that does
not exist.

## By task

| Skill | Reach for it when |
|---|---|
| [`audit-component`](./audit-component/) | "Is this accessible?" — produce findings with criteria, evidence and fixes |
| [`fix-color-contrast`](./fix-color-contrast/) | Text or a control fails contrast and needs the smallest change that passes |
| [`keyboard-focus`](./keyboard-focus/) | Something cannot be operated without a mouse; focus order, focus rings, dialogs, sticky headers |
| [`accessible-name`](./accessible-name/) | Alt text, icon buttons, links, or an `aria-label` fighting a visible label |
| [`accessible-forms`](./accessible-forms/) | Labels, error messages, autofill, multi-step flows, login |
| [`wcag22-new-criteria`](./wcag22-new-criteria/) | Target size, drag interactions, consistent help, or a claim about WCAG 2.2 specifically |

## By success criterion

Useful when a report names a criterion and you need the skill that covers it.

| Criterion | Skill |
|---|---|
| 1.1.1 Non-text Content | `accessible-name`, `audit-component` |
| 1.3.1 Info and Relationships | `audit-component`, `accessible-forms` |
| 1.3.5 Identify Input Purpose | `accessible-forms` |
| 1.4.1 Use of Color | `fix-color-contrast` |
| 1.4.3 Contrast (Minimum) | `fix-color-contrast` |
| 1.4.11 Non-text Contrast | `fix-color-contrast` |
| 2.1.1 Keyboard | `keyboard-focus` |
| 2.1.2 No Keyboard Trap | `keyboard-focus` |
| 2.4.3 Focus Order | `keyboard-focus` |
| 2.4.4 Link Purpose (In Context) | `accessible-name` |
| 2.4.7 Focus Visible | `keyboard-focus` |
| 2.4.11 Focus Not Obscured (Minimum) | `keyboard-focus`, `wcag22-new-criteria` |
| 2.5.7 Dragging Movements | `wcag22-new-criteria` |
| 2.5.8 Target Size (Minimum) | `wcag22-new-criteria` |
| 3.2.6 Consistent Help | `wcag22-new-criteria` |
| 3.3.1 Error Identification | `accessible-forms` |
| 3.3.2 Labels or Instructions | `accessible-forms`, `accessible-name` |
| 3.3.3 Error Suggestion | `accessible-forms` |
| 3.3.7 Redundant Entry | `accessible-forms`, `wcag22-new-criteria` |
| 3.3.8 Accessible Authentication (Minimum) | `accessible-forms`, `wcag22-new-criteria` |
| 4.1.2 Name, Role, Value | `accessible-name`, `audit-component` |
| 4.1.3 Status Messages | `accessible-forms` |

## Adding a skill

See [CONTRIBUTING.md](../CONTRIBUTING.md). The short version: copy the shape of
an existing skill, cite real criteria, and add it to the **By task** table.
`npm test` fails if the index and the directory disagree.
