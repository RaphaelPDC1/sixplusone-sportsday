# Klaviyo Flows Setup Guide for Sports Day 002

## Status: Data Sync Complete ✅ | Email Flows Pending ⏳

Manus has completed the data sync and event triggers. Klaviyo flows still need to be configured manually in your Klaviyo account.

---

## What Manus Has Delivered

✅ **Profile Creation & Updates**
- All 109 existing registrations synced to Klaviyo
- Email as unique identifier (no duplicates)
- Operational consent: true (can receive Sports Day emails)
- Marketing consent: false (unless they opt-in)

✅ **Event Triggers**
- `Sports Day 002 Registered` — fires on registration
- `Sports Day 002 Paid` — fires on payment confirmation
- `Sports Day 002 Auto Unlocked` — fires on July 11th auto-unlock
- `Sports Day 002 Team Updated` — fires on team reassignment
- `Sports Day 002 Shirt Confirmed` — fires on shirt confirmation

✅ **Profile Properties Synced**
- `source`: "manus"
- `event_interest`: "sports_day_002"
- `sports_day_002_registered`: true
- `sports_day_002_paid`: true/false
- `sports_day_002_payment_status`: "paid" / "unpaid"
- `sports_day_002_unlock_status`: "locked" / "unlocked" / "auto_unlocked"
- `sports_day_002_team`: [team name]
- `sports_day_002_shirt_size`: [size if confirmed]
- `operational_consent`: true
- `marketing_consent`: true/false

---

## Klaviyo Flows to Configure

### Flow 1: Unpaid Nurture Sequence

**Trigger:** `Sports Day 002 Registered` event

**Flow Conditions:**
```
sports_day_002_paid = false
AND
operational_consent = true
```

**Exit Condition:**
```
sports_day_002_paid = true
```

**Purpose:**
- Remind them their team is locked
- Build FOMO around team reveal
- Push priority unlock / payment option
- Stop messaging once they pay

**Email Sequence (suggested):**
1. Day 0: "Your team is waiting" — intro to team reveal mechanic
2. Day 2: "See who you're with" — FOMO angle, payment CTA
3. Day 5: "Last chance for priority" — urgency, early price ends soon
4. Day 7: "Your team reveal is coming" — countdown to July 11th
5. Exit on payment or July 11th auto-unlock

---

### Flow 2: Priority Unlock / Payment Path

**Trigger:** `Sports Day 002 Paid` event

**Purpose:**
- Confirm payment
- Unlock access immediately
- Reveal team assignment
- Remind about shirt confirmation
- Push to dashboard

**Email Sequence (suggested):**
1. Immediate: "Priority unlocked! Here's your team" 
   - Payment confirmation
   - Team reveal
   - Dashboard link
   - Shirt confirmation CTA

2. Day 1: "Confirm your shirt size"
   - Shirt confirmation link
   - Size guide
   - Fit options

3. Day 3: "See your team on the dashboard"
   - Dashboard link
   - Team stats
   - Teammate profiles
   - Referral link

---

### Flow 3: Auto-Unlock Path (July 11th)

**Trigger:** `Sports Day 002 Auto Unlocked` event

**Purpose:**
- Tell them team reveal is now live
- Explain they didn't get priority access earlier
- Push them into dashboard
- Give next steps

**Email Sequence (suggested):**
1. Immediate: "Team reveal is live! Here's your team"
   - Team assignment
   - Dashboard link
   - Explanation: "Free access unlocked on July 11th"
   - Shirt confirmation CTA (if available)

2. Day 1: "Get ready for Sports Day 002"
   - Event logistics
   - Team page
   - What to bring
   - Day-of schedule

---

## Important Notes

1. **Operational Emails Only**
   - These flows are for Sports Day 002 operational emails only
   - Do NOT subscribe users to the "6+1 Main Email List" unless `marketing_consent = true`

2. **Separate Paid vs Auto-Unlock Flows**
   - Keep them separate for different emotional framing
   - Paid: "You unlocked priority access"
   - Auto-unlock: "Team reveal is now live"

3. **Exit Conditions**
   - Unpaid nurture should exit when `sports_day_002_paid = true` or July 11th arrives
   - Auto-unlock flow is one-time (no exit needed)

4. **Timing**
   - July 11th 8pm BST is when auto-unlock happens
   - Unpaid nurture should build urgency leading up to that date

5. **Testing**
   - Test with a non-paid profile to verify unpaid nurture sequence
   - Test with a paid profile to verify payment unlock sequence
   - Simulate July 11th to test auto-unlock sequence

---

## Next Steps

1. Log into Klaviyo
2. Create the 3 flows above using the event triggers and conditions specified
3. Draft email copy for each flow
4. Test with test profiles
5. Activate flows
6. Monitor performance in Klaviyo dashboard

All profile data and events are being synced reliably from Manus. You just need to build the email flows in Klaviyo.
