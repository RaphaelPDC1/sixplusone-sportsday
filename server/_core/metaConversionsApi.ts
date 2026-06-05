/**
 * Meta Conversions API Helper
 *
 * Server-side implementation of Meta Conversions API for event tracking.
 * Works alongside browser pixel for deduplication and improved data quality.
 *
 * Reference: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import crypto from "crypto";
import { ENV } from "./env";
import { META_PIXEL_ID } from "../../shared/const";

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface UserData {
  email?: string;
  phone?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
}

export interface ConversionsAPIEvent {
  eventName: string;
  eventTime: number; // Unix timestamp in seconds
  eventId: string; // Unique ID for deduplication with browser pixel
  value?: number;
  currency?: string;
  userData: Record<string, string>;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Hash a string using SHA-256 (Meta requirement)
 */
function hashSHA256(value: string): string {
  if (!value) return "";
  return crypto
    .createHash("sha256")
    .update(value.toLowerCase().trim())
    .digest("hex");
}

/**
 * Extract user data from Express request headers
 */
export function extractUserDataFromRequest(req: any): Partial<UserData> {
  const clientIpAddress = (
    req.headers?.["x-forwarded-for"] ||
    req.headers?.["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    ""
  )
    .toString()
    .split(",")[0]
    .trim();

  const clientUserAgent = (req.headers?.["user-agent"] || "").toString();

  return {
    clientIpAddress: clientIpAddress || undefined,
    clientUserAgent: clientUserAgent || undefined,
  };
}

/**
 * Build hashed user data object for Meta Conversions API
 * Meta requires lowercase, trimmed, and SHA-256 hashed values
 */
export function buildHashedUserData(userData: UserData): Record<string, string> {
  const hashedData: Record<string, string> = {};

  if (userData.email) {
    hashedData.em = hashSHA256(userData.email);
  }

  if (userData.phone) {
    hashedData.ph = hashSHA256(userData.phone);
  }

  if (userData.clientIpAddress) {
    hashedData.client_ip_address = hashSHA256(userData.clientIpAddress);
  }

  if (userData.clientUserAgent) {
    hashedData.client_user_agent = hashSHA256(userData.clientUserAgent);
  }

  return hashedData;
}

/**
 * Send event to Meta Conversions API
 *
 * @param event - Event object with name, time, ID, value, currency, and user data
 * @returns true if successful, false otherwise
 */
export async function sendConversionsAPIEvent(
  event: ConversionsAPIEvent
): Promise<boolean> {
  const token = ENV.META_CONVERSIONS_API_TOKEN;
  if (!token) {
    console.warn(
      "[Meta Conversions API] Token not configured (META_CONVERSIONS_API_TOKEN)"
    );
    return false;
  }

  try {
    const payload = {
      data: [
        {
          event_name: event.eventName,
          event_time: event.eventTime,
          event_id: event.eventId,
          event_source_url: "", // Will be set by frontend context if needed
          action_source: "website",
          user_data: event.userData,
          ...(event.value && { value: event.value }),
          ...(event.currency && { currency: event.currency }),
        },
      ],
      access_token: token,
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        `[Meta Conversions API] Event ${event.eventName} (${event.eventId}) failed:`,
        errorData
      );
      return false;
    }

    const result = await response.json();
    console.log(
      `[Meta Conversions API] Event ${event.eventName} (${event.eventId}) sent successfully`,
      result
    );
    return true;
  } catch (error) {
    console.error(
      `[Meta Conversions API] Error sending event ${event.eventName} (${event.eventId}):`,
      error
    );
    return false;
  }
}

/**
 * Send Purchase event to Meta Conversions API
 */
export async function sendPurchaseEvent(
  eventId: string,
  value: number,
  currency: string,
  userData: UserData
): Promise<boolean> {
  const hashedUserData = buildHashedUserData(userData);

  return sendConversionsAPIEvent({
    eventName: "Purchase",
    eventTime: Math.floor(Date.now() / 1000),
    eventId,
    value,
    currency,
    userData: hashedUserData,
  });
}

/**
 * Send CompleteRegistration event to Meta Conversions API
 */
export async function sendCompleteRegistrationEvent(
  eventId: string,
  userData: UserData
): Promise<boolean> {
  const hashedUserData = buildHashedUserData(userData);

  return sendConversionsAPIEvent({
    eventName: "CompleteRegistration",
    eventTime: Math.floor(Date.now() / 1000),
    eventId,
    userData: hashedUserData,
  });
}
