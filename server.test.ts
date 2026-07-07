import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock the @google/genai library entirely before importing the server
vi.mock("@google/genai", () => {
  const mockGenerateContent = vi.fn().mockImplementation(async (params: any) => {
    // Check if we should simulate an API failure/timeout/rate limit
    if (process.env.SIMULATE_GEMINI_ERROR === "true") {
      const error: any = new Error("Gemini Service Unavailable");
      error.status = "UNAVAILABLE";
      error.code = 503;
      throw error;
    }

    const sysInstruction = params?.config?.systemInstruction || "";

    if (sysInstruction.includes("expert municipal service directory")) {
      // Service Recommendation response structure
      return {
        text: JSON.stringify({
          recommendedServices: [
            {
              name: "Mocked Online Permit Center",
              description: "Permit matching mock service.",
              department: "Dept of Planning",
              urgency: "High",
              requirements: ["Government ID"],
              processingTime: "1 business day",
              steps: ["Apply online", "Wait for email"]
            }
          ]
        })
      };
    }

    if (sysInstruction.includes("translates dense, confusing government documents")) {
      // Document Simplification response structure
      return {
        text: JSON.stringify({
          summary: "Mocked plain language summary.",
          keyTakeaways: ["Takeaway A", "Takeaway B"],
          nextSteps: ["Step 1", "Step 2"],
          glossary: [{ term: "Jargon", definition: "Plain terms" }]
        })
      };
    }

    if (params?.config?.responseMimeType === "application/json") {
      return {
        text: JSON.stringify({
          summary: "Mocked OCR summary",
          name: "John Citizen",
          location: "123 Main St",
          documentId: "DOC-123"
        })
      };
    }

    // Default Chat response
    const targetLang = sysInstruction.match(/requested language:\s*([^.]+)/)?.[1] || "English";
    return {
      text: `Mocked AI response in ${targetLang.trim()}. How can I assist you?`
    };
  });

  class GoogleGenAI {
    models = {
      generateContent: mockGenerateContent
    };
  }

  return {
    GoogleGenAI,
    Type: {
      OBJECT: "OBJECT",
      STRING: "STRING",
      ARRAY: "ARRAY"
    }
  };
});

import { beforeAll } from "vitest";

// Set environment variables for tests
process.env.NODE_ENV = "test";
process.env.GEMINI_API_KEY = "mock_api_key_for_testing";

let app: any;

