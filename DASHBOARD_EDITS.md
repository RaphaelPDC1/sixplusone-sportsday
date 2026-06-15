# Dashboard Edits & Improvements

## Overview
This file tracks dashboard UI/UX improvements and data structure changes for the Sports Day 002 dashboard. Claude will work from this list in the GitHub repo.

---

## 1. Mobile View — Fix Overlapping Top Navigation
**Status:** [ ] Not Started

**Issue:** Top navigation options are cramped and overlapping on mobile view.

**Solution:**
- Review responsive breakpoints in dashboard navigation
- Stack navigation items vertically on mobile (< 768px)
- Ensure touch targets are at least 44×44px
- Test on iPhone/Android devices

**Files likely involved:**
- `client/src/components/DashboardLayout.tsx`
- `client/src/index.css` (Tailwind responsive classes)

---

## 2. Combine Recommendations + Events Tabs
**Status:** [ ] Not Started

**Current state:** Two separate tabs — "Recommendations" and "Events"

**Goal:** Merge into one unified view where:
- AI analyzes questionnaire answers from participants
- AI recommends optimal team combinations based on answers
- Events are displayed alongside recommendations
- AI suggests which participants should be assigned to which activities

**Benefit:** Eliminates redundant navigation, AI can make smarter cross-activity recommendations.

**Implementation notes:**
- Merge tab logic in dashboard
- Enhance AI prompt to consider both questionnaire data AND event requirements
- Display recommendations as interactive cards (drag-to-assign or click-to-confirm)

**Files likely involved:**
- `client/src/pages/Dashboard.tsx` or `client/src/components/DashboardLayout.tsx`
- `server/routers.ts` (AI recommendation procedure)

---

## 3. Remove "Captain Candidate" Field
**Status:** [ ] Not Started

**Current state:** All participants have a "captain_candidate" field (boolean or enum).

**Goal:** Remove this field entirely — we now have dedicated team captains.

**Steps:**
1. Remove `captain_candidate` column from `participants` table (database migration)
2. Remove UI references in participant cards/forms
3. Remove from API responses

**Files likely involved:**
- `drizzle/schema.ts` (schema definition)
- Database migration SQL (run via `webdev_execute_sql`)
- `server/db.ts` (query helpers)
- `server/routers.ts` (API procedures)
- `client/src/components/ParticipantCard.tsx` or similar

---

## 4. Match Team Captains to Registered Accounts
**Status:** [ ] Not Started

**Team Captains (to match to user accounts):**

| Team | Co-Captain 1 | Co-Captain 2 | Team Name |
|------|-------------|-------------|-----------|
| PINK | Verity | Henry | UNRULY |
| BLUE | Chigz | Axel | THE VILLAINS |
| ORANGE | Nahal | George | CHAOS |
| RED | Queen | Slew | RELENTLESS |

**Goal:** Link each captain name to their registered user account (by email or user ID).

**Steps:**
1. Find each captain's user record in the database
2. Create a `team_captains` table or add `captainIds` to `teams` table
3. Link both co-captains to their team
4. Ensure captains are marked with a `role: "captain"` or similar flag

**Files likely involved:**
- `drizzle/schema.ts` (add team_captains table or extend teams table)
- Database migration SQL
- `server/db.ts` (query helpers for fetching captains)

---

## 5. Display Team Captains at Top of Dashboard
**Status:** [ ] Not Started

**Current state:** Captains are mixed in with regular participants.

**Goal:** Show team captains prominently at the top of the dashboard in a dedicated section.

**Design:**
- **4 boxes, one per team** (PINK, BLUE, ORANGE, RED)
- Each box displays **both co-captains** for that team
- Box styling matches team colour
- Show captain names, team name, and team logo/badge
- Optionally show captain contact info or status

**Example layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                    TEAM CAPTAINS                             │
├──────────────┬──────────────┬──────────────┬──────────────┤
│   PINK       │    BLUE      │   ORANGE     │     RED      │
│  UNRULY      │ THE VILLAINS │    CHAOS     │  RELENTLESS  │
│              │              │              │              │
│ Verity       │ Chigz        │ Nahal        │ Queen        │
│ Henry        │ Axel         │ George       │ Slew         │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Implementation:**
- Create a new `TeamCaptainsSection.tsx` component
- Fetch captain data from `server/routers.ts` procedure
- Style boxes with team colours (use existing TEAM_CONFIG)
- Position at top of dashboard (above Recommendations/Events section)

**Files to create/modify:**
- `client/src/components/TeamCaptainsSection.tsx` (new)
- `client/src/pages/Dashboard.tsx` or `client/src/components/DashboardLayout.tsx`
- `server/routers.ts` (add procedure to fetch captains by team)

---

## 6. Zapier Integration — Stripe → Shopify Orders
**Status:** [ ] On Hold (waiting for Zapier setup)

**Goal:** When a participant completes payment on Sports Day site (Stripe), automatically create an order in Shopify for their shirt.

**Steps:**
1. Set up Zapier account (free tier available)
2. Create Zap: Stripe trigger (payment.intent.succeeded) → Shopify action (create order)
3. Map Stripe payment data to Shopify order fields:
   - Customer name → Shopify customer
   - Team colour → Shirt variant (red/blue/pink/orange)
   - Amount → Order total
4. Test with a test payment

**Shopify product:** https://6plus1.co.uk/products/sports-day-002-tee

**Notes:**
- Requires Shopify plan upgrade OR Shopify Partner account to generate API token
- Zapier is the easiest no-code solution

---

## Priority Order
1. **High:** Remove Captain Candidate field (data cleanup)
2. **High:** Match captains to accounts (prerequisite for display)
3. **High:** Display captains at top (UI improvement)
4. **Medium:** Combine Recs + Events (UX improvement)
5. **Medium:** Fix mobile navigation (responsive fix)
6. **Low:** Zapier integration (requires external setup)

---

## Questions for Claude
- Should captains have special permissions (e.g., edit team members)?
- Should captains be excluded from regular participant lists?
- Any specific styling preferences for the captain boxes?
- Should clicking a captain open their profile or allow editing?

---

## Completed Tasks
(None yet)
