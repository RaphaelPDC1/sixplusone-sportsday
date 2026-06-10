# Sports Day 002 — Unlock Flow & Team Hub Edits

**Context:** This document outlines all required edits for the unlock reveal flow and team hub experience. These changes should be implemented by Claude in the next phase.

---

## 1. UNLOCK FLOW REFINEMENTS

### 1.1 Unlock Animation (All Four Team Colors)

**Current Issue:**
- Unlock animations are "junkie" and non-specific
- Need refinement for all four team colors (Red, Blue, Pink, Orange)

**Requirements:**
- Create distinct, polished unlock animations for each team colour
- Animations should feel premium and brand-aligned
- Each colour should have unique visual character (not just colour swaps)

**Implementation Approach:**
- Review current animation in `/client/src/components/UnlockAnimation.tsx` or similar
- Refactor to support colour-specific keyframes
- Test on mobile and desktop
- Consider adding subtle particle effects or transitions unique to each colour

**Files to Edit:**
- `client/src/components/UnlockAnimation.tsx` (or wherever animations live)
- `client/src/pages/Reveal.tsx` (if animation is called from there)

---

### 1.2 Team Display Animation with Confetti

**Current Issue:**
- Team reveal shows "I'm team orange" etc.
- Confetti animation needs refinement

**Requirements:**
- Keep the team reveal message
- Enhance confetti animation to feel premium
- Ensure it works on all devices

**Implementation Approach:**
- Enhance confetti library or create custom confetti effect
- Tie confetti to team colour (orange confetti for orange team, etc.)
- Test performance on mobile

**Files to Edit:**
- `client/src/components/TeamRevealAnimation.tsx` (or similar)
- `client/src/pages/Reveal.tsx`

---

### 1.3 CRITICAL: Shirt Confirm Page Access Control

**Current Issue:**
- "Confirm your top selection" page appears for ALL users
- Should ONLY appear for Priority Pass (paid) users
- Free users should NOT see this page

**Requirements:**
- Add role/payment status check before showing ShirtConfirm page
- Paid users → see ShirtConfirm page
- Free users → skip to team hub directly after reveal

**Implementation Approach:**
1. Check `dashboard.state` in routing logic:
   - `UNLOCKED_PRIORITY` → show ShirtConfirm
   - `PUBLIC_REVEAL` (free users) → skip ShirtConfirm, go to team hub
2. Update `revealJourney.ts` to conditionally route based on payment status
3. Add guard in `ShirtConfirm.tsx` to redirect unpaid users

**Files to Edit:**
- `client/src/lib/revealJourney.ts` (add payment status check)
- `client/src/pages/ShirtConfirm.tsx` (add guard redirect)
- `client/src/App.tsx` (if routing needs adjustment)

**Priority:** HIGH — This is a critical user flow issue

---

## 2. TEAM HUB REVAMP

### 2.1 Team Captain Display

**Current Issue:**
- Team captain not permanently visible
- Should be top/hero section of team hub

**Requirements:**
- Display team captain at the top of team hub (permanent, always visible)
- Show captain name and profile picture
- Make it a hero/prominent section

**Implementation Approach:**
1. Create new `TeamCaptainHero.tsx` component
2. Display at top of TeamHub above all tabs
3. Show: captain name, profile picture, maybe a "Captain" badge
4. Make it visually distinct from team members list

**Files to Edit:**
- `client/src/components/TeamCaptainHero.tsx` (new)
- `client/src/pages/TeamHub.tsx` (add hero section at top)

---

### 2.2 Team Members List with Profiles

**Current Issue:**
- Team members shown as simple list
- No detailed profile view when tapped
- Missing Instagram/social handles
- Profile pictures not mandatory

**Requirements:**
- Team members list (keep as list)
- Each member is tappable/clickable
- Tap opens detailed profile modal/sheet with:
  - Profile picture (mandatory field)
  - Name
  - Instagram handle or social handle
  - Additional context/bio if available
- Profile pictures must be mandatory upload in registration

**Implementation Approach:**
1. Create `TeamMemberCard.tsx` component (clickable)
2. Create `TeamMemberProfileModal.tsx` component (detailed view)
3. Update registration form to make profile picture mandatory
4. Update database schema if needed to enforce profile picture requirement
5. Add social handle field to registration form if not present

