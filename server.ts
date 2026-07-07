import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// --- SECURITY MIDDLEWARE & HELPERS ---

// In-memory cache dictionaries to save costs and bypass API latency on duplicate scenarios
const simplifyCache: Record<string, { data: any; timestamp: number }> = {};
const recommendCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL_MS = 10 * 60000; // 10 minutes cache

// 1. Sliding window memory-based rate limiter to protect Gemini API and server routes
const rateLimitWindowMs = 60000; // 1 minute
const rateLimitMaxRequests = 30; // 30 requests per minute
const rateLimitDb: Record<string, number[]> = {};

/**
 * Custom memory-based rate limiting middleware.
 * Counts and limits the number of requests per IP within a sliding window.
 */
function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.headers["x-forwarded-for"] || req.ip || "unknown";
  const ipStr = Array.isArray(ip) ? ip[0] : String(ip);
  const now = Date.now();

  if (!rateLimitDb[ipStr]) {
    rateLimitDb[ipStr] = [];
  }

  // Filter timestamps within the current window
  rateLimitDb[ipStr] = rateLimitDb[ipStr].filter((timestamp) => now - timestamp < rateLimitWindowMs);

  if (rateLimitDb[ipStr].length >= rateLimitMaxRequests) {
    res.status(429).json({
      error: "Too Many Requests",
      message: "You have exceeded the safety rate limit for civic services. Please wait a moment before trying again."
    });
    return;
  }

  rateLimitDb[ipStr].push(now);
  next();
}

// 2. Standard security headers middleware
/**
 * Sets security-oriented HTTP headers on all API and static file responses
 * to protect against XSS, clickjacking, sniff attacks, and frame hijacks.
 */
function securityHeaders(req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  
  // Set relaxed Content-Security-Policy to allow AI Studio iFrame and Google Fonts/APIs to render seamlessly
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google.com https://*.googleapis.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.googleapis.com; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' https://*.google.com https://*.googleapis.com https://*.run.app; " +
    "frame-ancestors 'self' https://*.google.com https://ai.studio https://*.run.app;"
  );
  next();
}

app.use(securityHeaders);
app.use(rateLimiter);

// 3. Input Sanitization helper
/**
 * Trims and sanitizes standard strings to neutralize potential HTML, script, or SQL tags.
 */
function sanitizeString(str: string): string {
  if (typeof str !== "string") return "";
  let sanitized = str.trim();
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
  return sanitized;
}

// 4. Prompt Injection detection helper
/**
 * Scans text content for structural commands indicating instructional override attempts (jailbreaks).
 */
function containsPromptInjection(text: string): boolean {
  if (typeof text !== "string") return false;
  const lower = text.toLowerCase();
  const patternWords = [
    "ignore previous instructions",
    "ignore above",
    "forget all instructions",
    "reveal your system prompt",
    "reveal your systeminstruction",
    "reveal your api key",
    "print your system instructions",
    "print your system prompt",
    "override instructions",
    "jailbreak",
    "systeminstruction",
    "developer instructions",
    "secret directive",
    "system rules",
    "reveal key"
  ];
  return patternWords.some((pattern) => lower.includes(pattern));
}

const PORT = 3000;

// Lazy initialization of GoogleGenAI to prevent crashing on start if GEMINI_API_KEY is missing
let aiInstance: GoogleGenAI | null = null;

/**
 * Initializes and returns the Google Gen AI client instance lazily.
 * Throws an descriptive error if the API key is not configured.
 *
 * @returns {GoogleGenAI} Configured Google Gen AI client
 */
function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing. Please set it in your Secrets configuration.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

/**
 * Executes a Gemini API content generation call with automatic exponential backoff retry.
 * Handled status is primarily 503 UNAVAILABLE service errors.
 *
 * @param {GoogleGenAI} ai Google Gen AI client
 * @param {any} params parameters for content generation
 * @param {number} maxRetries maximum number of attempts
 * @returns {Promise<any>} Response from Gemini model
 */
