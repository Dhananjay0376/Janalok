import { CivicService } from "../types";

/**
 * Maps a citizen's search query to matching civic services in the directory based on keyword similarity.
 */
export function mapQueryToService(query: string, directory: CivicService[]): CivicService[] {
  if (!query || !Array.isArray(directory) || directory.length === 0) {
    return [];
  }

  const cleanedQuery = query.toLowerCase().trim();
  if (!cleanedQuery) {
    return [];
  }

  // Keywords mappings for advanced fuzzy lookup
  return directory.filter((service) => {
    const name = service.name.toLowerCase();
    const desc = service.description.toLowerCase();
    const dept = service.department.toLowerCase();

    // Check direct inclusion
    if (name.includes(cleanedQuery) || desc.includes(cleanedQuery) || dept.includes(cleanedQuery)) {
      return true;
    }

    // Split query into terms and match any major keywords (minimum 3 characters to avoid trivial matches)
    const terms = cleanedQuery.split(/\s+/).filter(term => term.length >= 3);
    if (terms.length > 0) {
      return terms.some(term => name.includes(term) || desc.includes(term));
    }

    return false;
  });
}

/**
 * Looks up document requirements for a specific civic service.
 */
export function lookupDocumentRequirements(serviceName: string, directory: CivicService[]): string[] {
  if (!serviceName || !Array.isArray(directory)) {
    return [];
  }

  const cleanedName = serviceName.trim().toLowerCase();
  const service = directory.find(
    (s) => s.name.toLowerCase().trim() === cleanedName
  );

  return service ? service.requirements : [];
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into a friendly, readable format.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") {
    return "Invalid Date";
  }

  const parts = dateStr.split("-");
  if (parts.length !== 3) {
    return "Invalid Date";
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return "Invalid Date";
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return `${months[month - 1]} ${day}, ${year}`;
}

/**
 * Validates the input fields of a public complaint report.
 */
export function validateComplaintInput(
  title: string,
  description: string,
  location: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const trimmedTitle = (title || "").trim();
  const trimmedDesc = (description || "").trim();
  const trimmedLoc = (location || "").trim();

  if (!trimmedTitle) {
    errors.push("Issue Title is required.");
  } else if (trimmedTitle.length < 5) {
    errors.push("Issue Title must be at least 5 characters long.");
  } else if (trimmedTitle.length > 100) {
    errors.push("Issue Title must not exceed 100 characters.");
  }

  if (!trimmedDesc) {
    errors.push("Description is required.");
  } else if (trimmedDesc.length < 15) {
    errors.push("Description must be at least 15 characters long.");
  }

  if (!trimmedLoc) {
    errors.push("Location / Landmark is required.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
