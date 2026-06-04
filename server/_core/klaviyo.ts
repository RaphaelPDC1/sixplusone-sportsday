import { ENV } from "./env";

/**
 * Klaviyo API helper for Sports Day 002
 * Handles profile creation/update and event tracking
 * Uses email as unique identifier to prevent duplicates
 */

interface KlaviyoProfile {
  email: string;
  properties?: Record<string, any>;
}

interface KlaviyoEvent {
  type: "event";
  attributes: {
    metric: {
      data: {
        type: "metric";
        attributes: {
          name: string;
        };
      };
    };
    profile: {
      data: {
        type: "profile";
        attributes: {
          email: string;
        };
      };
    };
    properties?: Record<string, any>;
  };
}

const KLAVIYO_API_URL = "https://a.klaviyo.com/api";
const KLAVIYO_VERSION = "2024-10-15";

/**
 * Make authenticated request to Klaviyo API
 */
async function makeKlaviyoRequest(
  method: string,
  endpoint: string,
  body?: Record<string, any>
): Promise<any> {
  const apiKey = ENV.KLAVIYO_API_KEY;
  if (!apiKey) {
    console.warn("[Klaviyo] API key not configured, skipping");
    return null;
  }

  const url = `${KLAVIYO_API_URL}${endpoint}`;
  const headers: Record<string, string> = {
    "Authorization": `Klaviyo-API-Key ${apiKey}`,
    "Content-Type": "application/json",
    "revision": KLAVIYO_VERSION,
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Klaviyo] ${method} ${endpoint} failed:`,
        response.status,
        errorText
      );
      return null;
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return { success: true };
    }

    const text = await response.text();
    if (!text) {
      return { success: true };
    }

    return JSON.parse(text);
  } catch (err) {
    console.error(`[Klaviyo] Request failed:`, err);
    return null;
  }
}

/**
 * Create or update a Klaviyo profile
 * Uses email as unique identifier
 */
export async function upsertKlaviyoProfile(
  email: string,
  properties: Record<string, any>
): Promise<boolean> {
  try {
    const payload = {
      data: {
        type: "profile",
        attributes: {
          email,
          properties,
        },
      },
    };

    let result = await makeKlaviyoRequest("POST", "/profiles", payload);
    
    // If POST failed (409 conflict), try PATCH
    if (!result) {
      console.log(`[Klaviyo] Profile exists, attempting PATCH...`);
      try {
        const filterStr = encodeURIComponent(`equals(email,"${email}")`);
        const fetchUrl = `https://a.klaviyo.com/api/profiles?filter=${filterStr}`;
        const fetchResponse = await fetch(fetchUrl, {
          headers: {
            'Authorization': `Klaviyo-API-Key ${ENV.KLAVIYO_API_KEY}`,
            'revision': '2024-10-15',
          },
        });
        
        const fetchData = await fetchResponse.json();
        if (fetchData.data && fetchData.data.length > 0) {
          const profileId = fetchData.data[0].id;
          const patchPayload = {
            data: {
              type: "profile",
              id: profileId,
              attributes: { properties },
            },
          };
          
          result = await makeKlaviyoRequest("PATCH", `/profiles/${profileId}`, patchPayload);
          if (result) {
            console.log(`[Klaviyo] Profile updated via PATCH for ${email}`);
            return true;
          }
        }
      } catch (err) {
        console.error(`[Klaviyo] PATCH fallback failed:`, err);
      }
      console.warn(`[Klaviyo] Profile upsert failed for ${email}`);
      return false;
    }

    console.log(`[Klaviyo] Profile upserted for ${email}`);
    return true;
  } catch (err) {
    console.error(`[Klaviyo] Error upserting profile for ${email}:`, err);
    return false;
  }
}

/**
 * Send an event to a Klaviyo profile
 * Must be called AFTER profile is created/updated
 */
export async function sendKlaviyoEvent(
  email: string,
  eventName: string,
  properties?: Record<string, any>
): Promise<boolean> {
  try {
    const payload = {
      data: {
        type: "event",
        attributes: {
          metric: {
            data: {
              type: "metric",
              attributes: {
                name: eventName,
              },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: {
                email,
              },
            },
          },
          properties: properties || {},
        },
      },
    };

    const result = await makeKlaviyoRequest("POST", "/events", payload);
    if (!result) {
      console.warn(`[Klaviyo] Event send failed for ${email}: ${eventName}`);
      return false;
    }

    console.log(`[Klaviyo] Event sent for ${email}: ${eventName}`);
    return true;
  } catch (err) {
    console.error(
      `[Klaviyo] Error sending event for ${email} (${eventName}):`,
      err
    );
    return false;
  }
}

/**
 * Handle Sports Day registration
 * Creates/updates profile with registration properties
 * Sends "Sports Day 002 Registered" event
 */
