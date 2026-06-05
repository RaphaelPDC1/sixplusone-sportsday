/**
 * Meta Conversions API Tests
 * Tests for SHA-256 hashing, user data extraction, and API event building
 */

import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  buildHashedUserData,
  extractUserDataFromRequest,
} from "./_core/metaConversionsApi";

// Helper to compute actual SHA-256 hash for testing
function sha256(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value.toLowerCase().trim())
    .digest("hex");
}

describe("Meta Conversions API", () => {
  describe("buildHashedUserData", () => {
    it("should hash email to SHA-256", () => {
      const userData = { email: "test@example.com" };
      const result = buildHashedUserData(userData);

      const expectedHash = sha256("test@example.com");
      expect(result.em).toBe(expectedHash);
    });

    it("should hash phone to SHA-256", () => {
      const userData = { phone: "+441234567890" };
      const result = buildHashedUserData(userData);

      const expectedHash = sha256("+441234567890");
      expect(result.ph).toBe(expectedHash);
    });

    it("should hash client IP address", () => {
      const userData = { clientIpAddress: "192.168.1.1" };
      const result = buildHashedUserData(userData);

      expect(result.client_ip_address).toBeDefined();
      expect(result.client_ip_address).toHaveLength(64); // SHA-256 hex string
      expect(result.client_ip_address).toBe(sha256("192.168.1.1"));
    });

    it("should hash client user agent", () => {
      const userData = {
        clientUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      };
      const result = buildHashedUserData(userData);

      expect(result.client_user_agent).toBeDefined();
      expect(result.client_user_agent).toHaveLength(64); // SHA-256 hex string
      expect(result.client_user_agent).toBe(
        sha256("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
      );
    });

    it("should handle empty user data", () => {
      const userData = {};
      const result = buildHashedUserData(userData);

      expect(result).toEqual({});
    });

    it("should skip empty email/phone values", () => {
      const userData = { email: "", phone: "" };
      const result = buildHashedUserData(userData);

      expect(result.em).toBeUndefined();
      expect(result.ph).toBeUndefined();
    });

    it("should combine multiple user data fields", () => {
      const userData = {
        email: "user@example.com",
        phone: "+441234567890",
        clientIpAddress: "10.0.0.1",
        clientUserAgent: "Chrome/120.0",
      };
      const result = buildHashedUserData(userData);

      expect(result.em).toBeDefined();
      expect(result.ph).toBeDefined();
      expect(result.client_ip_address).toBeDefined();
      expect(result.client_user_agent).toBeDefined();
      expect(Object.keys(result)).toHaveLength(4);
    });

    it("should normalize email to lowercase before hashing", () => {
      const userData1 = { email: "Test@Example.COM" };
      const userData2 = { email: "test@example.com" };

      const result1 = buildHashedUserData(userData1);
      const result2 = buildHashedUserData(userData2);

      expect(result1.em).toBe(result2.em);
    });
  });

  describe("extractUserDataFromRequest", () => {
    it("should extract client IP from x-forwarded-for header", () => {
      const req = {
        headers: { "x-forwarded-for": "203.0.113.1, 198.51.100.1" },
        connection: { remoteAddress: "192.0.2.1" },
      };
      const result = extractUserDataFromRequest(req);

      // Should extract first IP from x-forwarded-for
      expect(result.clientIpAddress).toBe("203.0.113.1");
    });

    it("should fallback to x-real-ip header", () => {
      const req = {
        headers: { "x-real-ip": "203.0.113.2" },
        connection: { remoteAddress: "192.0.2.1" },
      };
      const result = extractUserDataFromRequest(req);

      expect(result.clientIpAddress).toBe("203.0.113.2");
    });

    it("should fallback to connection.remoteAddress", () => {
      const req = {
        headers: {},
        connection: { remoteAddress: "192.0.2.1" },
      };
      const result = extractUserDataFromRequest(req);

      expect(result.clientIpAddress).toBe("192.0.2.1");
    });

    it("should extract user agent from headers", () => {
      const req = {
        headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        connection: { remoteAddress: "192.0.2.1" },
      };
      const result = extractUserDataFromRequest(req);

      expect(result.clientUserAgent).toBe(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      );
    });

    it("should handle missing headers gracefully", () => {
      const req = {
        headers: {},
        connection: {},
      };
      const result = extractUserDataFromRequest(req);

      // Should return undefined for missing values
      expect(result.clientIpAddress).toBeUndefined();
      expect(result.clientUserAgent).toBeUndefined();
    });

    it("should handle null/undefined request properties", () => {
      const req = {
        headers: null,
        connection: null,
        socket: null,
      };
      const result = extractUserDataFromRequest(req);

      expect(result.clientIpAddress).toBeUndefined();
      expect(result.clientUserAgent).toBeUndefined();
    });
  });
});
