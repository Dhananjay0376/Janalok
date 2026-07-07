# Janālok Privacy Policy

Janālok is dedicated to empowering citizens while keeping their privacy, identity, and data fully secure. This document outlines exactly what personal data is handled by the platform, where it is stored, and the duration of storage.

---

## 1. Data Collection & Storage Details

| Data Category | Purpose | Storage Location | Retention Duration |
| :--- | :--- | :--- | :--- |
| **User Submissions (Document text, chat messages, search queries)** | Real-time translation, civic recommendations, and simplifications. | **Transient memory only.** Never written to any persistent file system, server database, or cloud-hosted logs. | Discarded immediately upon completion of the API response. |
| **Grievance/Issue Reports (Potholes, streetlights, sanitation issues)** | Displaying in the public community tracker to let other citizens view and upvote items. | **Client-side session memory (React State / LocalStorage).** | Persists only within your local browser sandbox; can be cleared at any time by clearing your browser cache. |
| **IP Addresses** | Standard server rate-limiting to prevent service abuse. | **In-memory dictionary table on the server.** | Cleared continuously using a 60-second sliding-window. No persistent connection log is maintained. |

---

## 2. Third-Party Services & API Transmissions

- **AI Model Processing:** Text content submitted to the Legal Jargon Simplifier, Service Finder, and Civic Companion is transmitted securely via HTTPS to Google's Gemini API endpoints. 
- **No Training Data:** Under our Enterprise API configurations, data transmitted to the Gemini API is processed ephemerally and is **not** utilized by Google to train or refine public AI models.
- **Sensitive Key Protection:** Your `GEMINI_API_KEY` is kept exclusively on the server side and is never exposed to public browsers, analytics platforms, or external clients.

---

## 3. Clear Console / Safe Diagnostics

- **Plaintext Logging Prohibited:** We strictly enforce a policy where no raw user-submitted text, documents, or personal credentials are printed to server consoles or system diagnostics. All debug outputs are anonymized or masked to ensure plaintext logs do not leak citizen records.