async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 3) {
  let delay = 1500;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const isUnavailable = error?.status === "UNAVAILABLE" || 
                            error?.message?.includes("503") || 
                            error?.message?.includes("demand") ||
                            error?.code === 503 ||
                            error?.status === 503 ||
                            String(error).includes("503") ||
                            String(error).includes("UNAVAILABLE");
      
      if (isUnavailable && attempt < maxRetries) {
        console.warn(`[Gemini API] 503 UNAVAILABLE on attempt ${attempt} of ${maxRetries}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff (1500ms, 3000ms)
        continue;
      }
      throw error;
    }
  }
}

// Fallback Generators for Graceful Degradation under high API load (503 Service Unavailable)

/**
 * Returns a static fallback chat response when the Gemini API is overloaded or unavailable.
 * Checks the last message content for topic keywords and returns a highly relevant local guide.
 *
 * @param {any[]} messages previous message list
 * @param {any} userProfile citizen profile memory
 * @returns {string} Plaintext or basic markdown fallback text
 */
function getChatFallbackResponse(messages: any[], userProfile?: any): string {
  const latestMessage = messages[messages.length - 1]?.content || "";
  const query = latestMessage.toLowerCase();
  
  let personalizedHeader = "";
  if (userProfile && userProfile.name) {
    personalizedHeader = `Hello **${userProfile.name}**, recognizing your citizen profile with active report(s) and interests. `;
  }

  let content = "";
  if (query.includes("road") || query.includes("pothole") || query.includes("pavement") || query.includes("mg road")) {
    const hasPotholeReport = userProfile?.issues?.some((i: any) => i.title.toLowerCase().includes("pothole") || i.location.toLowerCase().includes("mg road"));
    
    content = `### Municipal Road Maintenance Guidance 🚧

${personalizedHeader}Thank you for reaching out regarding road or pothole issues. Under the local Public Works protocol, road maintenance schedules are categorized by urgency:

1. **Safety Hazard (Deep potholes or main roads):** Inspected and filled within **24-48 hours**.
2. **Minor Paved Areas / Sub-streets:** Addressed within **5-7 business days**.

${hasPotholeReport ? `**Status Update for your Report:** We have found your filed grievance regarding the pothole. The crew is scheduled to address it by **July 8** under priority dispatch.` : ""}

**Recommended Actions:**
- **Submit a Report:** Use the **Public Issue Tracker** tab in the main panel to report the exact location.
- **Urgent Concern:** If the road condition is posing an immediate risk of accident or vehicle damage, contact your local **Department of Public Works / Highway Authority** immediately.

---
*(Note: Janālok's high-intelligence AI services are currently experiencing extremely high demand. This is a local municipal automated fallback response. Your full query is registered and can be re-run in a few moments!)*`;
  } else if (query.includes("water") || query.includes("pipe") || query.includes("leak") || query.includes("utility")) {
    content = `### Water Utility & Main Pipe Emergency Guide 💧

${personalizedHeader}If you are dealing with or reporting a water leak, burst pipe, or general utility interruption, please follow these safety steps:

1. **Identify the Leak Source:** Determine if the leak is on public property (e.g., street main) or private property.
2. **Shut Off Control Valves:** For private leaks, locate the main shut-off valve immediately to minimize water damage.
3. **Report to Public Utility Board:** Street-level leaks should be reported right away.

**Recommended Actions:**
- **Create Issue Ticket:** Go to our **Public Issue Tracker** and file a report with urgency level "High".
- **Emergency Utility Contact:** Contact your district's **Water and Sanitation Department / Water Board Emergency Line** directly.

---
*(Note: Janālok's high-intelligence AI services are currently experiencing extremely high demand. This is a local municipal automated fallback response. Your full query is registered and can be re-run in a few moments!)*`;
  } else if (query.includes("garbage") || query.includes("sanitation") || query.includes("waste") || query.includes("trash")) {
    content = `### Sanitation & Solid Waste Guidelines 🧹

${personalizedHeader}For trash collection schedules, waste disposal guidelines, or sanitation grievances:

1. **Regular Pick-up:** Solid waste is collected on designated days. Ensure bins are placed by the curb by 7:00 AM.
2. **Bulky Waste / Hazardous Disposal:** Special pickup requests can be filed online or via phone. Do not dispose of paint, batteries, or chemicals in regular bins.

**Recommended Actions:**
- **File Sanitation Issue:** Use the **Public Issue Tracker** to report missed pickups or illegal dumping.
- **Department Contact:** Get in touch with the local **Sanitation & Environment Division**.

---
*(Note: Janālok's high-intelligence AI services are currently experiencing extremely high demand. This is a local municipal automated fallback response. Your full query is registered and can be re-run in a few moments!)*`;
  } else {
    content = `### Janālok Companion - Helpful Civic Guidance 🏛️

${personalizedHeader}Thank you for your inquiry regarding citizen services and public administration. 

1. **Local Public Issue:** If you need to report a hazard, pothole, street lighting failure, or broken utility, please click the **Public Issue Tracker** tab to file an official report.
2. **Policy Simplification:** If you have official paperwork or complex civic rules to simplify, paste the text into our **Jargon Simplifier** tab.
3. **Recommended Services:** Use the **Service Finder** to query required forms, processing times, and department listings.

---
*(Note: Janālok's high-intelligence AI services are currently experiencing extremely high demand. This is a local municipal automated fallback response. Your full query is registered and can be re-run in a few moments!)*`;
  }
  return content;
}

/**
 * Generates structured mock/static fallback output representing a simplified translation of legal text,
 * utilized when the main Gemini service is offline or congested.
 *
 * @param {string} text original legal or bureaucratic text
 * @returns {object} SimplifiedDoc structure matching front-end expectation
 */
function getSimplifyFallbackResponse(text: string) {
  return {
    summary: "*(Automated Fallback Summary)* The input document outlines standard municipal guidelines. The system is currently running in local fallback mode due to high server demand.",
    keyTakeaways: [
      "Official applications usually require verified proofs (Identity, Address, Income).",
      "Most municipal processing times range from 3 to 15 business days depending on service category.",
      "Deadlines, application fees, and supporting guidelines should always be confirmed with the respective city hall clerk."
    ],
    nextSteps: [
      "Gather your official identification documents (Passport, Driver's License, or State ID).",
      "Draft your application forms clearly and double-check standard municipal submission fees.",
      "Submit files directly to the relevant local department or official online portal."
    ],
    glossary: [
      {
        term: "Civic Jurisdiction",
        definition: "The defined geographical area or administrative scope under the control of a specific city council or local government."
      },
      {
        term: "Statutory Processing Time",
        definition: "The legally mandated or standard calendar period allowed for an official agency to review and respond to citizen filings."
      }
    ]
  };
}

/**
 * Provides fallback municipal service suggestions when the Gemini API is offline.
 * Suggests tailored procedures depending on query keywords (roads, water, trash, etc.).
 *
 * @param {string} query user's search query
 * @returns {object} recommended civic service list structure
 */
function getRecommendFallbackResponse(query: string) {
  const q = query.toLowerCase();
  
  let serviceName = "General Citizen Permit & Registration Service";
  let description = "A general municipal service to process registrations, certificates, or compliance permits.";
  let department = "Department of Citizen Administration";
  let requirements = ["Valid Government-issued Photo ID", "Proof of Local Residency (Utility Bill or Rent Agreement)"];
  let steps = ["Complete the universal intake application form", "Attach copy of IDs and residency proofs", "Submit to the local municipal headquarters reception desk"];

  if (q.includes("road") || q.includes("pothole") || q.includes("pavement")) {
    serviceName = "Municipal Street Repair & Public Works Request";
    description = "Allows citizens to submit formal maintenance tickets for roads, curbs, sidewalks, and allied civil works.";
    department = "Department of Public Works (DPW)";
    requirements = ["Exact address or GPS landmark coordinates", "Photo of the road hazard/incident"];
    steps = ["File a ticket detailing the hazard size and exact location", "Include photos if available", "Track resolution progress through the public tracker portal"];
  } else if (q.includes("water") || q.includes("pipe") || q.includes("utility")) {
    serviceName = "Water Main & Utilities Repairs Department";
    description = "Urgent response services to mitigate water wastage, restore water supply pressure, and repair main utility line breaches.";
    department = "Municipal Utility Board & Water Supply Division";
    requirements = ["Specific street address or municipal sector zone", "Detailed description of flow level (gushing vs. trickling)"];
    steps = ["Turn off any local private control valves if leak is internal", "Submit a high-priority incident report with photo proofs", "Our field collectors will complete an-site inspection within 2-4 hours"];
  } else if (q.includes("garbage") || q.includes("trash") || q.includes("waste")) {
    serviceName = "Solid Waste Collection & Public Sanitation Grievance";
    description = "Assists citizens with reporting missed collections, bulk refuse requests, or illegal dumping on public property.";
    department = "Sanitation & Waste Management Authority";
    requirements = ["Your account/street address", "Details of the missed pickup date or location of unauthorized waste"];
    steps = ["Ensure your waste bin is curb-side before standard collection hours", "File a missed service form or incident report", "Our field collectors will complete an extra round if verified"];
  }

  return {
    recommendedServices: [
      {
        name: serviceName,
        description: `${description} *(Local Automated Fallback Recommendation due to high demand)*`,
        department: department,
        urgency: "Medium",
        requirements: requirements,
        processingTime: "2-5 business days",
        steps: steps
      }
    ]
  };
}

// 1. Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Janālok AI Platform API is running." });
});

