# Mobile Optimization Plan

This document lists recommended changes to optimize the app for mobile (≤ 640px) while preserving desktop UX. It groups work by feature area and prioritizes items that reduce horizontal overflow, improve touch targets, and simplify dense layouts.

## Guiding principles
- Prefer vertical stacking on mobile; avoid multi-column content unless necessary.
- Avoid horizontal scroll for primary flows. Use responsive “card” lists instead of tables where feasible.
- Maintain minimum 44px touch targets for interactive elements.
- Keep header/nav visible but compact; avoid consuming > 15% of viewport height.
- Use semantic theme tokens for colors; keep spacing responsive (smaller on mobile).

## Global
- Layout
  - Add container padding responsive ramp: `px-3 sm:px-4 md:px-6` on main page wrappers if missing.
  - Reduce large paddings globally where used: prefer `p-4 sm:p-6` over fixed `p-6`.
  - Ensure lists/cards use `gap-3 sm:gap-4`.
- Typography
  - Scale headings: `text-xl sm:text-2xl`, page titles `text-2xl sm:text-3xl`.
  - Body text: keep `text-sm` base on mobile where density is high.
- Dialogs (src/components/ui/dialog.tsx)
  - Add `max-h-[85vh] overflow-y-auto` to DialogContent to prevent off-screen content.
  - Consider a sheet-style dialog on mobile (slide up) for complex forms.
- Safe areas
  - Add `padding-bottom: env(safe-area-inset-bottom);` to fixed footers/toolbars if added later.

## Navigation (src/Dashboard.tsx)
- Current segmented tabs look good on desktop; on mobile:
  - Make nav horizontally scrollable: wrap in `overflow-x-auto` container and add `whitespace-nowrap` to buttons.
  - Provide an optional compact dropdown (Select) on very narrow widths (≤ 360px) hidden on `sm:` and up.
  - Reduce padding on tab buttons: `px-3 py-2 sm:px-4`.

## Filters and control bars
- Messages table filters (src/components/messages-data-table.tsx)
  - Stack controls on mobile: wrap row in `flex flex-col sm:flex-row gap-2 sm:gap-4`.
  - Make inputs full-width on mobile: `w-full` (already used for search container) and move select triggers to `flex-1` where helpful.
  - Add a “Filters” collapsible/Drawer on mobile to hide advanced controls (grouping, columns) to a bottom sheet.

## Tables → Mobile Cards
Many screens use tables which are hard to use on small screens. Implement a mobile card view for ≤ sm breakpoints and keep tables for `md:` and up.

- Messages (src/components/messages-data-table.tsx + src/components/message-columns.tsx)
  - Add a responsive wrapper that renders:
    - `md:block` table (existing), and
    - `block md:hidden` list of cards.
  - Card content: recipient, message preview (clamped), scheduled time, status badge, overflow menu for actions. Keep inline edit desktop-only.
  - Add `overflow-x-auto` around the table with a `min-w-[720px]` to avoid cramped columns on small tablets.
- Contacts (src/components/ContactsTab.tsx)
  - Table is wrapped with `overflow-x-auto` (good), but add a `block md:hidden` card list:
    - Name, phone, email/notes condensed; action buttons in a row with touch targets ≥44px.
- Groups (src/components/GroupsTab.tsx)
  - Left list and right members panel become stacked: `grid-cols-1 lg:grid-cols-2` already present. On mobile, ensure the left list cards have large taps; the right panel should stack member rows and provide a single FAB-style “Add Member” action.
- Delivery screens (DeliveryManagementTab.tsx, DeliveryHistoryView.tsx)
  - Replace metric tiles `p-6` with `p-4` on mobile. Ensure stat grid is `grid-cols-2` on mobile instead of 4–5 columns.

## Forms and inputs
- Most forms already use `grid grid-cols-1 md:grid-cols-2` (good). Improve mobile ergonomics:
  - Increase vertical spacing between controls: `space-y-3 sm:space-y-4`.
  - Replace select-heavy time pickers with native inputs on mobile where practical (`input[type=time]`, `input[type=date]`). In Messages Selected scheduling (MessageSelector), there’s a select with 96 options; prefer native pickers on mobile.
  - Ensure all buttons meet touch target: add `min-h-[44px]` where needed.

