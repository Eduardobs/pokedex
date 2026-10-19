# Required project context

This document contains lasting definitions that every change to Atlas Pokémon must preserve.

## Definitions

- The colors and icons associated with Pokémon types must not be changed.
- The Stellar type uses its seven-facet crystal icon and a green, cyan, blue, violet, and pink gradient wherever a type badge is shown.
- Tera type references reuse each type's icon and colors inside a crystalline insignia; labeled references use the extended crystalline badge.
- The Mega Evolution icon must not be changed.
- The evolution tree must preserve and make the branches and conditions of every alternative evolution visually unambiguous.
- Evolution tree links must open the default variety of each species when the species name and the routable Pokémon name differ.
- Species list links must open each Pokémon's routable default variety.
- Related Pokémon lists in Explore resources must display an image, name, number, and, when relevant, the data that defines the relationship.
- The list of Pokémon required for evolution on gender pages must use the variety and artwork corresponding to the selected gender.
- Lists of a species' forms must display the artwork corresponding to each form when available, preserving the variety artwork as a fallback.
- The Pokédex and variations catalogs start with no type selected and allow up to two types, numbered by selection order; selecting a third replaces the oldest selection. The All button clears only the selected types.
- The variations catalog must combine search, region, sorting, type, rarity, and shiny display with the dedicated filters for regional forms, Mega Forms, and Gigantamax.
- Pokémon details opened from a catalog must offer a return path to the source catalog; without a recognized source, they must return to the Pokédex.
- Every vertically scrollable page must provide a global back-to-top control that is visible only when the page is not at the top.
- Damage classes must use the provided Pokémon Scarlet/Violet category sprites, with orange, blue, and gray for Physical, Special, and Status, respectively.
- The move list must display name, type, damage class, power, accuracy, and PP.
- The ability list must display name and description, indicating when the description does not exist in the selected language.
- Game maps must preserve the geography of the represented version and provide detailed zoom, navigation, and keyboard-accessible point-of-interest filters; the mouse wheel over the map must control zoom only, without scrolling the page.
- Maps must not shift the page when filters change or display an empty state when no category is selected.
- Pokémon Scarlet/Violet must provide separate maps for Paldea, Kitakami, and the Terarium.
- Pokémon Legends: Arceus must provide only the Hisui region map (`hisui-region`).
- Pokémon Legends: Z-A must provide only the Lumiose City map (`lumiose-city`).
- Search fields and selectors displayed side by side must use the shared components and have the same visual height.
- Source code, identifiers, comments, and test descriptions must be written in English; user-visible text must remain in the catalogs for the supported languages.
- Every translation must live in the corresponding file under `src/i18n/locales`; `messages.ts` must only compose and type the catalogs.
- Application route segments must be written in English, independently of the selected interface language.

- Explore collection search must cover the entire resource directory by original name or number, not only the current page.
- Mobile map filters must overlay the map without shifting its position and restore focus to their trigger when closed.
- The header must hide the Atlas Pokémon wordmark before replacing its navigation links with a hamburger menu at narrower widths.

- All paginated lists must use the shared pagination component with direct page selection and first/last navigation.
- Selectable item, move, nature, ability, and other option lists use alphabetical order while preserving semantic placeholder and numeric sequences.
- Resource lists under `/explore` preserve the PokéAPI numeric order.


- Random Battle OHKO moves faint a directly hit target immediately, using the regular accuracy check without a level gate; Protect, type immunity, and Substitute interception still prevent a direct hit.
- Random Battle Sky Drop spends one turn carrying its target and blocking attacks, then releases and deals damage on the next turn; the defender may switch while carried, cancelling the pending damage.
- Random Battle Gigaton Hammer and Blood Moon fail only when the same move succeeded on the immediately preceding turn; a failed execution permits another attempt and does not force recharge.
- Random Battle accuracy and evasion use separate stages from -6 to +6 with 3-based multipliers; hit probability is base accuracy times the user's multiplier divided by the target's multiplier, followed by Bright Powder and weather evasion modifiers.
- Random Battle does not implement Z-Move or Max Move activation.

## Maintenance

