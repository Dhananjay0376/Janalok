import { describe, it, expect } from "vitest";
import {
  mapQueryToService,
  lookupDocumentRequirements,
  formatDate,
  validateComplaintInput
} from "./civicUtils";
import { CivicService } from "../types";

const mockDirectory: CivicService[] = [
  {
    name: "Residential Trash & Recycling Cart Request",
    description: "Request standard recycling and composting carts or replace damaged trash bins at your home.",
    department: "Department of Public Works",
    urgency: "Medium",
    requirements: ["Proof of residency (utility bill or lease agreement)", "Valid ID"],
    processingTime: "3-5 business days",
    steps: ["Verify residential address status", "Choose size", "Submit electronic form"]
  },
  {
    name: "Municipal Voter Registration Renewal",
    description: "Update your residential voting address, change party affiliation, or register as a new voter.",
    department: "Office of the City Clerk - Elections Division",
    urgency: "High",
    requirements: ["SSN", "Valid ID", "Voter card"],
    processingTime: "Immediate",
    steps: ["Confirm qualification", "Input information", "Download certificate"]
  }
];

describe("civicUtils - mapQueryToService", () => {
  // Happy Path
  it("should match query words and return matching services", () => {
    const results = mapQueryToService("trash", mockDirectory);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Residential Trash & Recycling Cart Request");
  });

  // Edge Case
  it("should handle mixed case and whitespace queries", () => {
    const results = mapQueryToService("   VoTeR rEgIsTrAtIoN   ", mockDirectory);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Municipal Voter Registration Renewal");
  });

  // Invalid Input Case
  it("should handle empty or null queries gracefully", () => {
    const results = mapQueryToService("", mockDirectory);
    expect(results).toEqual([]);
    
    // @ts-ignore
    const nullResults = mapQueryToService(null, mockDirectory);
    expect(nullResults).toEqual([]);
  });
});

describe("civicUtils - lookupDocumentRequirements", () => {
  // Happy Path
  it("should return correct requirements list for matching service name", () => {
    const reqs = lookupDocumentRequirements("Municipal Voter Registration Renewal", mockDirectory);
    expect(reqs).toEqual(["SSN", "Valid ID", "Voter card"]);
  });

  // Edge Case
  it("should match service name case-insensitively with leading/trailing spaces", () => {
    const reqs = lookupDocumentRequirements("  municipal voter registration renewal  ", mockDirectory);
    expect(reqs).toEqual(["SSN", "Valid ID", "Voter card"]);
  });

  // Invalid Input Case
  it("should return empty array for non-existent service name or empty/null input", () => {
    const reqs = lookupDocumentRequirements("Fictional Non-Existent Service", mockDirectory);
    expect(reqs).toEqual([]);

    // @ts-ignore
    const nullReqs = lookupDocumentRequirements(null, mockDirectory);
    expect(nullReqs).toEqual([]);
  });
});

describe("civicUtils - formatDate", () => {
  // Happy Path
  it("should format standard ISO date string to user friendly date", () => {
    expect(formatDate("2026-07-06")).toBe("July 6, 2026");
    expect(formatDate("2026-12-25")).toBe("December 25, 2026");
  });

  // Edge Case
  it("should handle leap year dates correctly", () => {
    expect(formatDate("2024-02-29")).toBe("February 29, 2024");
  });

  // Invalid Input Case
  it("should return 'Invalid Date' for malformed or null inputs", () => {
    expect(formatDate("2026-99-99")).toBe("Invalid Date");
    expect(formatDate("abc")).toBe("Invalid Date");
    // @ts-ignore
    expect(formatDate(null)).toBe("Invalid Date");
  });
});

describe("civicUtils - validateComplaintInput", () => {
  // Happy Path
  it("should validate and return true for valid inputs", () => {
    const result = validateComplaintInput(
      "Broken Streetlight on 5th",
      "The streetlight on the corner of 5th and Main has been flickering for 3 days and is now completely dark.",
      "5th Ave & Main St"
    );
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  // Edge Case
  it("should reject title if it is too short or too long", () => {
    const resultShort = validateComplaintInput("S", "Valid long description over fifteen characters", "Location");
    expect(resultShort.isValid).toBe(false);
    expect(resultShort.errors).toContain("Issue Title must be at least 5 characters long.");

    const longTitle = "A".repeat(101);
    const resultLong = validateComplaintInput(longTitle, "Valid long description over fifteen characters", "Location");
    expect(resultLong.isValid).toBe(false);
    expect(resultLong.errors).toContain("Issue Title must not exceed 100 characters.");
  });

  // Invalid Input Case
  it("should reject inputs with empty or whitespace values", () => {
    const result = validateComplaintInput("   ", "   ", "   ");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Issue Title is required.");
    expect(result.errors).toContain("Description is required.");
    expect(result.errors).toContain("Location / Landmark is required.");
  });
});
