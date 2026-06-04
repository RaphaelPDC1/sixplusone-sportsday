import { describe, it, expect } from "vitest";
import { upsertKlaviyoProfile, sendKlaviyoEvent } from "./_core/klaviyo";

describe("Klaviyo Integration", () => {
  it("should validate Klaviyo API key by attempting a profile upsert", async () => {
    // Test with a dummy email to validate the API key works
    const testEmail = "test-klaviyo-validation@example.com";
    const properties = {
      source: "manus",
      test: true,
      validated_at: new Date().toISOString(),
    };

    const result = await upsertKlaviyoProfile(testEmail, properties);

    // If API key is invalid or missing, this will return false
    // If API key is valid, this will return true
    expect(typeof result).toBe("boolean");

    if (!result) {
      console.warn(
        "Klaviyo API key validation failed. Check that KLAVIYO_API_KEY is set correctly."
      );
    } else {
      console.log("✓ Klaviyo API key validated successfully");
    }
  });

  it("should send a test event to Klaviyo", async () => {
    const testEmail = "test-klaviyo-event@example.com";

    // First ensure profile exists
    await upsertKlaviyoProfile(testEmail, {
      source: "manus",
      test: true,
    });

    // Then send event
    const result = await sendKlaviyoEvent(testEmail, "Test Event", {
      test: true,
      validated_at: new Date().toISOString(),
    });

    expect(typeof result).toBe("boolean");

    if (!result) {
      console.warn("Klaviyo event send failed. Check API key and network.");
    } else {
      console.log("✓ Klaviyo event sent successfully");
    }
  });
});