export async function handleSportsDayRegistration(
  email: string,
  fullName: string,
  team: string | null,
  groupCode: string | null,
  shirtSize: string | null,
  paymentStatus: "paid" | "unpaid",
  marketingConsent: boolean
): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    const properties = {
      source: "manus",
      event_interest: "sports_day_002",
      sports_day_002_registered: true,
      sports_day_002_paid: paymentStatus === "paid",
      sports_day_002_payment_status: paymentStatus,
      sports_day_002_unlock_status: paymentStatus === "paid" ? "unlocked" : "locked",
      sports_day_002_team: team || null,
      sports_day_002_friend_group_code: groupCode || null,
      sports_day_002_shirt_size: shirtSize || null,
      sports_day_002_submitted_at: now,
      operational_consent: true,
      operational_consent_reason: "Submitting means we can contact you about Sports Day 002",
      operational_consent_source: "Sports Day 002 registration form",
      operational_consent_captured_at: now,
      marketing_consent: marketingConsent,
      marketing_consent_captured_at: marketingConsent ? now : null,
      first_name: fullName.split(" ")[0] || fullName,
    };

    // Create/update profile first
    const profileSuccess = await upsertKlaviyoProfile(email, properties);
    if (!profileSuccess) {
      console.warn(`[Klaviyo] Failed to upsert profile for registration: ${email}`);
      return false;
    }

    // Then send event
    const eventSuccess = await sendKlaviyoEvent(
      email,
      "Sports Day 002 Registered",
      {
        source: "manus",
        event_interest: "sports_day_002",
        registered_at: now,
        payment_status: paymentStatus,
        unlock_status: paymentStatus === "paid" ? "unlocked" : "locked",
      }
    );

    return eventSuccess;
  } catch (err) {
    console.error(`[Klaviyo] Error handling registration for ${email}:`, err);
    return false;
  }
}

/**
 * Handle payment confirmation
 * Updates profile with paid status and unlock status
 * Sends "Sports Day 002 Paid" event
 */
export async function handleSportsDayPayment(
  email: string,
  team: string | null
): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    const properties = {
      sports_day_002_paid: true,
      sports_day_002_payment_status: "paid",
      sports_day_002_unlock_status: "unlocked",
      sports_day_002_paid_at: now,
    };

    // Update profile
    const profileSuccess = await upsertKlaviyoProfile(email, properties);
    if (!profileSuccess) {
      console.warn(`[Klaviyo] Failed to update profile for payment: ${email}`);
      return false;
    }

    // Send event
    const eventSuccess = await sendKlaviyoEvent(
      email,
      "Sports Day 002 Paid",
      {
        payment_status: "paid",
        unlock_status: "unlocked",
        team: team || null,
        paid_at: now,
      }
    );

    return eventSuccess;
  } catch (err) {
    console.error(`[Klaviyo] Error handling payment for ${email}:`, err);
    return false;
  }
}

/**
 * Handle team reassignment
 * Updates profile with new team
 * Sends "Sports Day 002 Team Updated" event
 */
export async function handleTeamReassignment(
  email: string,
  newTeam: string
): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    const properties = {
      sports_day_002_team: newTeam,
      sports_day_002_team_updated_at: now,
    };

    // Update profile
    const profileSuccess = await upsertKlaviyoProfile(email, properties);
    if (!profileSuccess) {
      console.warn(`[Klaviyo] Failed to update profile for team change: ${email}`);
      return false;
    }

    // Send event
    const eventSuccess = await sendKlaviyoEvent(
      email,
      "Sports Day 002 Team Updated",
      {
        new_team: newTeam,
        updated_at: now,
      }
    );

    return eventSuccess;
  } catch (err) {
    console.error(`[Klaviyo] Error handling team reassignment for ${email}:`, err);
    return false;
  }
}

/**
 * Handle July 11th auto-unlock
 * Updates profile with auto_unlocked status
 * Sends "Sports Day 002 Auto Unlocked" event
 */
export async function handleAutoUnlock(email: string, team: string | null): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    const properties = {
      sports_day_002_unlock_status: "auto_unlocked",
      sports_day_002_auto_unlocked: true,
      sports_day_002_auto_unlocked_at: now,
    };

    // Update profile
    const profileSuccess = await upsertKlaviyoProfile(email, properties);
    if (!profileSuccess) {
      console.warn(`[Klaviyo] Failed to update profile for auto-unlock: ${email}`);
      return false;
    }

    // Send event
    const eventSuccess = await sendKlaviyoEvent(
      email,
      "Sports Day 002 Auto Unlocked",
      {
        unlock_status: "auto_unlocked",
        team: team || null,
        auto_unlocked_at: now,
      }
    );

    return eventSuccess;
  } catch (err) {
    console.error(`[Klaviyo] Error handling auto-unlock for ${email}:`, err);
    return false;
  }
}

/**
 * Handle shirt size/fit update
 * Updates profile with shirt preferences
 * Sends "Sports Day 002 Shirt Confirmed" event
 */
export async function handleShirtUpdate(
  email: string,
  shirtSize: string | null,
  shirtFit: string | null
): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    const properties = {
      sports_day_002_shirt_size: shirtSize || null,
      sports_day_002_shirt_fit: shirtFit || null,
      sports_day_002_shirt_confirmed_at: now,
    };

    // Update profile
    const profileSuccess = await upsertKlaviyoProfile(email, properties);
    if (!profileSuccess) {
      console.warn(`[Klaviyo] Failed to update profile for shirt: ${email}`);
      return false;
    }

    // Send event
    const eventSuccess = await sendKlaviyoEvent(
      email,
      "Sports Day 002 Shirt Confirmed",
      {
        shirt_size: shirtSize || null,
        shirt_fit: shirtFit || null,
        confirmed_at: now,
      }
    );

    return eventSuccess;
  } catch (err) {
    console.error(`[Klaviyo] Error handling shirt update for ${email}:`, err);
    return false;
  }
}

// Named aliases matching the expected function names
export const handleSportsDayTeamChange = handleTeamReassignment;
export const handleSportsDayShirtUpdate = handleShirtUpdate;
export const handleSportsDayAutoUnlock = handleAutoUnlock;