// --- COMPLAINT/GRIEVANCE SECURE STORE & ENDPOINTS ---

interface ServerIssue {
  id: string;
  title: string;
  description: string;
  category: "Roads & Transit" | "Utilities" | "Sanitation" | "Safety & Lighting" | "Environment" | "Other";
  status: "Reported" | "Under Review" | "Scheduled" | "Resolved";
  location: string;
  dateReported: string;
  reporterName: string;
  upvotes: number;
  photoUrl?: string;
  updates: { date: string; status: "Reported" | "Under Review" | "Scheduled" | "Resolved"; comment: string }[];
  priority: "Low" | "Medium" | "High";
  accessCode: string;
}

const issuesDb: Record<string, ServerIssue> = {
  "issue-1": {
    id: "issue-1",
    title: "Hazardous Double Pothole on Mid-Lane",
    description: "Deep, multi-layered potholes on the center lane of 4th Avenue near Elm Intersection. Forcing cars to swerve dangerously into oncoming lanes. Several hubcaps already damaged.",
    category: "Roads & Transit",
    status: "Scheduled",
    location: "4th Ave & Elm St, Westside",
    dateReported: "2026-07-01",
    reporterName: "Arthur Pendelton",
    upvotes: 42,
    photoUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=400",
    priority: "High",
    updates: [
      { date: "2026-07-01", status: "Reported", comment: "Issue logged, cataloged under Public Works Ref: #PW-8291." },
      { date: "2026-07-02", status: "Under Review", comment: "City road inspector dispatched. Confirmed 4-inch deep failure. Designated high hazard." },
      { date: "2026-07-04", status: "Scheduled", comment: "Asphalt patching crew scheduled for repair on July 8. Traffic cones placed around the zone." }
    ],
    accessCode: "ac-1"
  }
};

