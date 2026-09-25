# Authenticated application shell QA

Status: automated checks are reported separately. Completed live checks are scoped
in the evidence section below; unchecked browser/device items remain pending. This is a frontend-only shell;
there are no Profile, Messages, Board, Discover/Network or Opportunities controls.

## Test accounts and entry paths

- [ ] Completed Artist, Venue and Promoter: returning Login enters the correct Home inside one header.
- [ ] Restore each completed session from a cold start without a Login flash.
- [ ] Incomplete account resumes its exact onboarding step with no global header.
- [ ] First completion still shows Welcome; Enter opens the correct Home without Back returning to Welcome/Login.
- [ ] Upload a Venue profile image during onboarding: first Welcome → Enter shows it in Home and the opened Account menu without signing out. Repeat with a slow /me response and retry a failed identity read from Welcome.
- [ ] Login, every signup route, onboarding, Welcome and OAuthResult have no global header.
- [ ] Cold provider return restores the session and opens OAuthResult outside the shell.

## Web layout

- [ ] Large desktop (1440+), approximately 1024, both sides of 768, and narrow 320/390 widths.
- [ ] Existing logo, NAV and Account all remain visible; no hamburger or extra destinations.
- [ ] Full-width header background; the single 1px #2b303a divider starts/ends with the centered 1200-max content rail and shared 20/32/48 gutters. No outer border/shadow.
- [ ] Account trigger always uses the square account glyph, never the user's photograph: Artist blue → violet, Venue violet, Promoter blue. Desktop keeps name/chevron; compact keeps the icon visible beside NAV.
- [ ] Long account name truncates on one line in the header; Account identity is bounded to two lines in its menu.
- [ ] Opened Account menu retains the actual profile image. Missing image uses known-name initials; unknown name uses a neutral square. No circular image or invented A.
- [ ] Broken Account menu image falls back once; a replacement URL can load successfully. Home's image remains unchanged.
- [ ] Both menus remain within the viewport, including after resize and on short viewports.
- [ ] Only Home content scrolls while the header remains visible; no second document scrollbar.
- [ ] Check enlarged browser text/zoom and narrow-width fit before changing logo size.

## Web keyboard and pointer

- [ ] Tab reaches logo, Nav and Account with a visible focus boundary; decorative/backdrop elements are not Tab stops.
- [ ] Enter and Space open either menu and focus its first action.
- [ ] ArrowUp/ArrowDown work; Home/End select the first/last action where applicable.
- [ ] Enter/Space activate exactly once. Current Home stays neutral until hover, keyboard focus or press; route awareness alone adds no visual indicator.
- [ ] Pointer-opened Home and Sign Out remain neutral. Hover/keyboard focus/press uses Artist blue → violet, Venue violet or Promoter blue; pointer leave/blur/release clears it.
- [ ] Escape closes and returns focus to its trigger.
- [ ] Forward and Shift+Tab close the menu and continue normal traversal relative to its trigger.
- [ ] From a pointer-opened trigger, Tab/ArrowDown enters the first item; ArrowUp/End enters the last item. Keyboard focus remains visibly accented.
- [ ] Outside click closes without stealing focus from the clicked control.
- [ ] Opening Account closes Nav and vice versa; clicking an open trigger closes it.
- [ ] Logo and Nav/Home share the persona destination without remounting the shell.
- [ ] Navigation closes any open menu.
- [ ] Screen reader exposes labeled buttons, expanded state, menu relationship and menu items.

## Identity and session exit

- [ ] Throttle /me: logo, Nav and Account render immediately; Sign Out stays available.
- [ ] Recoverable /me failure: account glyph stays usable, session persona accent remains available, neutral menu identity and usable Sign Out, existing Home error state.
- [ ] Verify one shared /me request on cold shell + Home entry; no header-specific request.
- [ ] Explicit Sign Out clears session/cache and resets to Login without an expiry notice or Back access to Home.
- [ ] Actual session expiry exits the whole branch and shows the expiry notice once.
- [ ] Switch accounts: no old name/image or previous user's cached identity appears.

## Android

- [ ] Top inset and light status bar blend into the navy header; row height excludes the inset.
- [ ] No duplicated Home top inset; bottom content clears the system gesture/navigation area.
- [ ] Nav and Account are usable with touch and TalkBack; expanded/collapsed state is announced.
- [ ] Account has a 48px minimum touch target with a 44px square icon container; verify all three persona accents, menu photograph, and no logo/NAV/icon crowding.
- [ ] Touch outside dismisses; hardware/system Back dismisses an open menu before navigating.
- [ ] Sign Out exits the whole branch; Back cannot reveal it.
- [ ] Home scroll remains independent of the header; menus clamp on narrow/short windows.
- [ ] Check orientation/multi-window where the device/app configuration permits it.

## iOS (pending when an iOS device/simulator is available)

- [ ] Repeat entry, layout, image fallback, menu, Sign Out and scrolling checks.
- [ ] Check notch/top safe area, light status bar and bottom home-indicator clearance.
- [ ] VoiceOver reaches triggers and open-menu actions without exposing covered page content.
- [ ] Outside tap dismisses and existing navigation gestures do not leave an orphaned overlay.

## Automated coverage versus manual evidence

The tests exercise the actual root/child navigators, shared RTK Query cache,
session controller and exit navigation with mocked transport responses. React
Native Web DOM tests cover menu keys, expanded state, focus entry/return and
pointer dismissal. Native BackHandler and inset composition have component tests.

JSDOM does not perform browser layout or native Tab traversal. Jest native mocks
do not prove physical-device Back handling, safe-area appearance, font rendering,
screen-reader behavior or scrollbar behavior. Those remain the checks above.

## QA-fix verification evidence (2026-09-25)

- Automated: 72 suites / 569 tests pass; TypeScript and Git whitespace checks pass.
- Live Web, completed Venue account: inspected at 1440, 768, 390 and 320 CSS pixels.
  Full-width background has no outer border; divider is 1px #2b303a, bounded at
  x=120..1320 (1440), x=32..736 (768), x=20..370 (390), x=20..300 (320).
- Venue trigger is a violet account glyph with no photograph. Desktop retains
  name/chevron; compact retains the directly visible icon. At 320, logo, NAV and
  Account do not overlap and document width remains 320. Account touch target
  is 50x48 compact, with a 44x44 icon container.
- Opened Venue Account menu loads the actual image; Home retains its actual image.
  Verified Enter/Space opening, mutual menu exclusion, Escape and focus return.
- Still pending: live Artist/Promoter appearance, real upload → completion →
  Welcome → first Home reproduction, and Android device checks. No Android
  device/emulator was connected during this pass. Automated regression covers
  stale cached /me, an older in-flight /me, failure/retry at Welcome, both image
  consumers, all three persona accents, responsive rail structure, and native Back.

## Menu interaction-state verification (2026-09-25)

- Automated: 74 suites / 608 tests pass; TypeScript and Git whitespace checks pass.
  Real Web DOM tests cover neutral pointer opening, hover/leave, focus/blur,
  roving keyboard focus and current-route neutrality for all three personas.
  Native responder tests cover press/release and action delivery for both rows
  across all personas. Existing dismissal, expanded-state and Back tests pass.
- Live Venue Web: both Home and Sign Out open neutral, gain #8b5cf6 treatment
  on pointer entry, and return to neutral on exit while the menu stays open.
  Verified ArrowDown/Tab entry, Tab exit, Space opening, Escape and focus return.
- Artist gradient and Promoter blue have automated coverage; live checks pending.