**Files to Edit:**
- `client/src/components/TeamMemberCard.tsx` (new)
- `client/src/components/TeamMemberProfileModal.tsx` (new)
- `client/src/pages/TeamHub.tsx` (update team members section)
- `client/src/pages/Enter.tsx` (make profile picture mandatory)
- `drizzle/schema.ts` (if profile picture field needs to be NOT NULL)

---

### 2.3 Chaos Meter / Team Stats

**Current Issue:**
- "Chaos meter" or similar team stat not visible
- Should be displayed prominently

**Requirements:**
- Display team's chaos meter (or primary team stat)
- Show at top of team hub (near captain)
- Visual representation (progress bar, gauge, etc.)

**Implementation Approach:**
1. Check if `chaos` field exists in team data
2. Create `ChaosMeter.tsx` component
3. Display prominently in team hub header
4. Use visual design that matches 6+1 brand

**Files to Edit:**
- `client/src/components/ChaosMeter.tsx` (new)
- `client/src/pages/TeamHub.tsx` (add to header)

---

### 2.4 Events Section

**Current Issue:**
- Events section exists but needs refinement later
- Can defer for now

**Status:** DEFER — Can be refined in next phase

---

### 2.5 Leaderboard

**Current Issue:**
- Leaderboard section exists and is fine

**Status:** KEEP AS-IS

---

### 2.6 Wildcards Section

**Current Issue:**
- Wildcards section may need refinement later

**Status:** DEFER — Can be refined in next phase

---

### 2.7 Awards Voting (MVP, Funniest Moment, etc.)

**Current Issue:**
- Voting currently limited to team members only
- Should allow voting for ANY competitor across all teams

**Requirements:**
- User selects team colour first (Red, Blue, Pink, Orange)
- Then selects a competitor from that team
- Can vote for anyone, not just their own team
- Separate voting categories: MVP, Funniest Moment, etc.

**Implementation Approach:**
1. Create `AwardsVoting.tsx` component with two-step flow:
   - Step 1: Select team colour
   - Step 2: Select competitor from that team
2. Update voting mutation to accept team colour + competitor ID
3. Update UI to show all teams' competitors, not just current team
4. Add voting history/confirmation

**Files to Edit:**
- `client/src/components/AwardsVoting.tsx` (new or refactor existing)
- `client/src/pages/TeamHub.tsx` (update awards tab)
- `server/routers.ts` (update voting mutation if needed)

---

## 3. SOCIAL FEATURES

### 3.1 Team Media Gallery (Auto-Scrolling)

**Current Issue:**
- No team media gallery
- Should be at bottom of team hub
- Should be social (visible to all teams, not just your team)

**Requirements:**
- Add scrolling image/video upload section at bottom of team hub
- Anyone can upload images/videos for their team
- All teams can see all other teams' media
- Auto-scroll through media
- Visible to everyone (not team-restricted)

**Implementation Approach:**
1. Create `TeamMediaGallery.tsx` component
2. Create `MediaUploadButton.tsx` component
3. Add media table to database schema if not present:
   - `teamId`, `uploadedBy`, `mediaUrl`, `mediaType` (image/video), `createdAt`
4. Create tRPC procedures:
   - `uploadTeamMedia` (upload image/video)
   - `getTeamMedia` (fetch media for a team)
   - `getAllTeamsMedia` (fetch media across all teams for social view)
5. Implement auto-scroll carousel
6. Add upload UI with file validation

**Files to Edit:**
- `client/src/components/TeamMediaGallery.tsx` (new)
- `client/src/components/MediaUploadButton.tsx` (new)
- `client/src/pages/TeamHub.tsx` (add gallery at bottom)
- `drizzle/schema.ts` (add teamMedia table)
- `server/db.ts` (add media query helpers)
- `server/routers.ts` (add media procedures)