- Teams are saved locally in the browser, support multiple teams with at most six Pokémon each, and allow at most four compatible moves and one held item per member.
- A team can be exported as a versioned team file and imported without losing any editable team or member data.
- Team builds default to level 100, non-shiny, a concrete gender allowed by the species, and the Pokémon's first type as its Tera type; genderless species use the genderless value, EVs are limited to 252 per stat and 510 total, and IVs to 31 per stat.
- Team-member friendship is editable from 0 to 255 and defaults to 255; saved teams created before this field remain compatible and use the default until edited.
- Team-member friendship uses a slider with small and large heart endpoints, while keeping the current numeric value visible.
- Team builds keep level, shiny, and friendship aligned in one row; the gender control must remain usable without overflow on mobile screens.
- Gender uses icon-labelled radio controls, Tera types reuse the shared type icons and colors, and training can be reset to zero EVs and maximum IVs.
- A locally persisted team-level competitive preset documents unrestricted, singles, and doubles battle composition without enforcing seasonal ban lists.
- Random team creation saves a complete six-member team only after every selected Pokémon has loaded successfully, using the bundled Gen 9 Pokémon Showdown Random Battle set catalog and its species, type, weakness, level, Tera, and set-selection rules.
- Random Battle offers six pre-battle difficulty levels from Very easy to Expert; opponents use only revealed player Pokémon and moves, never the pending player action or private build data, and obey the same battle rules and resources as the player.
- Random Battle is a local singles battle at `/battle` between a complete saved team and a generated six-Pokémon opponent, reusing the team-builder data model.
- In Random Battle, each Pokémon may Terastallize once at the start of its selected turn, before either chosen move resolves.
- Random Battle applies entry hazards on every switch and honors pivot and forced-switch moves before the next action choice.
- Random Battle identifies each trainer with a sprite, live/knockout count, and six roster indicators; active Pokémon expose keyboard-accessible detail tooltips with exact allied data and bounded opponent information.
- Random Battle shows each Pokémon's configured gender beside its name in the field and detail tooltips.
- Random Battle information cards omit Pokédex numbers and keep the active Pokémon's name and gender left-aligned with its level right-aligned on the same row.
- Random Battle shows each active Pokémon's current type inside its information card without a generic type label and explicitly identifies an active Tera type.
- Random Battle anchors each active Pokémon's current and total HP inside the right edge of its HP bar.
- Random Battle shows altered stat stages directly below each active Pokémon's HP bar, using the same compact stat labels as its detail tooltip.
- Random Battle animates entry from a thrown Poké Ball, attacks, received hits, and fainting while respecting reduced-motion preferences.
- Random Battle tooltips are compact, 50% translucent, follow the pointer while it remains over their trigger, and never scroll internally.
- Active Pokémon detail tooltips are triggered only by their sprite, while remaining keyboard-accessible.
- Random Battle preserves each Pokémon sprite's intrinsic proportions without enlarging it, and keeps trainer summaries outside the battlefield.
- Random Battle move tooltips describe immunity, normal damage, reduced damage, and 2× or 4× super-effective damage in words.
- Random Battle replacement choices display Pokémon HOME sprites, and their tooltips identify each move with icon-only type and damage-class badges.
- Allied Random Battle tooltips display current calculated stats with compact labels; replacement tooltips also identify the selected ability and held item.
- Allied and replacement Random Battle tooltips keep all six stats on one row and distinguish increases and decreases from their original values with accessible green and red indicators.
- Opponent Random Battle tooltips reveal only the level-adjusted possible Speed range.
- Random Battle uses a move's PokéAPI Effect chance when resolving probabilistic secondary effects.
- Random Battle supplements PokéAPI move data with declarative local behavior when an effect is not available as structured API data.
- Random Battle makes Pain Split equalize the combatants' current HP and makes Substitute spend one quarter of maximum HP on a damage-absorbing decoy that disappears on switching.
- Random Battle resolves Curse from the user's current type: Ghost users sacrifice half their maximum HP to curse the target, while other users lower Speed and raise Attack and Defense.
- Random Battle models the major and temporary status conditions documented by Serebii, including their compatible combinations, turn effects, type and ability immunities, and switch behavior.
- Random Battle tracks timed weather, terrain, Trick Room, screens, and Tailwind effects and applies their combat modifiers.
- Random Battle visibly identifies active field, side, and Pokémon conditions; weather effects display their remaining turns, and Future Sight displays its countdown, while other remaining durations stay hidden.
- Random Battle uses the supplied color and icon treatment for its six major status conditions and identifies entry hazards on the affected side of the field.
- Random Battle Encore lasts a randomly selected two to six actions and ends when the affected Pokémon switches or the repeated move runs out of PP.
- Move detail pages display the local supplemental battle behavior when the selected move has one.
- Random Battle resolves combatants' actions sequentially after a configurable presentation delay, announcing each move over its user and completing that combatant's HP and effect presentation before announcing the next action or accepting another choice.
- Random Battle briefly displays a localized miss announcement over the intended target, fading in and out while respecting reduced motion.
- Random Battle active Pokémon information has no card background or fixed height, places current types beside gender, and keeps the battlefield height stable as conditions and modifiers change.
- Random Battle keeps the full action history in a fixed-height, scrollable battle log that follows newly added actions.
- Random Battle move choices display each move's priority alongside its remaining PP.
- Move names in the Random Battle log expose the move's type, damage class, priority, and localized description in a keyboard-accessible tooltip.
- Move names in the Random Battle log also expose the move's power and accuracy.
- Random Battle applies held-item stat and damage modifiers, immediate and end-of-turn triggers, and one-use consumption at their battle timing.
- Random Battle ability audits cover every PokéAPI ability with an ID from 1 through 314, exclude IDs above 10000, and keep prose-only battle rules in a structured local supplement without treating a detected handler as proof of full parity.
- Random Battle is controlled by a build-time feature flag and is enabled by default.
- On narrow screens, Random Battle prioritizes the battlefield first, action controls second, and the battle log last.
- On narrow screens, Random Battle keeps move and replacement-choice lists in two columns.
- Team members are edited in tabs with Pokémon thumbnails and names; EV sliders must preserve the same limits as numeric inputs.
- Team member tabs can be reordered by dragging their headers, with an equivalent keyboard action and a visible insertion indicator while dragging.
- Team move selectors display the move name, type, damage-class icon, power, accuracy, and PP inside each option. Nature labels show their stat modifiers when applicable.
- Team move and item selectors use progressively loaded searchable lists. Item options display the item icon, localized name, and description.
- Team member tabs use Pokémon HOME sprites above the Pokémon name, and gender is edited through a radio selection.
- Team training offers an explicitly applied Showdown-style estimated EV and Nature spread based on the member's four moves, item, ability, level, and base stats; manual training remains available.
- The MapGenie integration is controlled by a build-time feature flag and is enabled by default.

- Record in this section every new lasting, project-wide definition introduced by a request.
- Write each definition briefly and unambiguously, without temporary implementation details.
- Do not change or remove an existing definition without explicit user instruction.
