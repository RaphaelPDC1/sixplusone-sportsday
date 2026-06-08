import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireAutoUnlockEvent, hasAutoUnlockEventFired } from "./_core/autoUnlockKlaviyo";

// Mock fetch globally
global.fetch = vi.fn();

describe("Auto-Unlock Klaviyo Event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fire auto-unlock event with correct payload", async () => {
    // Mock successful Klaviyo response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await fireAutoUnlockEvent({
      registrationId: "test-reg-123",
      email: "test@example.com",
      fullName: "Test User",
    });

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://a.klaviyo.com/api/events/",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("should include correct event name in payload", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await fireAutoUnlockEvent({
      registrationId: "test-reg-123",
      email: "test@example.com",
      fullName: "Test User",
    });

    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.data.attributes.metric.data.attributes.name).toBe(
      "Sports Day 002 Auto Unlocked"
    );
  });

  it("should include profile properties in payload", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await fireAutoUnlockEvent({
      registrationId: "test-reg-123",
      email: "test@example.com",
      fullName: "Test User",
    });

    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.data.attributes.profile.data.attributes.properties).toEqual({
      sports_day_002_auto_unlocked: true,
      sports_day_002_unlock_status: "auto_unlocked",
      sports_day_002_auto_unlocked_at: expect.any(String),
    });
  });

  it("should return false on Klaviyo API error", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Bad request",
    });

    const result = await fireAutoUnlockEvent({
      registrationId: "test-reg-123",
      email: "test@example.com",
      fullName: "Test User",
    });

    expect(result).toBe(false);
  });

  it("should return false on network error", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const result = await fireAutoUnlockEvent({
      registrationId: "test-reg-123",
      email: "test@example.com",
      fullName: "Test User",
    });

    expect(result).toBe(false);
  });

  it("should include registration ID in event properties", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await fireAutoUnlockEvent({
      registrationId: "test-reg-456",
      email: "test@example.com",
      fullName: "Test User",
    });

    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.data.attributes.properties.registration_id).toBe(
      "test-reg-456"
    );
  });

  it("should include user name in event properties", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await fireAutoUnlockEvent({
      registrationId: "test-reg-123",
      email: "test@example.com",
      fullName: "John Doe",
    });

    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.data.attributes.properties.user_name).toBe("John Doe");
  });

  it("should send Authorization header with API key", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await fireAutoUnlockEvent({
      registrationId: "test-reg-123",
      email: "test@example.com",
      fullName: "Test User",
    });

    const callArgs = (global.fetch as any).mock.calls[0];
    const headers = callArgs[1].headers;

    expect(headers.Authorization).toMatch(/^Klaviyo-API-Key /);
  });

  it("should not throw on Klaviyo failure (non-blocking)", async () => {
    (global.fetch as any).mockRejectedValueOnce(
      new Error("Klaviyo unavailable")
    );

    // Should not throw
    expect(async () => {
      await fireAutoUnlockEvent({
        registrationId: "test-reg-123",
        email: "test@example.com",
        fullName: "Test User",
      });
    }).not.toThrow();
  });
});
