# 6+1 Sports Day 002 — TODO

## Phase 2: Database & Design System
- [x] Upload 6+1 logo to static assets
- [x] Update Drizzle schema with sports_day_registrations and group_codes tables
- [x] Run migration and apply SQL
- [x] Configure design system (CSS variables, Bebas Neue + DM Mono fonts, dark theme)

## Phase 3: Backend API
- [x] Registration endpoint (sportsday.register)
- [x] Team assignment logic (load-balanced random across 4 teams)
- [x] Referral code generation (name prefix + random suffix)
- [x] Klaviyo tags JSON storage
- [x] Shopify webhook handler (POST /api/shopify/webhook)
- [x] User status endpoint (sportsday.getUserStatus)
- [x] Admin procedures (stats, user list, health notes)
- [x] Group code create/join logic (sportsday.verifyGroupCode)
- [x] Profile + tagline generation (15 archetypes)

## Phase 4: Landing Page & Registration Form
- [x] Landing page with 6+1 logo, animated dot grid, bold headline, ENTER THE SYSTEM → CTA
- [x] 14-step multi-step form with horizontal slide transitions
- [x] Orange progress bar
- [x] Auto-advance on single-select answers
- [x] All form fields: name, email, instagram, attended before, solo/group, dates, competitiveness, teammate type, strongest event, fear, motivation, captain vote, shirt size/fit, health notes, content consent
- [x] Group code create/join sub-step
- [x] Inline validation and error states
- [x] Form submission → API → redirect to holding page