// GET /api/issues -> Fetch public complaints (censors the secret access code!)
app.get("/api/issues", (req, res) => {
  const publicList = Object.values(issuesDb).map(({ accessCode, ...issue }) => issue);
  res.json(publicList);
});

// POST /api/issues -> Submit a new complaint
app.post("/api/issues", (req, res) => {
  const { title, description, category, location, reporterName, priority, photoUrl } = req.body;
  if (!title || !description || !location || !category) {
    res.status(400).json({ error: "Validation Error", message: "Missing required fields (title, description, category, location)." });
    return;
  }

  const issueId = `issue-${Date.now()}`;
  const generatedAccessCode = `ac-${Math.random().toString(36).substring(2, 10)}`;

  const newIssue: ServerIssue = {
    id: issueId,
    title: sanitizeString(title),
    description: sanitizeString(description),
    category: category,
    status: "Reported",
    location: sanitizeString(location),
    dateReported: new Date().toISOString().split("T")[0],
    reporterName: reporterName ? sanitizeString(reporterName) : "Anonymous",
    upvotes: 0,
    priority: priority || "Medium",
    photoUrl: photoUrl || "",
    updates: [
      {
        date: new Date().toISOString().split("T")[0],
        status: "Reported",
        comment: "Complaint successfully logged on the Janālok platform. Initial review scheduled."
      }
    ],
    accessCode: generatedAccessCode
  };

  issuesDb[issueId] = newIssue;

  res.status(201).json({
    success: true,
    message: "Complaint submitted successfully.",
    issueId: issueId,
    accessCode: generatedAccessCode,
    issue: newIssue
  });
});

