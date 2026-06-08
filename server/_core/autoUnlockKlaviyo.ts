/**
 * Auto-Unlock Klaviyo Event Handler
 * 
 * Fires "Sports Day 002 Auto Unlocked" event when isPublicReveal becomes true (July 11th 8pm BST)
 * Tracks which users have already had this event fired to prevent duplicates
 * Non-blocking: Klaviyo failures don't break the dashboard experience
 */

import { ENV } from "./env";
import { getDb } from "../db";
import { sportsDayRegistrations } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

interface AutoUnlockPayload {
  registrationId: string;
  email: string;
  fullName: string;
}

/**
 * Fire "Sports Day 002 Auto Unlocked" event to Klaviyo
 * - Only fires once per user (tracked via autoUnlockEventFired flag)
 * - Non-blocking: logs errors but doesn't throw
 * - Updates profile with auto_unlocked status
 */
export async function fireAutoUnlockEvent(payload: AutoUnlockPayload): Promise<boolean> {
  try {
    const { registrationId, email, fullName } = payload;

    // Get Klaviyo API key
    const klaviyoApiKey = ENV.KLAVIYO_API_KEY;
    if (!klaviyoApiKey) {
      console.warn("[AutoUnlock] Klaviyo API key not configured, skipping event");
      return false;
    }

    // Prepare event payload for Klaviyo
    const eventPayload = {
      data: {
        type: "event",
        attributes: {
          metric: {
            data: {
              type: "metric",
              attributes: {
                name: "Sports Day 002 Auto Unlocked",
              },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: {
                email: email,
                properties: {
                  sports_day_002_auto_unlocked: true,
                  sports_day_002_unlock_status: "auto_unlocked",
                  sports_day_002_auto_unlocked_at: new Date().toISOString(),
                },
              },
            },
          },
          timestamp: new Date().toISOString(),
          properties: {
            registration_id: registrationId,
            user_name: fullName,
          },
        },
      },
    };

    console.log("[AutoUnlock] Firing event for", email);
    console.log("[AutoUnlock] Payload:", JSON.stringify(eventPayload, null, 2));

    // Send to Klaviyo
    const response = await fetch("https://a.klaviyo.com/api/events/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Klaviyo-API-Key ${klaviyoApiKey}`,
      },
      body: JSON.stringify(eventPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[AutoUnlock] Klaviyo API error (${response.status}):`,
        errorText
      );
      return false;
    }

    const result = await response.json();
    console.log("[AutoUnlock] Event fired successfully:", result);

    // Mark event as fired in database
    const db = await getDb();
    if (db) {
      await db
        .update(sportsDayRegistrations)
        .set({
          autoUnlockEventFired: true,
          autoUnlockedAt: new Date(),
        })
        .where(eq(sportsDayRegistrations.id, registrationId));

      console.log("[AutoUnlock] Database updated for", registrationId);
    }

    return true;
  } catch (err) {
    console.error("[AutoUnlock] Error firing event:", err);
    // Non-blocking: return false but don't throw
    return false;
  }
}

/**
 * Check if auto-unlock event has already been fired for a user
 */
export async function hasAutoUnlockEventFired(
  registrationId: string
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    const reg = await db
      .select({ autoUnlockEventFired: sportsDayRegistrations.autoUnlockEventFired })
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.id, registrationId))
      .limit(1);

    return reg[0]?.autoUnlockEventFired ?? false;
  } catch (err) {
    console.error("[AutoUnlock] Error checking event status:", err);
    return false;
  }
}