describe("Janālok API Server Integration Tests", () => {
  beforeAll(async () => {
    const serverModule = await import("./server");
    app = serverModule.app;
  });

  beforeEach(() => {
    process.env.SIMULATE_GEMINI_ERROR = "false";
    vi.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("should return ok status and active platform message", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: "ok",
        message: "Janālok AI Platform API is running."
      });
    });
  });

  describe("Grievance/Complaint Tracking Flow (Security Regression Tests)", () => {
    let createdIssueId: string;
    let correctAccessCode: string;

    it("should submit a new complaint successfully and store it with 'Reported' status & secret access code", async () => {
      const payload = {
        title: "Large sinkhole near post office parking lot",
        description: "A huge, dangerous sinkhole is expanding near the main exit of the municipal post office.",
        category: "Roads & Transit",
        location: "150 Postal Way",
        reporterName: "John Citizen",
        priority: "High"
      };

      const res = await request(app)
        .post("/api/issues")
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.issueId).toBeDefined();
      expect(res.body.accessCode).toBeDefined();
      expect(res.body.issue.status).toBe("Reported"); // Default status

      createdIssueId = res.body.issueId;
      correctAccessCode = res.body.accessCode;
    });

    it("should allow a citizen with the correct access code to query the complaint status by ID", async () => {
      const res = await request(app)
        .get(`/api/issues/${createdIssueId}`)
        .set("X-Access-Code", correctAccessCode);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdIssueId);
      expect(res.body.title).toBe("Large sinkhole near post office parking lot");
      expect(res.body.status).toBe("Reported");
    });

    it("should allow a citizen with the correct access code to query via query parameters as alternative", async () => {
      const res = await request(app)
        .get(`/api/issues/${createdIssueId}?accessCode=${correctAccessCode}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdIssueId);
    });

    it("should allow the creator with the access code to update their complaint status", async () => {
      const res = await request(app)
        .patch(`/api/issues/${createdIssueId}`)
        .set("X-Access-Code", correctAccessCode)
        .send({ status: "Under Review", comment: "Investigation team assigned." });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.issue.status).toBe("Under Review");
      expect(res.body.issue.updates.length).toBe(2);
    });

    it("SECURITY REGRESSION: should reject a citizen attempting to fetch another citizen's complaint without correct access code", async () => {
      // Trying to guess/access the complaint with a missing access code
      const resNoCode = await request(app)
        .get(`/api/issues/${createdIssueId}`);

      expect(resNoCode.status).toBe(403);
      expect(resNoCode.body.error).toBe("Forbidden");
      expect(resNoCode.body.message).toContain("Security violation");

      // Trying to guess/access the complaint with an incorrect/guessed access code
      const resWrongCode = await request(app)
        .get(`/api/issues/${createdIssueId}`)
        .set("X-Access-Code", "ac-hacker123");

      expect(resWrongCode.status).toBe(403);
      expect(resWrongCode.body.error).toBe("Forbidden");
      expect(resWrongCode.body.message).toContain("Security violation");
    });

    it("SECURITY REGRESSION: should reject updating a complaint if wrong or missing access code is supplied", async () => {
      const res = await request(app)
        .patch(`/api/issues/${createdIssueId}`)
        .send({ status: "Resolved" });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Forbidden");
    });

    it("should fetch the list of public issues without exposing the secret accessCode", async () => {
      const res = await request(app).get("/api/issues");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      // Ensure no item contains the secret accessCode
      res.body.forEach((issue: any) => {
        expect(issue.accessCode).toBeUndefined();
      });
    });

    it("should return 404 for a non-existent complaint ID", async () => {
      const res = await request(app)
        .get("/api/issues/issue-non-existent")
        .set("X-Access-Code", "any-code");

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/chat - AI Companion Endpoints", () => {
    it("should process a valid chat query and return mock response in requested language", async () => {
      const res = await request(app)
        .post("/api/chat")
        .send({
          messages: [{ role: "user", content: "Where do I register to vote?" }],
          language: "Español"
        });

      if (res.status !== 200) {
        console.error("DEBUG CHAT ENDPOINT ERROR:", res.status, res.body);
      }

      expect(res.status).toBe(200);
      expect(res.body.text).toContain("Español");
    });

    it("should gracefully return 400 validation error for empty or malformed queries", async () => {
      const resEmpty = await request(app)
        .post("/api/chat")
        .send({ messages: [] });

      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body.error).toBeDefined();

      const resMalformed = await request(app)
        .post("/api/chat")
        .send({ messages: [{ role: "user" }] }); // missing content string

      expect(resMalformed.status).toBe(400);
    });

    it("should activate local fallback graceful degradation when Gemini API throws an error or fails", async () => {
      process.env.SIMULATE_GEMINI_ERROR = "true";

      const res = await request(app)
        .post("/api/chat")
        .send({
          messages: [{ role: "user", content: "I have a leaking street water pipe" }]
        });

      expect(res.status).toBe(200);
      expect(res.body.text).toContain("Water Utility & Main Pipe Emergency Guide");
      expect(res.body.text).toContain("high-intelligence AI services are currently experiencing extremely high demand");
    });

    it("should trigger fallback response even for generic query topics during Gemini API down times", async () => {
      process.env.SIMULATE_GEMINI_ERROR = "true";

      const res = await request(app)
        .post("/api/chat")
        .send({
          messages: [{ role: "user", content: "Hello there, tell me about licensing" }]
        });

      expect(res.status).toBe(200);
      expect(res.body.text).toContain("Janālok Companion - Helpful Civic Guidance");
    });
  });

  describe("POST /api/simplify - Jargon Simplification Endpoints", () => {
    it("should successfully simplify official documents into plain language JSON structured models", async () => {
      const res = await request(app)
        .post("/api/simplify")
        .send({
          text: "Pursuant to article 4, all residential properties must yield municipal waste on alternating solar intervals.",
          language: "English"
        });

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.keyTakeaways).toBeInstanceOf(Array);
      expect(res.body.nextSteps).toBeInstanceOf(Array);
    });

    it("should handle Gemini API rate-limits/failures gracefully using fallback simplified schema structure", async () => {
      process.env.SIMULATE_GEMINI_ERROR = "true";

      const res = await request(app)
        .post("/api/simplify")
        .send({
          text: "Complex bureaucratic ordinance text here..."
        });

      expect(res.status).toBe(200);
      expect(res.body.summary).toContain("Automated Fallback Summary");
      expect(res.body.keyTakeaways.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/recommend - Service Finder Smart Recommendations", () => {
    it("should recommend fitting services according to user's civic search term", async () => {
      const res = await request(app)
        .post("/api/recommend")
        .send({
          query: "I want to start a local bakery storefront"
        });

      expect(res.status).toBe(200);
      expect(res.body.recommendedServices).toBeInstanceOf(Array);
      expect(res.body.recommendedServices[0].name).toContain("Permit");
    });

    it("should degrade to localized matching heuristics if Gemini experiences errors/timeout limits", async () => {
      process.env.SIMULATE_GEMINI_ERROR = "true";

      const res = await request(app)
        .post("/api/recommend")
        .send({
          query: "pothole road repair required"
        });

      expect(res.status).toBe(200);
      expect(res.body.recommendedServices[0].name).toBe("Municipal Street Repair & Public Works Request");
      expect(res.body.recommendedServices[0].department).toBe("Department of Public Works (DPW)");
    });
  });

  describe("Custom Sliding-Window Rate Limiter Middleware", () => {
    it("should allow regular requests but return 429 Too Many Requests once rate limit threshold is breached", async () => {
      // Mock many requests from a specific simulated IP address to bypass rates
      const makeRequest = () => request(app).get("/api/health").set("X-Forwarded-For", "192.168.1.99");
      
      // Make 30 valid requests (rateLimitMaxRequests is 30)
      for (let i = 0; i < 30; i++) {
        const res = await makeRequest();
        expect(res.status).toBe(200);
      }

      // The 31st request from the same IP should fail with 429
      const rateLimitedRes = await makeRequest();
      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.body.error).toBe("Too Many Requests");
      expect(rateLimitedRes.body.message).toContain("safety rate limit");
    });
  });

  describe("POST /api/translate-static", () => {
    it("should process translation requests successfully using Gemini fallback", async () => {
      const res = await request(app)
        .post("/api/translate-static")
        .send({ text: "Hello", targetLanguage: "es" });

      expect(res.status).toBe(200);
      expect(res.body.translatedText).toBeDefined();
    });
  });

  describe("POST /api/vision-ocr", () => {
    it("should process image OCR requests successfully using Gemini fallback", async () => {
      const res = await request(app)
        .post("/api/vision-ocr")
        .send({ image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP" });

      expect(res.status).toBe(200);
      expect(res.body.rawText).toBeDefined();
      expect(res.body.structured).toBeDefined();
      expect(res.body.structured.summary).toBe("Mocked OCR summary");
    });
  });
});