// GET /api/issues/:id -> Get specific complaint status (requires accessCode to view owner's ticket details!)
app.get("/api/issues/:id", (req, res) => {
  const { id } = req.params;
  const accessCode = req.headers["x-access-code"] || req.query.accessCode;

  const issue = issuesDb[id];
  if (!issue) {
    res.status(404).json({ error: "Not Found", message: "Complaint not found with that ID." });
    return;
  }

  // Security Regression Test: A citizen cannot fetch another citizen's complaint details without matching accessCode
  if (!accessCode || issue.accessCode !== accessCode) {
    res.status(403).json({
      error: "Forbidden",
      message: "Security violation: Unauthorized attempt to fetch this personal complaint. Matching access code is required."
    });
    return;
  }

  res.json(issue);
});

// PATCH /api/issues/:id -> Update status of a complaint
app.patch("/api/issues/:id", (req, res) => {
  const { id } = req.params;
  const { status, comment } = req.body;
  const accessCode = req.headers["x-access-code"] || req.query.accessCode;

  const issue = issuesDb[id];
  if (!issue) {
    res.status(404).json({ error: "Not Found", message: "Complaint not found." });
    return;
  }

  // Security check: Only owner with matching accessCode can update
  if (!accessCode || issue.accessCode !== accessCode) {
    res.status(403).json({
      error: "Forbidden",
      message: "Security violation: Unauthorized attempt to modify status. Matching access code is required."
    });
    return;
  }

  if (status) {
    issue.status = status;
  }

  issue.updates.push({
    date: new Date().toISOString().split("T")[0],
    status: issue.status,
    comment: comment || `Status updated to ${issue.status}.`
  });

  res.json({
    success: true,
    message: "Complaint updated successfully.",
    issue: issue
  });
});

