# Dark theme and Export interaction audit

## Scope and preservation

This audit covers the shared application shell, theme bootstrap and persistence, semantic theme tokens, Translator controls, Grammar Checker controls and Export menu, authentication surfaces, pricing and upgrade surfaces, and authenticated account surfaces. It does not change pricing, billing, AI-provider configuration, user data, export formats, or backend export behavior.

## Confirmed findings

| Severity | Classification | Finding | Resolution |
| --- | --- | --- | --- |
| Critical | root theme issue, specificity issue | Tailwind v4's `dark:` variant was still controlled by the browser media query, while the application applied `.dark` only to an inner React wrapper. Dark text utilities could activate without the corresponding page and surface utilities. | Define the existing class-based dark variant explicitly and apply the theme to `document.documentElement`. |
| High | token missing, component inconsistency | Translator surfaces and controls mixed light utility colors with inherited dark text and lacked a complete semantic control/surface layer. | Add semantic page, surface, input, text, border, state, warning, focus, disabled, popover, and action tokens; move Translator controls to those tokens. |
| High | contrast failure | Active teal controls and two Grammar status/tab labels failed automated WCAG AA contrast checks. | Use the semantic primary-action color and explicit dark label colors. Axe reports no serious or critical violations on the audited Translator and Grammar states. |
| High | functional bug, accessibility problem | Grammar Export used `hidden group-hover:block`. Click did not own open state, the four-pixel margin created a pointer gap, and there were no menu semantics, focus management, or keyboard navigation. | Replace it with one controlled, reusable Export menu. Click/tap owns state; outside pointer, Escape, option selection, focus, and arrow/Home/End behavior are explicit. |
| Medium | state persistence issue | Theme initialized to light on every React mount and was not restored from a durable preference. | Persist `gxa_theme`, respect an existing choice before system preference, and apply it before React renders. |
| Medium | duplicate implementation | The development server constructed a second minimal HTML document, omitting the language, color-scheme metadata, and theme bootstrap in `index.html`. | Transform the real `index.html` in development so E2E, local development, and production use the same shell. |
| Low | hardcoded light/dark color | Many older components still use paired Tailwind light/dark utilities. The inspected pairs render correctly once the root variant is fixed; replacing every working pair would exceed this focused task. | Retain working paired utilities and centralize the shared surfaces touched by this defect. |

Computed-style inspection found opacity `1` on the application shell, no visible full-screen overlay, and normal pointer events. The washed-out failure was therefore not a global opacity or stale-overlay leak.

## Theme-system changes

- A single `Theme` module now owns initial resolution and root application.
- `html.dark` and `html[data-theme="dark"]` are kept in sync; no inner-root theme class competes with them.
- The selected theme is persisted and system preference is used only when no explicit choice exists.
- `color-scheme` is applied for native form controls.
- A pre-render bootstrap prevents an avoidable wrong-theme flash.
- Semantic tokens cover page, surfaces, inputs, primary and secondary text, borders, primary actions, focus, disabled states, warning, success, danger, and overlays.
- Disabled presentation is tied to actual `:disabled` state; there is no page-wide opacity rule.

## Translator verification

The page background, shell, editors, source/target language controls, character counter, tone, keywords, preservation chips, checkboxes, Translate, Copy, Save, TXT, MD, HTML, JSON, Grammar Check, Humanize, AI Writer, warning message, helper text, selected states, hover states, focus states, and disabled states were rendered in both themes. Existing translation, saving, export, glossary, memory, and hand-off handlers remain unchanged.

## Export interaction

The shared Export menu preserves Plain Text (TXT), Markdown (MD), Word (DOCX), and Acrobat (PDF). It provides:

- click/tap to open;
- outside pointer and Escape to close;
- focus restoration to the trigger;
- Enter, Space, Arrow Up/Down, Home, and End keyboard behavior;
- `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`, menu and menuitem roles;
- one interaction boundary with no exposed pointer gap;
- no hover-only dependency and no blur race;
- viewport-safe width and an elevated layer above the editor;
- guarded, single execution and a safe inline export error state.

## Routes and states verified

Automated dark-root and overflow smoke checks cover Home, Paraphraser, Grammar Checker, AI Chat, AI Writer, Summarizer, Translator, PDF Tools, and Pricing. Authenticated checks cover Settings and Billing. Additional checks cover Login, Register, the upgrade dialog, the sidebar, Translator warning/disabled controls, Grammar active/inactive states, and the Export popover in light and dark themes. The public shell has no notification popover to exercise in the audited guest state; shared dialogs and menu layering were inspected at source and the upgrade dialog was rendered.

## Responsive and accessibility verification

Translator dark-mode screenshots cover 1440×1000, 1280×800, 1024×768, 768×1024, 430×932, 390×844, and 360×800. The mobile Export test verifies tap-only operation, viewport containment, and no document-level horizontal overflow. Automated interaction tests cover keyboard navigation and focus return. Axe checks report no serious or critical findings on Translator dark mode or Grammar dark mode with the Export menu open.

Reduced-motion, native control color scheme, visible global `:focus-visible` rings, menu semantics, dialog focus behavior, and non-color disabled states are preserved or improved.

## Visual evidence

Before captures:

- [Translator light](ux-audit/theme-export/before/translator-light-1280x800.png)
- [Translator dark — broken](ux-audit/theme-export/before/translator-dark-1280x800.png)
- [Grammar light](ux-audit/theme-export/before/grammar-light-1280x800.png)
- [Grammar dark — broken](ux-audit/theme-export/before/grammar-dark-1280x800.png)

Deterministic after baselines are stored beside `tests/e2e/theme-export.visual.spec.ts` and include Translator light/dark, Grammar light/dark, Export open, hovered, focused, and mobile dark states.

## Known limitations

- Visual baselines are Chromium/Windows-specific because that is the repository's configured Playwright project.
- The current Grammar DOCX and PDF handlers retain their pre-existing client-export implementation; this task stabilizes selection and does not change export file generation.
- No notification popover is present in the current public or guest shell, so only existing menus, dialogs, and tooltips were audited.

## Validation results

- `npm ci` — passed; 251 packages installed from the lockfile.
- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `npm test --if-present` — passed, 135 tests.
- `npm run test:e2e --if-present` — passed, 54 tests.
- `npm run test:visual` — passed, 21 deterministic screenshot tests.
- `npm run build` — passed with Vite 6.4.3; 1,909 modules transformed.
- `npm audit --omit=dev` — passed with zero vulnerabilities.
- Bundle/source credential scan — no real provider credential or browser-exposed provider secret found.
- `git diff --check` — passed.
