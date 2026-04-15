# Spec 01 — Newsletter Popup Component

## File

`src/ui/components/newsletter-popup.tsx`

## Summary

A timed modal popup that appears 5-10 seconds after page load, offering 10% off the first order in exchange for an email address. Uses Radix UI Dialog (already installed) with the project's dark design system.

## Behavior

### Display Logic

1. On mount, check `localStorage` for key `infinitybio_popup_dismissed`
2. If key exists and its value (ISO timestamp) is less than **30 days old** — do not show
3. If key does not exist or is older than 30 days — start a **7-second timer** (`setTimeout`)
4. After 7 seconds, open the dialog
5. Do **not** show the popup if the user is on a checkout page (path contains `/checkout`)

### Dismiss Logic

- Clicking the X button, clicking the overlay, or pressing Escape closes the dialog
- On close (regardless of reason), write `localStorage.setItem("infinitybio_popup_dismissed", new Date().toISOString())`
- After successful submission, also dismiss (with localStorage write)

### Submission Flow

1. User enters email and clicks "Get 10% Off"
2. Button enters loading state (spinner, disabled)
3. `POST /api/newsletter` with `{ email }` body
4. **On success** (200):
   - Show success state with the discount code from the response
   - Display: "Check your inbox! Your code: **{CODE}**"
   - Auto-dismiss after 5 seconds
5. **On error** (4xx/5xx):
   - Show inline error message from response body
   - Keep form interactive for retry
   - Specific messages:
     - 409: "This email is already subscribed!"
     - 429: "Too many attempts. Please try again later."
     - Other: "Something went wrong. Please try again."

### States

```
IDLE → LOADING → SUCCESS
                → ERROR → IDLE (retry)
```

## Component API

```tsx
"use client";

// No props — self-contained component
export function NewsletterPopup() { ... }
```

## UI Design

Follow the project's dark design system from `CLAUDE.md`:

### Modal Container

- Max width: `sm` (24rem / 384px)
- Background: `bg-neutral-900` with subtle border `border-neutral-800`
- Rounded: `rounded-2xl`
- Padding: `p-6 sm:p-8`
- Shadow: `shadow-2xl`

### Overlay

- `bg-black/60 backdrop-blur-sm` (matches existing Sheet overlay style)
- Animate: fade in/out

### Content Layout

```
┌──────────────────────────────┐
│                          [X] │
│                               │
│    🧬 (optional subtle icon) │
│                               │
│   Get 10% Off Your            │
│   First Order                 │
│                               │
│   Join our newsletter for     │
│   exclusive research updates  │
│   and your welcome discount.  │
│                               │
│   ┌────────────────────────┐ │
│   │  Enter your email      │ │
│   └────────────────────────┘ │
│                               │
│   ┌────────────────────────┐ │
│   │   Get 10% Off  →       │ │
│   └────────────────────────┘ │
│                               │
│   By subscribing, you agree  │
│   to our Privacy Policy.     │
│                               │
└──────────────────────────────┘
```

### Typography

- Heading: `text-2xl font-bold tracking-tight text-white`
- Body: `text-sm text-neutral-400`
- Privacy link: `text-xs text-neutral-500 underline`

### Input

- Full width
- Style: `bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500`
- Focus: `focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`
- Placeholder: "Enter your email"
- Type: `email`, required, `autocomplete="email"`

### Submit Button

- Full width
- Style: `bg-emerald-500 hover:bg-emerald-400 text-white font-medium`
- Loading state: replace text with a small spinner (CSS animation, no external lib)
- Disabled when loading or email is empty

### Close Button

- Absolute positioned top-right: `absolute top-4 right-4`
- Style: `text-neutral-500 hover:text-white`
- Icon: X from lucide-react (already installed)

### Success State

- Replace form with:
  - Checkmark icon (from lucide-react)
  - "Welcome to InfinityBio!"
  - "Your code: **{CODE}**" in `text-emerald-400 font-mono text-lg`
  - "We've also sent it to your inbox."

### Error State

- Red text below the input: `text-sm text-red-400`
- Input gets red border: `border-red-500`

## Animation

- Dialog enter: `animate-in fade-in-0 zoom-in-95 duration-200`
- Dialog exit: `animate-out fade-out-0 zoom-out-95 duration-150`
- Overlay enter: `animate-in fade-in-0 duration-200`
- Overlay exit: `animate-out fade-out-0 duration-150`

These match the existing patterns from `src/ui/components/ui/sheet.tsx`.

## Mounting Point

In `src/app/[channel]/(main)/layout.tsx`, add after the `CartDrawerWrapper`:

```tsx
<Suspense fallback={null}>
	<NewsletterPopup />
</Suspense>
```

The component is a client component (`"use client"`) that self-manages its visibility, so no server-side data is needed.

## Accessibility

- Radix Dialog handles focus trapping and Escape key natively
- `aria-label` on close button
- `aria-describedby` linking to body text
- Input has associated `<label>` (can be visually hidden with `sr-only`)
- Submit button has descriptive text (not just an icon)
- Overlay click closes dialog (Radix default)

## Edge Cases

| Case                                        | Behavior                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| User has JS disabled                        | Popup never shows — acceptable                                         |
| localStorage unavailable (private browsing) | Popup shows every session — acceptable, wrap in try/catch              |
| User navigates away during loading          | Request completes silently, no state update on unmounted component     |
| Multiple tabs open                          | Each tab checks localStorage independently — first dismiss affects all |
| Mobile viewport                             | Modal is responsive, max-width constrained, scrollable if needed       |
| Slow network                                | Loading spinner shows until response, 15s timeout before error         |

## Testing Notes

- Test with cleared localStorage to verify popup appears
- Test dismiss and verify popup doesn't reappear on refresh
- Test after 30 days (mock Date.now) to verify popup reappears
- Test on `/checkout` path — popup should not appear
- Test keyboard: Tab to email input, Enter to submit, Escape to close
- Test mobile viewport: modal should be centered, full-width with margins
