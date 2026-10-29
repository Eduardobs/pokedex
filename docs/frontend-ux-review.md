# Frontend UI/UX review

Date: 2026-10-28

## Scope and method

Heuristic review of the route structure, shared controls, styles, and page composition: Home, Pokédex, forms, favorites, Pokémon details, Explore directories and resource details, move comparison, type calculator, maps, teams, and battle preparation. Reviewed keyboard interaction, localization, narrow-screen composition, and loading/error/empty recovery. This is an implementation review, not user research or a claim of exhaustive assistive-technology certification.

The existing visual identity, type colors and icons, font hierarchy, route contracts, and domain rules remain the baseline. Existing shared filters, pagination, skeletons, and recovery actions already solve several core usability needs; replacing them would introduce inconsistency.

## Findings and applied improvements

| Priority | Area                | Evidence and user impact                                                                                                                                             | Applied improvement                                                                                                                                               |
| -------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Mobile navigation   | The focus loop captured links once before submenu expansion, including hidden links. Tab could miss newly displayed destinations or attempt to focus hidden content. | Resolve currently visible navigation targets for each Tab event; preserve Escape and trigger focus restoration. Browser regression covers expansion and wrapping. |
| High     | Team deletion       | The modal confirmation initially focused Cancel but did not contain keyboard focus. Users could reach background actions during a destructive confirmation.          | Wrap Tab and Shift+Tab within confirmation actions; keep Cancel as the initial action and preserve Escape.                                                        |
| High     | Search continuity   | Removing a query also removes its focused clear button. Focus could fall back to the document rather than support the next query.                                    | Focus the shared search input before clearing; also restore global-search focus. Respect disabled and read-only fields.                                           |
| Medium   | Selectors           | Arrow keys and Home/End worked, but long option lists required repeated traversal.                                                                                   | Add incremental, accent-insensitive typeahead, with repeated-letter cycling. Focus movement does not commit a selection.                                          |
| Medium   | Home task discovery | The hero and quick cards concentrated on reference browsing; team building, type analysis, and game maps required discovering navigation groups.                     | Add a distinct three-card task section using real routes, short explanatory copy, and all three locales.                                                          |
| Medium   | Error feedback      | Shared inline retry errors displayed text without an announcement role.                                                                                              | Announce the error message as an alert while keeping the retry button independently operable.                                                                     |
| Medium   | Focus and touch     | Global focus used a translucent outline; basic selector options had a 40px minimum height.                                                                           | Use the theme accent for a solid focus outline; raise basic options to 44px and allow long labels to wrap.                                                        |
| Medium   | Narrow screens      | Search text below 16px can trigger browser zoom on mobile; long active-filter values could stretch a chip.                                                           | Use 16px shared search text at the compact breakpoint and constrain/wrap filter chips.                                                                            |
| Low      | Long selector lists | Scrolling an option panel could propagate into the page.                                                                                                             | Contain scroll chaining and reserve scroll padding around option focus.                                                                                           |

## Assessment by journey

- **Home → catalog → detail:** the primary Pokédex action is already clear. Preserve query-string filter state, source-aware back links, and the existing detail tabs. The search-focus fix improves repeated exploration across catalogs.
- **Pokédex, forms, favorites:** shared controls provide consistent search, region, sorting, rarity, type selection, and shiny display. Active chips expose hidden filter state; reset actions recover from no results. Favorites distinguish an empty collection from an empty filtered result. Preserve these distinctions and the type-selection order contract.
- **Explore → collection → resource:** grouped categories, quick tools, full-directory search, pagination, and breadcrumbs provide progressive disclosure. Shared search and selector improvements apply without changing numeric resource order.
- **Pokémon details:** information cards, tabbed content, stable artwork space, evolution branches, and dedicated loading/error states organize dense information. Preserve the branch structure and established badges rather than compressing biological relationships into ambiguous rows.
- **Move comparison and types:** paired inputs and attribute rows support comparison; the compact type matrix disclosure reduces mobile density. Maintain keyboard navigation and explicit damage labels rather than relying only on colors.
- **Maps:** the shared map shell already provides overlay filters, keyboard navigation, zoom, and a stable map viewport. Preserve per-game geography and empty-selection behavior. The Home shortcut improves discoverability without changing map interactions.
- **Teams:** persistent builds, member tabs, import/export, and explicit deletion confirmation support a longer workflow. The confirmation focus fix addresses a concrete interruption risk; selectors gain typeahead and consistent touch targets.
- **Battle:** preparation already explains difficulty and offers a team-builder recovery path when no complete team exists. Preserve battlefield/action/log ordering on narrow screens and the established tooltip information boundaries. No combat mechanics changed.

## Visual system decisions

Use existing surface, text, border, and accent variables for both themes. New task cards follow the existing Outfit heading and DM Sans body hierarchy, stack below 720px, and introduce no animation. Preserve type/battle semantic colors and existing reduced-motion rules. Keep descriptive copy local to each translation dictionary.

## Verification

Behavior tests cover shared search focus and disabled clearing, selector typeahead, error announcements, Home destinations, and confirmation focus wrapping. Browser regressions cover mobile navigation expansion and narrow-screen task cards in light/dark themes. Existing suites cover catalog filtering, maps, pagination, teams, and battles. See the delivery summary for the actual check results and any environment limitations.

## Follow-up: mobile battle details

The hover interaction overloaded move and replacement buttons: a touch could execute an action before the user could read its details. Fixed-position tooltip placement also assumed enough viewport height, while existing description clamps made complete prose inaccessible visually.

On narrow screens and devices without hover, battle details now use a native modal reading panel. Move and replacement cards have a separate 44px information control; sprites, revealed roster entries, and move names in the history open the same presentation by touch or keyboard. Panels reuse the existing React content and opponent-information limits, show full descriptions, and retain all six allied stats in a single row. Long content scrolls at the overlay level with a sticky close control; the tooltip content itself has no scroll container. Closing restores focus and unlocks background scrolling. Mouse/desktop tooltips retain their pointer-following behavior.

Coverage includes mobile inspection without executing moves, full description visibility, closing/focus restoration, active Pokémon, replacement details, and history details. Browser tests use deterministic API fixtures at 320px and 390px, including dark theme.
