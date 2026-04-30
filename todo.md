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