// 2. Chat endpoint (AI Companion)
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, language = "English", userProfile, userLocation } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
       res.status(400).json({ error: "Invalid messages format. Expected a non-empty array of message objects." });
       return;
     }

    // Validate and sanitize language string
    const safeLanguage = typeof language === "string" ? sanitizeString(language).substring(0, 30) : "English";

    // Validate and sanitize messages array
    const cleanedMessages = [];
    for (const msg of messages) {
      if (!msg || typeof msg !== "object" || typeof msg.content !== "string") {
        res.status(400).json({ error: "Invalid message payload structure. Expected content to be a string." });
        return;
      }
      
      const rawContent = msg.content;
      if (rawContent.length > 4000) {
        res.status(400).json({ error: "Message content length exceeds safety threshold of 4,000 characters." });
        return;
      }

      if (containsPromptInjection(rawContent)) {
        res.status(400).json({
          error: "Security Alert",
          message: "Safety system flagged this message as a potential system prompt override. Please rephrase your civic query."
        });
        return;
      }

      cleanedMessages.push({
        role: msg.role === "user" ? "user" : "model",
        content: sanitizeString(rawContent)
      });
    }

    const ai = getAI();
    const formattedContents = cleanedMessages.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // Build personalized system instruction incorporating memory context if available
    let systemInstruction = `You are Janālok AI Companion, an intelligent, empathetic, and authoritative civic assistant for municipal, state, and general citizen services. 
    Your goal is to guide citizens, answer queries about public services (e.g. sanitation, housing, utility, voter registration, licensing, emergency services), and suggest proper steps.`;

    if (userProfile && typeof userProfile === "object") {
      const { name, issues, pastQueries } = userProfile;
      systemInstruction += `\n\nVerified Citizen Context (Memory Storage):
      - Active Citizen Name: ${name || "Dhananjay Narula"}
      - Current Language Preference: ${safeLanguage}`;
      
      if (Array.isArray(issues) && issues.length > 0) {
        systemInstruction += `\n      - User's Reported Public Issues (Memory Cache):\n` + issues.map((i: any) => `        * [ID: ${i.id}] "${i.title}" at "${i.location}" (Status: ${i.status}, Urgency/Priority: ${i.priority}, Filed on: ${i.dateReported})`).join("\n");
      }
      if (Array.isArray(pastQueries) && pastQueries.length > 0) {
        systemInstruction += `\n      - Past Search/Inquiry Topics: ${pastQueries.join(", ")}`;
      }
      
      systemInstruction += `\n\nPersonalization Rules:
      1. Always greet the citizen by their name (${name || "Dhananjay Narula"}) when starting the conversation or when appropriate to make the interaction feel customized and authentic.
      2. If they ask about updates or general progress, reference their reported public issues dynamically (e.g., "You reported a pothole on MG Road last week — here's the update: it's Scheduled for repair on July 8").
      3. Proactively reference their past inquiry topics if relevant to their new message.`;
    }

    systemInstruction += `\n\nGeneral Guidelines:
    1. Answer in the requested language: ${safeLanguage}.
    2. Keep your tone highly professional, compassionate, accessible, and clear.
    3. Break down complex steps using numbered lists.
    4. When a citizen reports a grievance, express empathy and advise on the precise municipal department or service they should contact.
    5. NEVER make up specific local phone numbers, personal email addresses, or physical addresses, but refer to generic official offices (e.g., "your local Department of Motor Vehicles" or "Municipal Works Helpline").
    6. Keep answers concise, actionable, and visually clean (use bolding and clear lists).`;

    // 2b & 2c: Dynamic Grounding Strategy
    const latestMessage = cleanedMessages[cleanedMessages.length - 1]?.content || "";
    const queryLower = latestMessage.toLowerCase();
    
    let activeGrounding: "search" | "maps" | "none" = "none";
    const config: any = {
      systemInstruction: systemInstruction,
    };

    const mapsKeywords = ["where", "near", "nearby", "nearest", "location", "map", "office", "address", "pothole at", "street", "road", "directions", "how to get to", "coordinates", "pin", "station", "building", "center", "clinic", "hospital", "school", "library"];
    const searchKeywords = ["document", "process", "how to", "how do i", "apply", "deadline", "schedule", "fee", "requirement", "procedure", "law", "permit", "rules", "eligibility", "date", "voter registration", "business license", "municipal ordinance"];

    if (mapsKeywords.some(keyword => queryLower.includes(keyword))) {
      activeGrounding = "maps";
      config.tools = [{ googleMaps: {} }];
      if (userLocation && typeof userLocation === "object" && typeof userLocation.latitude === "number") {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: Number(userLocation.latitude),
              longitude: Number(userLocation.longitude),
            }
          }
        };
      }
    } else if (searchKeywords.some(keyword => queryLower.includes(keyword))) {
      activeGrounding = "search";
      config.tools = [{ googleSearch: {} }];
    }

    let textResponse = "";
    let sources: any = null;

    try {
      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: formattedContents,
        config: config,
      });
      textResponse = response?.text || "";
      
      // Extract grounding/maps sources
      sources = response?.candidates?.[0]?.groundingMetadata || null;
    } catch (apiError: any) {
      console.warn("Gemini API call failed in /api/chat. Activating local fallback...", apiError);
      textResponse = getChatFallbackResponse(cleanedMessages, userProfile);
    }

    res.json({ text: textResponse, sources, activeGrounding });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// 2d. Cloud Translation API static strings endpoint
