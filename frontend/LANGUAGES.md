# Interface languages

The main platform supports English, Hindi and Tamil. Choose a language on the login screen, in the top header, or in Settings. Changes take effect without navigation or form resets. The browser stores the choice under `crispr.language`; other tabs synchronize through storage events. English is the default and fallback. Blocked storage still allows switching for the current session.

CRISPR terminology is bundled in the open source translation catalog and works entirely offline. Existing cached translations from earlier versions remain readable. Text missing from the catalog remains in English until it is added to `src/lib/translations.ts`.

Coverage includes navigation for all workspaces, breadcrumbs, account actions, login copy, settings controls, common table headers and severity labels, selected page headings and dashboard metrics. Remaining page descriptions, tooltips, backend errors, report content and AI responses retain their original language. The separate `crispr_products` showcase and bug-bounty portal are outside this implementation.

Use `useLanguage().t('English source text')` for interface copy and add matching Hindi and Tamil entries to `src/lib/translations.ts`. Keep hooks above conditional returns. Do not translate identifiers, API enum values, organization evidence, asset names or monetary values. Command search accepts both English and translated page names.

Verification: run `npm run build`; select each language, navigate, reload, and check another tab. Also check keyboard selection, the document `lang` attribute, invalid stored preferences, and switching while a login form contains unsaved input.