**Database Schema Addition:**
```sql
CREATE TABLE teamMedia (
  id TEXT PRIMARY KEY,
  teamId TEXT NOT NULL,
  uploadedBy TEXT NOT NULL,
  mediaUrl TEXT NOT NULL,
  mediaType TEXT NOT NULL, -- 'image' or 'video'
  createdAt BIGINT NOT NULL,
  FOREIGN KEY (teamId) REFERENCES teams(id),
  FOREIGN KEY (uploadedBy) REFERENCES users(id)
);
```

---

### 3.2 Sponsors Section

**Current Issue:**
- Sponsors section exists
- Can be refined later

**Status:** DEFER — Can be refined in next phase

---

## 4. LOCATION & EVENT DETAILS

### 4.1 Location Information

**Current Issue:**
- Location needs refinement
- Currently: Endcliffe Park, Sheffield

**Requirements:**
- Ensure location is displayed clearly
- Add location details (address, parking, accessibility info if available)
- Consider adding map view

**Implementation Approach:**
1. Check if location is displayed in team hub
2. Add location card/section with:
   - Location name: Endcliffe Park, Sheffield
   - Address details
   - Maybe a Google Map embed
3. Add to team hub or event details section

**Files to Edit:**
- `client/src/pages/TeamHub.tsx` (add location section)
- `client/src/components/LocationCard.tsx` (new if needed)

---

## 5. ADMIN PAGE

**Current Issue:**
- Admin page exists
- Can be refined later

**Status:** DEFER — Can be refined in next phase

---

## 6. RECOMMENDED EVENTS (FUTURE ENHANCEMENT)

**Current Issue:**
- Events section should have "recommended" events based on user strengths
- Should auto-suggest team combinations based on questionnaire answers

**Requirements:**
- When user taps into events, show recommended events based on:
  - What they're good at (from questionnaire)
  - What they're strong at
  - Team composition that would work well
- Auto-suggest team combinations

**Implementation Approach:**
1. Store questionnaire answers in database (if not already)
2. Create recommendation algorithm based on strengths
3. Create `RecommendedEvents.tsx` component
4. Add tRPC procedure `getRecommendedEvents` that returns:
   - Recommended events for user
   - Suggested team combinations
5. Display in events tab with explanations

**Priority:** MEDIUM — Can be implemented after core team hub is complete

**Files to Edit:**
- `server/db.ts` (add recommendation logic)
- `server/routers.ts` (add getRecommendedEvents procedure)
- `client/src/components/RecommendedEvents.tsx` (new)
- `client/src/pages/TeamHub.tsx` (update events tab)

---

## IMPLEMENTATION PRIORITY

### CRITICAL (Do First):
1. **Shirt Confirm Page Access Control** — Prevent free users from seeing paid-only page
2. **Team Captain Display** — Make captain prominent at top of team hub
3. **Team Members Profiles** — Make team members tappable with detailed profiles

### HIGH (Do Next):
4. **Unlock Animation Refinement** — Polish animations for all four colours
5. **Awards Voting Refactor** — Allow cross-team voting

### MEDIUM (Do After):
6. **Team Media Gallery** — Add social media upload feature
7. **Chaos Meter Display** — Show team stats

### LOW (Defer):
8. Recommended Events (future enhancement)
9. Sponsors refinement
10. Admin page refinement

---

## HANDOFF NOTES FOR CLAUDE

- **Start with:** Shirt Confirm access control (critical bug fix)
- **Then:** Team hub UI improvements (captain, members, profiles)
- **Then:** Animation refinements
- **Then:** Social features (media gallery)
- **Database:** May need schema changes for media table and profile picture requirement
- **Testing:** Test all flows on mobile and desktop
- **Design:** Maintain 6+1 brand (black/white/orange, bold typography)

---

## QUESTIONS FOR CLARIFICATION

If Claude needs clarification on any of these points, here are the key questions:

1. **Profile Pictures:** Should profile picture upload be added to registration form, or should it be a separate step after registration?
2. **Media Gallery:** Should media require moderation before appearing, or auto-approve?
3. **Chaos Meter:** What data should populate the chaos meter? (wins, participation, votes, etc.)
4. **Recommended Events:** What questionnaire fields should be used for recommendations?
5. **Awards Voting:** Should there be voting limits (e.g., one vote per person per category)?

---

**Document Created:** 10 June 2026
**Status:** Ready for Claude handoff