app.post("/api/translate-static", async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text) {
      res.status(400).json({ error: "Text field is required." });
      return;
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Google Cloud API key is missing. Set GOOGLE_API_KEY or GEMINI_API_KEY in environment." });
      return;
    }

    // Call official Google Cloud Translation API v2
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        target: targetLanguage
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn("Cloud Translation API returned error, activating Gemini fallback:", errText);
      
      // Fallback: Translate using Gemini
      const ai = getAI();
      const geminiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Translate the following text to language code "${targetLanguage}": \n\n"${text}"`,
        config: {
          systemInstruction: "You are a professional translator. Translate the text precisely and return ONLY the translated string, nothing else. Preserve formatting and placeholders."
        }
      });
      res.json({ translatedText: geminiResponse.text?.trim() || text });
      return;
    }

    const data = await response.json();
    const translatedText = data?.data?.translations?.[0]?.translatedText || text;
    res.json({ translatedText });
  } catch (error: any) {
    console.error("Error in /api/translate-static:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// 2e. Cloud Vision API Document OCR + Gemini Structured Parsing endpoint
app.post("/api/vision-ocr", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== "string") {
      res.status(400).json({ error: "Image data is required and must be a base64 string." });
      return;
    }

    let cleanBase64 = image;
    if (image.includes("base64,")) {
      cleanBase64 = image.split("base64,")[1];
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Google Cloud API key is missing. Set GOOGLE_API_KEY or GEMINI_API_KEY in environment." });
      return;
    }

    let detectedText = "";
    try {
      // Call official Google Cloud Vision API REST endpoint
      const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
      const payload = {
        requests: [
          {
            image: {
              content: cleanBase64
            },
            features: [
              {
                type: "TEXT_DETECTION"
              }
            ]
          }
        ]
      };

      const visionRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (visionRes.ok) {
        const data = await visionRes.json();
        detectedText = data?.responses?.[0]?.fullTextAnnotation?.text || "";
      } else {
        const errText = await visionRes.text();
        console.warn("Cloud Vision API error status:", visionRes.status, errText);
      }
    } catch (visionErr) {
      console.warn("Failed calling Cloud Vision API, will rely entirely on Gemini multimodal OCR:", visionErr);
    }

    // Enhance with Gemini Multimodal extraction
    const ai = getAI();
    const prompt = `Perform OCR and structure the extracted fields from this document. 
    If we have some OCR text from the Vision API, use it as initial reference: "${detectedText}".
    Identify fields such as: Name, Address/Location, Document ID/Reference Number, Document Type (e.g., ID card, Permit, Bill, Letter), Title/Subject, Date, and a clean Summary.
    Return the response in a structured JSON format matching the schema.`;

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: "image/jpeg"
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Extracted full name if present" },
            location: { type: Type.STRING, description: "Extracted address, property coordinates or site location" },
            documentId: { type: Type.STRING, description: "Document identifier, application number, or ID reference" },
            documentType: { type: Type.STRING, description: "Type of document, e.g. Driver's License, Zoning Permit, Tax Assessment, Utility Bill" },
            title: { type: Type.STRING, description: "A concise title or subject line describing this file" },
            date: { type: Type.STRING, description: "Effective date or submission date" },
            summary: { type: Type.STRING, description: "Brief plain-language summary of what this document states" },
            description: { type: Type.STRING, description: "A detailed breakdown of any issues or instructions found in the text" }
          },
          required: ["summary"]
        }
      }
    });

    const structuredData = JSON.parse(geminiResponse.text || "{}");
    res.json({
      rawText: detectedText || structuredData.summary || "",
      structured: structuredData
    });

  } catch (error: any) {
    console.error("Error in /api/vision-ocr:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// 3. Document/Jargon Simplifier endpoint
app.post("/api/simplify", async (req, res) => {
  try {
    const { text, language = "English" } = req.body;
    if (!text || typeof text !== "string") {
       res.status(400).json({ error: "Text field is required and must be a string." });
       return;
    }

    if (text.length > 15000) {
      res.status(400).json({ error: "Input text length exceeds safety limit of 15,000 characters." });
      return;
    }

    if (containsPromptInjection(text)) {
      res.status(400).json({
        error: "Security Alert",
        message: "Safety system flagged this document as containing system prompt override instructions. Request aborted."
      });
      return;
    }

    const safeLanguage = typeof language === "string" ? sanitizeString(language).substring(0, 30) : "English";
    const sanitizedText = sanitizeString(text);

    // Cache lookup to bypass redundant Gemini API calls
    const cacheKey = `${safeLanguage}:${sanitizedText}`;
    if (simplifyCache[cacheKey] && (Date.now() - simplifyCache[cacheKey].timestamp < CACHE_TTL_MS)) {
      res.json(simplifyCache[cacheKey].data);
      return;
    }

    const ai = getAI();
    let parsedData: any = null;

    try {
      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: `Please simplify the following official, legal, or complex civic document/jargon into simple terms: \n\n"${sanitizedText}"`,
        config: {
          systemInstruction: `You are Janālok's civic legal expert who translates dense, confusing government documents, guidelines, legal text, or municipal regulations into crystal-clear plain language. 
          Always translate and write the response in the requested language: ${safeLanguage}. 
          Provide a structured plain language summary, key takeaways, actions required, and a glossary of simplified jargon.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: "A highly clear 1-2 sentence overview of the document in layperson terms."
              },
              keyTakeaways: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "A list of the absolute most critical terms, rights, rules, or insights the citizen must understand."
              },
              nextSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Actionable, numbered list of steps the citizen must take immediately based on this document (if applicable)."
              },
              glossary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING, description: "The complex civic/legal jargon or phrase." },
                    definition: { type: Type.STRING, description: "The translation or simplified definition in highly plain terms." }
                  },
                  required: ["term", "definition"]
                },
                description: "A list of complex jargon words found in the source text alongside easy-to-understand plain terms."
              }
            },
            required: ["summary", "keyTakeaways", "nextSteps", "glossary"]
          }
        }
      });
      parsedData = JSON.parse(response?.text || "{}");
      // Cache successful response
      simplifyCache[cacheKey] = { data: parsedData, timestamp: Date.now() };
    } catch (apiError: any) {
      console.warn("Gemini API call failed in /api/simplify. Activating local fallback...", apiError);
      parsedData = getSimplifyFallbackResponse(sanitizedText);
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in /api/simplify:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// 4. Service Recommendation & Requirements Checklist endpoint
app.post("/api/recommend", async (req, res) => {
  try {
    const { query, language = "English" } = req.body;
    if (!query || typeof query !== "string") {
       res.status(400).json({ error: "Query is required and must be a string." });
       return;
    }

    if (query.length > 1000) {
      res.status(400).json({ error: "Query length exceeds safety limit of 1,000 characters." });
      return;
    }

    if (containsPromptInjection(query)) {
      res.status(400).json({
        error: "Security Alert",
        message: "Safety system flagged this query as containing instruction override indicators. Request aborted."
      });
      return;
    }

    const safeLanguage = typeof language === "string" ? sanitizeString(language).substring(0, 30) : "English";
    const sanitizedQuery = sanitizeString(query);

    // Cache lookup to bypass redundant Gemini API calls
    const cacheKey = `${safeLanguage}:${sanitizedQuery}`;
    if (recommendCache[cacheKey] && (Date.now() - recommendCache[cacheKey].timestamp < CACHE_TTL_MS)) {
      res.json(recommendCache[cacheKey].data);
      return;
    }

    const ai = getAI();
    let parsedData: any = null;

    try {
      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: `Recommend civic services for this citizen situation: \n\n"${sanitizedQuery}"`,
        config: {
          systemInstruction: `You are Janālok's expert municipal service directory search tool. Analyze the citizen's situation/need (e.g. moving to a new house, filing taxes, reporting potholes, requesting housing support, voter ID renewal, starting a local business) and recommend relevant official services. 
          Respond in the requested language: ${safeLanguage}. Return a structured list of recommendations.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedServices: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Name of the civic service." },
                    description: { type: Type.STRING, description: "Why this service is relevant and how it helps the citizen." },
                    department: { type: Type.STRING, description: "The government department that oversees this service." },
                    urgency: { type: Type.STRING, description: "Urgency level of this action: High, Medium, or Low." },
                    requirements: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Documents, ID requirements, or proofs needed (e.g., Proof of Address, ID Card, Tax Return, Bank Statement)."
                    },
                    processingTime: { type: Type.STRING, description: "Typical processing time (e.g., '3-5 business days', 'Immediate', '2 weeks')." },
                    steps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Step-by-step actions required to apply or submit."
                    }
                  },
                  required: ["name", "description", "department", "urgency", "requirements", "processingTime", "steps"]
                },
                description: "Array of matching public services recommended to the citizen."
              }
            },
            required: ["recommendedServices"]
          }
        }
      });
      parsedData = JSON.parse(response?.text || "{}");
      // Cache successful response
      recommendCache[cacheKey] = { data: parsedData, timestamp: Date.now() };
    } catch (apiError: any) {
      console.warn("Gemini API call failed in /api/recommend. Activating local fallback...", apiError);
      parsedData = getRecommendFallbackResponse(sanitizedQuery);
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in /api/recommend:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// 5. Integrate Vite as dev middleware or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite development middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up production static file serving...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve index.html for all non-API GET requests
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Civic AI Platform Server is running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  startServer();
}

export { app };