## Phase 5: Holding Page
- [x] Personalised greeting (YOU'RE IN, [NAME])
- [x] Identity tagline from personality combo lookup
- [x] Sports Day Profile Badge (role card)
- [x] Status block: Registered / Team Assigned Hidden / Reveal Pending
- [x] "YOUR TEAM IS WAITING." locked block
- [x] Unlock CTA: "UNLOCK MY TEAM →" with £10 Priority Player Pass details
- [x] Referral block with copy link functionality
- [x] LocalStorage session management

## Phase 6: Payment Flow
- [x] Shopify checkout redirect with user email pre-fill
- [x] /unlock/success route (verify payment, trigger reveal)
- [x] Shopify webhook handler
- [x] Update user record on payment confirmation (paymentStatus, revealStatus, accessType)

## Phase 7: Team Reveal Animations
- [x] Red team: roulette wheel spin animation (canvas)
- [x] Blue team: arcade claw machine animation
- [x] Pink team: slot machine animation
- [x] Orange team: chaotic wheel animation (canvas)
- [x] Final reveal frame (full-screen team colour + confetti)
- [x] Post-reveal share feature (canvas PNG 1080×1920 + Web Share API + download fallback)
- [x] Share card: team colour, Bebas Neue, 6+1 logo, "I'M TEAM [COLOUR]"

## Phase 8: Admin Dashboard (/admin)
- [x] Role-gated admin access (requires admin role via Manus OAuth)
- [x] Summary stats cards (total, paid/free, team distribution, referrals)
- [x] Full filterable user table with all fields
- [x] Filters: team, payment status, shirt size, content consent, search
- [x] Health notes tab (name + email + note only, confidential warning)
- [x] CSV export button

## Phase 9: Tests & Polish
- [x] Vitest tests for team assignment load-balancing (4 tests)
- [x] Vitest tests for profile generation archetypes (4 tests)
- [x] Vitest tests for referral code generation (4 tests)
- [x] Vitest tests for Klaviyo tag builder (6 tests)
- [x] Auth logout test (1 test)
- [x] All 20 tests passing
- [x] TypeScript compiles clean (0 errors)
- [x] Logo uploaded to webdev static assets

## Pending / Future
- [ ] Add SHOPIFY_WEBHOOK_SECRET env var for HMAC webhook verification
- [ ] Add KLAVIYO_API_KEY env var for live Klaviyo integration
- [ ] Add VITE_SHOPIFY_STORE_URL and VITE_SHOPIFY_VARIANT_ID env vars for live checkout
- [ ] Email confirmation on registration

## Upgrades (Round 2)
- [x] Replace landing page with WebGL animated shader hero (cosmic fire background, 6+1 brand copy, ENTER THE SYSTEM → CTA)
- [x] Remove jsx prop from style tag (not supported in plain React/TS)
- [x] Add AI-generated personalised team name + identity message to post-reveal page using all form data
- [x] Add AI procedure to backend (sportsday.generateTeamIdentity) using invokeLLM
- [x] Store AI-generated team name in DB and return on getUserStatus

## Round 3 Upgrades
- [x] Fix Red team reveal animation to be a proper roulette wheel (distinct from Orange chaotic wheel)
- [x] Install @paper-design/shaders-react and build WarpShader component
- [x] Redesign 12-step registration form with Warp shader background (on-brand colours: orange/red/dark)
- [x] Build Team Hub page (/team-hub) shown after reveal: events list, team voting, wildcards, location
- [x] Add profile photo upload on Team Hub (stored in S3, shown as display picture)
- [x] Build fun awards voting system (funniest moment, MVP, most dramatic, etc.)
- [x] Add DB schema for: team votes, wildcard votes, awards votes, profile photos, leaderboard
- [x] Build admin leaderboard management: fill in event results, DNF, team scores
- [x] Wire Team Hub route in App.tsx and add navigation from Reveal page


## Phase 1 Build (Confirmed)

### STEP 1: Admin Access
- [x] Verify ADMIN_PASSWORD env var is set in Manus deployment config
- [x] Test /admin access and confirm live user data is visible
- [x] Remove temporary console.log once confirmed

### STEP 2: Landing Page
- [x] Add logo shooting star animation (random ~60s interval, 10s initial delay)
- [x] Increase logo size in nav by 30-40%
- [x] Add login entry point in top-right nav (email lookup → holding page or "not found")

### STEP 3: Form
- [ ] Fix background animation not loading on step 1 (initialize before first card)
- [ ] Build one reusable particle system with config (colour, speed, direction, density, shape)
- [ ] Apply particle config to each of the 12 steps per theme mapping

### STEP 4: Holding Page
- [ ] Update hero greeting to match Paste 1 layout
- [ ] Apply Paste 2 aesthetic to status block background (neutral only, no team colour leak)
- [ ] Add login icon in top-right when user has active session
- [ ] Fix React setState-in-render bug in Reveal component

### STEP 5: Reveal Animations
- [ ] Upgrade all 4 animations with spring physics easing
- [ ] Add dramatic tension before final land on each animation
- [ ] Test animations at 375px mobile width
- [ ] Apply Paste 3 background aesthetic during reveal

### STEP 6: Live Event Indicator
- [ ] Build "NOW HAPPENING" indicator above events list
- [ ] Show current activity + time range
- [ ] Show "up next" immediately below
- [ ] Reads from admin-set schedule

## Shooting Star Easter Egg Upgrade
- [x] Logo shoots diagonally across full screen (from nav position, arcs down and across)
- [x] Glowing comet trail behind the logo as it travels
- [x] Firework explosion at exit point with sparks in all 4 team colours (red, blue, pink, orange)
- [x] Canvas overlay for the full animation so it renders above everything

## Current Phase: Home Page, Admin, Team Hub, Shopify

### Home Page Fixes
- [ ] Reduce warp shader opacity so "Enter the system..." text is legible
- [ ] Improve home page copy — replace "Enter the system" with on-brand messaging
- [ ] Add "Already registered? Enter email" quick login option on home page

### Admin Login
- [ ] Add admin login route (/admin) with password/credentials check
- [ ] Verify admin dashboard access and display

### Team Hub Design Edits
- [ ] Implement Team Hub layout changes from design mockups
- [ ] Update Team Hub styling and component structure per mockups

### Shopify Payment Integration
- [ ] Set up Shopify API connection for £10 Priority Player Pass
- [ ] Map "UNLOCK MY TEAM" button to Shopify checkout
- [ ] Handle successful payment → update registration to paid/unlocked
- [ ] Test payment flow end-to-end

### Skill Creation
- [ ] Package 6+1 Sports Day workflow as reusable skill


## Phase 4: Team Hub Live Features (COMPLETE)
- [x] Created TeamLiveFeatures component with team-specific modules:
  - [x] Red team: Heat Score (daily reset, rises on interaction)
  - [x] Blue team: Strategy Board (notes list + ADD button for posting)
  - [x] Pink team: Energy Feed (activity stream with simulated updates)
  - [x] Orange team: Chaos Meter (unpredictable, resets 4-6h)
- [x] Integrated component into Team Hub team tab
- [x] Fixed JSX syntax errors in TeamHub.tsx
- [x] All TypeScript errors resolved (0 errors)
- [x] White text: Primary values use #FFFFFF, secondary text uses opacity
- [x] Team member visibility: Members filtered by team in backend
- [x] Live data updates: All four teams have simulated updates
- [x] All 20 tests passing, TypeScript clean

## Phase 5: Leaderboard, Voting, Awards (COMPLETE)
- [x] Build Leaderboard tab (team standings + event results grid)
- [x] Implement Wildcard voting (team-wide vote for secret wildcard player)
- [x] Implement Awards voting (funniest, MVP, most dramatic, etc.)
- [x] Add voting UI with team colour theming
- [x] All 20 tests passing, TypeScript clean

## Phase 6: Event Recommendations & Sponsors (COMPLETE)
- [x] Build Event Recommendations tab (shows top 3 events with TRY IT button)
- [x] Build Sponsors/Vendors tab (Nike, Gatorade, GoPro, Local Cafe with placeholder icons)
- [x] Add sponsor descriptions and team-themed styling
- [x] All 20 tests passing, TypeScript clean

## Phase 7: Global Post Feed (MOCK - NEEDS BACKEND)
- [x] Build global scrolling post feed UI (mock posts, team-colored styling)
- [x] Add post creation UI (SHARE YOUR MOMENT composer with local state)
- [x] Implement like/comment UI (like button, comment/share counters)
- [x] Team-colored post styling and author info
- [ ] Backend integration: Create posts table in DB schema
- [ ] Backend integration: Add tRPC procedures for post CRUD
- [ ] Backend integration: Persist posts to database
- [ ] Backend integration: Implement real comment functionality
- [ ] Backend integration: Add image/video upload support

## Phase 8: Shopify Payment Integration (PLACEHOLDER - NEEDS LIVE CONFIG)
- [x] Map "UNLOCK MY TEAM" button to Shopify checkout (UI in place)
- [x] Webhook handler for payment confirmation (in place)
- [ ] Configure real Shopify store URL (currently placeholder)
- [ ] Configure real product/variant ID (currently placeholder)
- [ ] Add SHOPIFY_WEBHOOK_SECRET env var
- [ ] Add VITE_SHOPIFY_STORE_URL env var
- [ ] Add VITE_SHOPIFY_VARIANT_ID env var
- [ ] Test payment flow end-to-end with live Shopify

## Registration Flow Cleanup (requested 30 Apr)
- [ ] Remove "Already registered? Log in here" link from question 1 of registration form
- [ ] Remove native browser prompt() popup triggered by that link
- [ ] Remove "FIND MY SPOT" button from registration form nav header
- [ ] Remove the "Already Registered?" interstitial page/route
- [ ] Remove "RETURNING PLAYER / LOG IN" modal from Enter page

## UX Polish Round 2 (requested 3 May)
- [ ] Landing page: refine typography to high-end editorial (less bloated, more minimal/luxury)
- [ ] Landing page: remove Easter egg click trigger, keep random auto-firing shooting stars
- [ ] Registration form step 13: remove camera consent question entirely
- [ ] Date question: update to show 12 July 2026 as the confirmed/selected date (remove other options or mark as confirmed)
- [ ] Holding page: remove £10 price from Priority Player Pass card
- [ ] Holding page: replace in-app payment with Shopify redirect button (hype, no price shown)
- [ ] Holding page: add Unity Unlock Code input field for people who have paid
- [ ] Holding page: add scratch-to-reveal golden ticket interaction with audio

## Brand Voice Audit (requested 3 May)
- [x] Apply 6+1 brand voice to Home.tsx
- [x] Apply 6+1 brand voice to Enter.tsx (all 14 step labels and captions)
- [x] Apply 6+1 brand voice to Reveal.tsx
- [x] Apply 6+1 brand voice to TeamHub.tsx
- [x] Apply 6+1 brand voice to Holding.tsx (WelcomeBack + main page)
- [x] Apply 6+1 brand voice to UnlockSuccess.tsx
- [x] Apply 6+1 brand voice to PostFeed.tsx
- [x] Apply 6+1 brand voice to scratch-card.tsx (win state, progress hint)
- [x] Apply 6+1 brand voice to team-live-features.tsx
- [x] Apply 6+1 brand voice to now-happening.tsx
- [x] Redesign NotFound.tsx in full 6+1 brand style
- [x] All 20 tests passing, TypeScript clean (0 errors)

## Scratch Card Fixes (requested 3 May)
- [x] Retheme scratch card outer frame from red to on-brand orange/dark palette
- [x] Redesign share-to-story card to look premium and visually shareable on socials
- [x] Add collapse/minimise toggle to scratch card section on holding page

## Share Card + Lock Button (requested 5 May)
- [x] Upload branded share card image and use it as the shareable/downloadable asset
- [x] Lock the unlock team button with chain/padlock visual on holding page

## Reveal Page Share Card (requested 5 May)
- [x] Fix share card proportions on Reveal page (date reveal post-to-story)
- [x] Add Share to Story + Download buttons to Reveal page share card

## PWA Icon + Header Logo (requested 5 May)
- [x] Fix PWA home screen icon — generate correct 192x192 and 512x512 icons, update manifest, add apple-touch-icon
- [x] Increase header logo size across the app (h-7/h-8 → h-10/h-12)

## Group Code Debug + Security (requested 6 May)
- [x] BUG: Client generates group code with Math.random() before DB save — code shared before registration completes = "not found" for joiners
- [x] BUG: No max member cap on group codes — unlimited people can join one code
- [x] SECURITY: verifyGroupCode endpoint has no rate limiting — brute-forceable
- [x] SECURITY: register mutation has no rate limiting — spam registrations possible
- [x] SECURITY: group code only 3 random chars (~32k combos) — too guessable
- [x] FIX: Pre-create group code in DB immediately when user clicks "Create a group code" button (new createGroupCodeEarly procedure)
- [x] FIX: Add in-memory rate limiter to verifyGroupCode (max 10 req/min per IP)
- [x] FIX: Add in-memory rate limiter to register mutation (max 5 req/min per IP)
- [x] FIX: Increase group code entropy to 5 chars (32^5 = ~33M combos)
- [x] FIX: Add max member cap (20) to group code join

## Group Code Creator Confirmation (requested 7 May)
- [x] verifyGroupCode returns creator's first name from sports_day_registrations
- [x] Enter page shows "You're joining [Name]'s group" confirmation when code is valid

## Holding Page Enhancements (requested 8 May)
- [x] Add counter on holding page showing total unlocked + breakdown by team
- [x] Counter format: "47 have unlocked their team — Red: 12 | Blue: 10 | Pink: 14 | Orange: 11"
- [x] Display counter under "YOUR TEAM IS WAITING" section
- [x] Counter updates in real-time as people pay/unlock (polls backend or uses WebSocket)
- [x] Add tRPC procedure to get unlock stats (total + by team)

## Phase 12: Personalised Top Name Flow (NEW)
- [ ] Add topName (varchar 32), topNameLastEditedAt, topNameLockedAt, shopifyOrderStatus fields to schema
- [ ] Generate and apply migration
- [ ] Add MAX_TOP_NAME_LENGTH = 14 to shared/constants.ts (configurable, not hardcoded in DB)
- [ ] Add saveTopName tRPC procedure (saves before payment, validates length/chars, basic profanity filter)
- [ ] Update createPaymentIntent to include topName in Stripe metadata
- [ ] Update getSportsDayDashboard to return topName, topNameLockedAt for paid users
- [ ] Build TopNameEditor component (uppercase preview, 14 char limit, edit before payment)
- [ ] Wire TopNameEditor into Holding page — shown before payment form, saves on confirm
- [ ] Update locked state copy to match spec (countdown format 6D 8H 37M, new bullet points)
- [ ] Show topName in team-hub/dashboard for paid users
- [ ] Shopify stub: save shopifyOrderStatus = pending_configuration after payment (Phase 2 will wire real Shopify)
- [ ] Run tests and save checkpoint


## Phase 13: Registration Form Review/Edit Screen (NEW)
- [ ] Add registration form review/edit screen component
- [ ] Show all entered data (name, email, team preference, shirt size, etc.) in review state
- [ ] Add "Edit" button to go back and change any field
- [ ] Position submit button properly and ensure it's visible and clickable
- [ ] Test review flow end-to-end

## Critical: Stripe → Webhook → DB → Frontend Unlock Loop Fix

- [x] Webhook: update all payment fields on success (revealStatus=unlocked, paymentStatus=paid, accessType=priority, paidAt, stripePaymentIntentId, paymentMatchStatus)
- [x] Frontend: add 30s confirming timeout with support message showing registration_id
- [x] Admin: add admin-only manual recovery route (search by email/registrationId/unlockToken/stripePaymentIntentId, mark as paid/unlocked)
- [x] Logging: add explicit logs for webhook event received, match method, DB update success/failure, frontend polling, redirect triggered
- [x] Idempotency: if webhook receives same event twice or user already paid/unlocked, return success safely

## Post-Payment Reveal Animation Screen

- [x] Build /unlock-reveal page with team colour flash, blurred card reveal, player name/top name, priority access copy
- [x] Wire Holding.tsx confirming state to redirect to /unlock-reveal (not /team-hub) after webhook confirms
- [x] Add /unlock-reveal route in App.tsx
- [x] Add hasSeenUnlockReveal localStorage flag — returning paid users skip reveal and go straight to /team-hub
- [x] UnlockReveal page: on CTA click or animation complete, set hasSeenUnlockReveal=true then navigate to /team-hub

## Post-Payment Flow Improvements

- [x] Wire /unlock-reveal to redirect to /reveal (not /team-hub) after animation completes
- [x] Filter teammates on /reveal to show only paid/unlocked users (hide unpaid teammates)
- [x] Build shirt size/fit confirmation screen before /team-hub entry
- [x] Add route for shirt confirmation in App.tsx

## Reveal Journey Routing Fix (23 May)
- [ ] Create central reveal journey state manager (revealJourney.ts) with localStorage flags
- [ ] Fix Holding.tsx: after confirming, always redirect to /unlock-reveal (never /team-hub)
- [ ] Fix UnlockReveal.tsx: redirect to /reveal after animation; guard unpaid users back to /holding
- [ ] Fix Reveal.tsx: redirect to /shirt-confirm after reveal; guard unpaid users back to /holding
- [ ] Fix ShirtConfirm.tsx: redirect to /team-hub after confirmation; guard unpaid users back to /holding
- [ ] Returning paid users with completed reveal flow go straight to /team-hub
- [ ] Add REPLAY REVEAL button to TeamHub (top-left); resets animation flags only, not payment/shirt/unlock

## Two-Tier Journey System (Paid vs Free)

- [x] Add SPORTS_DAY_UNLOCK_DATE constant (July 11th 2026 8pm BST) to shared/constants.ts
- [x] Update sportsday.dashboard.ts: add PUBLIC_REVEAL state that triggers at July 11th 8pm for non-paid users
- [x] Update revealJourney.ts: getNextRevealRoute() checks accessType — paid gets /unlock-reveal after /reveal, free gets /team-hub
- [x] Update Reveal.tsx: after confetti, check accessType — paid → /unlock-reveal, free → /team-hub
- [x] Update Holding.tsx: after July 11th 8pm, free users auto-unlock and redirect to /reveal
- [x] Guard /unlock-reveal and /shirt-confirm: redirect free users away if they land there directly
- [x] Update TeamHub REPLAY REVEAL: paid users replay full journey, free users replay simplified (/reveal → /team-hub)

## Holding Page Funnel Redesign

- [x] Amplify personalisation block at top: pulsing, urgent, cinematic — player name + team waiting as emotional hook
- [x] Restructure page as conversion funnel: personalised hook → urgency/social proof → Apple Pay CTA
- [x] Make Apple Pay the primary/leading payment option (visually prominent, shown first)
- [x] First-time visitor pop-up: "This kit has a story. Once Sports Day is done, it's gone. Get yours before the price goes up."
- [x] Second-time visitor pop-up: "You came back. Early access is still open — but not for long."
- [x] Track visit count using localStorage (sd_visit_count) — increment on each page load
- [x] Pop-up timing: first-time shows after ~2s, second-time shows after ~1s on return visit
- [x] Pop-ups dismissible with X, do not reappear once dismissed per session (sd_popup_dismissed flag)

## AI Pop-up Personalisation & Admin Toggle

- [x] Add tRPC procedure `generatePopupCopy` — calls LLM with user profile data to produce personalised first-visit and return-visit pop-up copy
- [x] Cache generated pop-up copy in DB per registration (avoid re-generating on every load)
- [x] Add `popupsEnabled` boolean field to `sportsDaySettings` DB table (default: false, admin toggles on before ads/emails go out)
- [x] Add admin toggle in Admin panel to enable/disable pop-ups globally
- [x] Update FunnelPopup to fetch AI copy from backend and respect global enabled flag
- [x] Holding page: only render FunnelPopup when settings.popupsEnabled === true

## Price Update: £13 → £22 (Requested 5 June)
- [x] Update Holding.tsx: paymentAmount state from 2500 pence (£25) to 2200 pence (£22)
- [x] Update PaymentForm.tsx: Meta Pixel Purchase event value from 13 to 22
- [x] Update schema.ts: earlyPrice default from 2500 to 2200
- [x] Generate and apply Drizzle migration for schema change
- [x] Update sportsday.dashboard.ts fallback from 2000 to 2200 (£22.00)
- [x] Update routers.ts fallback from 2000 to 2200 (£22.00)
- [x] All tests passing (22 tests), TypeScript clean (0 errors)
- [ ] Test end-to-end: holding page displays £22, checkout shows £22, Meta Pixel fires with value: 22
- [ ] Verify Stripe webhook receives correct amount and stores it
