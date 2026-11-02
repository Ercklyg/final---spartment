# Accessibility audit

Audit scope: sign-in and recovery, administrator and tenant navigation, billing,
requests, customer-service forms, dialogs, loading states and responsive layouts.

## Current safeguards

- Forms use visible labels or explicit accessible names.
- Loading, success and error feedback uses status/alert semantics.
- Native dialogs restore focus; the custom customer-service dialog now moves
  focus inside, traps Tab/Shift+Tab, closes with Escape and restores launcher
  focus.
- Interactive controls have visible keyboard focus, and primary actions meet a
  minimum touch-friendly height.
- Data tables include headings/captions where needed, while responsive views
  provide equivalent card/list content.
- Decorative loading blocks are hidden from assistive technology.
- Motion-sensitive effects respect the reduced-motion preference.
- The maintenance attachment picker now has an explicit accessible name.

## Automated coverage

`Backend/e2e/critical-workflows.spec.js` verifies the customer-service dialog's
initial focus, Escape behavior and focus restoration in desktop and mobile Chrome.
The normal frontend lint/build and browser workflow suite must remain required
before deployment.

## Manual release check

Automation does not prove full WCAG conformance. Before a major release:

1. Complete sign-in, admin navigation, tenant navigation, billing and request
   submission using only Tab, Shift+Tab, Enter, Space and Escape.
2. Repeat the core flows with NVDA on Windows or VoiceOver on macOS/iOS.
3. Test at 200% browser zoom and at 320 CSS pixels without horizontal page
   scrolling or hidden actions.
4. Check normal text, muted text, status badges and focus indicators with a
   WCAG contrast analyzer.
5. Verify errors identify the affected field and do not rely on color alone.
6. Verify every newly added dialog keeps focus inside and returns it to the
   control that opened it.

Record defects as release blockers when they prevent keyboard or screen-reader
users from completing authentication, payment review or maintenance requests.
