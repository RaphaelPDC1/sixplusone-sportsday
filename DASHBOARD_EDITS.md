# Dashboard Edits & Improvements

## Overview
This file tracks dashboard UI/UX improvements and data structure changes for the Sports Day 002 dashboard.

---

## 1. Mobile View — Fix Overlapping Top Navigation
**Status:** ✅ DONE

**What was done:** Tabs now scroll horizontally on mobile instead of wrapping/overlapping. Filters stack vertically on mobile, horizontally on desktop.

---

## 2. Combine Recommendations + Events Tabs
**Status:** ✅ DONE

**What was done:** Removed the standalone RECS tab. The EVENTS tab now includes an **AI RECOMMENDATIONS** section at the bottom. It analyses each team member's `teammateType` and `strongestEvent` questionnaire data and surfaces smart event recommendations (e.g. "You have 4 strategists — dominate TUG OF WAR"). Falls back to a placeholder message if no questionnaire data exists yet.

---

## 3. Remove "Captain Candidate" Field
**Status:** ✅ DONE

**What was done:**
- Dropped `captain_vote_interest` column from the database
- Removed from `drizzle/schema.ts`
- Removed from `server/routers.ts` (registration input, AI prompt, select queries)
- Removed from `client/src/pages/Enter.tsx` (registration form step)
- Removed "CAPTAIN CANDIDATE" badge from `client/src/pages/TeamHub.tsx` member rows

---

## 4. Match Team Captains to Registered Accounts
**Status:** ✅ DONE

**What was done:** All 7 registered captains moved to their correct teams in the database. Jerome/Slew (RED) not yet registered — will be placed on RED when they sign up.

| Team | Co-Captain 1 | Co-Captain 2 | Team Name |
|------|-------------|-------------|-----------|
| PINK | Verity (Vezza vee) ✅ | Henz ✅ | UNRULY |
| BLUE | Chigz ✅ | Axel ✅ | THE VILLAINS |
| ORANGE | Nahal ✅ | KING George ✅ | CHAOS |
| RED | Queen ✅ | Jerome/Slew ⏳ pending | RELENTLESS |

Teams are balanced: **28 / 28 / 28 / 28**

---

## 5. Display Team Captains at Top of Team Hub
**Status:** ✅ DONE

**What was done:**
- Added co-captains box at top of TEAM tab in TeamHub.tsx
- Each captain card is **clickable** — opens a detail modal with photo, name, IG handle, tagline
- Squad list below captains is **collapsible** by default to reduce scroll
- Hardcoded captain data (no DB dependency needed for now)

---

## 6. Zapier Integration — Stripe → Shopify Orders
**Status:** ⏳ On Hold (user handling Zapier setup)

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

## Completed Tasks Summary
- ✅ Mobile nav overlap fixed
- ✅ RECS tab removed, AI recommendations merged into EVENTS tab
- ✅ Captain Candidate field removed from DB, schema, backend, and all UI
- ✅ 7 captains matched and moved to correct teams, teams rebalanced to 28/28/28/28
- ✅ Co-captains box added to Team Hub (clickable cards + detail modal + collapsible squad)