## Spacing and chips
- Lesson and message chips use accent tokens (good). Ensure they wrap gracefully:
  - Add `max-w-full truncate` or `break-words` where long text may overflow.
- Reduce card padding: `p-4 sm:p-6` across StudyBookManager, PredefinedMessageManager, lesson cards.

## Breadcrumbs and section headers
- Files: LessonContentTab.tsx, StudyMessagesTab.tsx, StudyBookBrowser.tsx
  - Replace legacy gray/blue colors with theme tokens on remaining elements (StudyMessagesTab still uses some `text-gray-*`/`text-blue-*`).
  - Add responsive typography: `text-xl sm:text-2xl` and `text-sm sm:text-base` for subtitles.

## Buttons and action groups
- Convert inline text links (Edit/Delete) to a kebab menu on mobile to avoid tiny touch targets.
- For destructive actions, keep confirm dialogs; use full-width buttons inside dialogs for easier tapping.

## Performance
- Lazy-load secondary/admin tabs (Delivery, API Keys) using dynamic import with React.lazy + Suspense.
- Defer rendering of heavy tables until visible (intersection observer or route/tab-based code split).

## Accessibility
- Ensure focus states visible on mobile: keep ring tokens.
- Provide aria-labels on icon-only buttons and menus.

## Testing checklist
- iPhone SE/13 Pro Max, Pixel 5/7 widths; landscape rotations.
- Tables: verify no horizontal scroll for primary flows; where scroll exists, header stays visible and rows readable.
- Dialogs: verify tall content scrolls within dialog and not the page; keyboard safe.

## Implementation outline
1) Global polish
   - index.css: add a `.mobile-card` utility and responsive spacing helpers if needed.
   - DialogContent: add `max-h-[85vh] overflow-y-auto`.
2) Dashboard tabs
   - Wrap tabs in `overflow-x-auto`, add `whitespace-nowrap`, responsive padding.
   - Optional: `sm:hidden` Select to switch tabs.
3) Filters
   - Stack on mobile; add mobile “Filters” sheet component (reuse Dialog or Drawer).
4) Messages mobile cards
   - Create `src/components/messages-mobile-list.tsx` that renders the same data set as cards.
   - Toggle rendering via `block md:hidden` vs `hidden md:block` for table.
5) Contacts mobile cards
   - Add card list with primary actions; keep edit/delete in menu.
6) Groups mobile flow
   - Ensure left list uses larger touch targets; right panel stacks cleanly.
7) Delivery screens
   - Adjust stat grid and paddings; convert buttons to tokenized variants and responsive sizes.
8) Typography & spacing
   - Sweep headers/subtitles for responsive text classes and spacing reductions on `sm:`.
9) QA pass
   - Manual test on mobile emulators; fix any lingering overflow.

---

# File-by-file notes (reference)
- src/components/messages-data-table.tsx: heavy table; add mobile card view and table overflow wrapper. Filters row should stack on mobile.
- src/components/ContactsTab.tsx: add mobile card list; keep existing overflow-x-auto for table.
- src/components/GroupsTab.tsx: many legacy gray/blue utilities; convert to theme tokens and ensure mobile spacing.
- src/components/DeliveryManagementTab.tsx & DeliveryHistoryView.tsx: reduce paddings on tiles, make grids 2-up on mobile.
- src/components/StudyMessagesTab.tsx: still has legacy `text-gray-*` and `text-blue-*`; migrate to tokens and responsive sizes.
- src/components/StudyBookBrowser.tsx: convert badges and buttons to tokens; responsive grid already good; reduce `p-6` to `p-4` on mobile.

## Milestones
- M1: Global and nav + filters
- M2: Messages mobile cards (largest UX win)
- M3: Contacts mobile cards
- M4: Delivery + Groups polish
- M5: Typography/spacing sweep and QA


