import React, { useState } from "react";
import { AlertCircle, MapPin, ThumbsUp, PlusCircle, CheckCircle, Clock, Eye, SlidersHorizontal, Image as ImageIcon, Camera, User, Sparkles, Upload } from "lucide-react";
import { PublicIssue, StatusUpdate } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { db, collection, addDoc, getDocs, doc, updateDoc } from "../firebase";

const INITIAL_ISSUES: PublicIssue[] = [
  {
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
    ]
  },
  {
    id: "issue-2",
    title: "Entire Block of Streetlights Non-Operational",
    description: "All six safety lamps along Jefferson Boulevard are completely dark. Creating a major safety concern for pedestrian commuters and local shop owners in the evening.",
    category: "Safety & Lighting",
    status: "Under Review",
    location: "1200 Block, Jefferson Blvd",
    dateReported: "2026-07-04",
    reporterName: "Elena Rostova",
    upvotes: 29,
    photoUrl: "https://images.unsplash.com/photo-1509023464722-18d996393ca8?auto=format&fit=crop&q=80&w=400",
    priority: "Medium",
    updates: [
      { date: "2026-07-04", status: "Reported", comment: "Issue logged under Streetlights & Power Ref: #SL-4410." },
      { date: "2026-07-05", status: "Under Review", comment: "Engineering diagnostic team notified. Power grid feed fluctuation is suspected as root cause." }
    ]
  },
  {
    id: "issue-3",
    title: "Burst Main Pipe causing Water Wastage",
    description: "Significant volumes of clean drinking water are actively bubbling up from beneath the curb, running down the sewer drain. Flooding the sidewalk and corner accessibility ramp.",
    category: "Utilities",
    status: "Resolved",
    location: "S. Maple Ave & Pine Blvd",
    dateReported: "2026-06-28",
    reporterName: "Marcus Vance",
    upvotes: 56,
    photoUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=400",
    priority: "High",
    updates: [
      { date: "2026-06-28", status: "Reported", comment: "Emergency water utility issue received." },
      { date: "2026-06-28", status: "Under Review", comment: "Water Department shutoff crew isolated the burst lateral pipeline." },
      { date: "2026-06-29", status: "Scheduled", comment: "Emergency excavation scheduled to replace the fractured main valve joint." },
      { date: "2026-06-30", status: "Resolved", comment: "Pipeline replaced successfully, soil compacted, and temporary road asphalt patch cured. Fully operational." }
    ]
  },
  {
    id: "issue-4",
    title: "Overflowing Park Trash & Litter Spill",
    description: "Receptacles surrounding the children's play playground are fully packed, resulting in windblown litter across the grassy picnic fields. Attracting aggressive wasps.",
    category: "Sanitation",
    status: "Resolved",
    location: "Oakridge Community Park Playground",
    dateReported: "2026-07-02",
    reporterName: "Sarah Chen",
    upvotes: 15,
    photoUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=400",
    priority: "Low",
    updates: [
      { date: "2026-07-02", status: "Reported", comment: "Issue logged, cataloged under Parks & Rec Ref: #PK-9011." },
      { date: "2026-07-03", status: "Resolved", comment: "Sanitation crew emptied all play park receptacles and executed a full litter sweep." }
    ]
  }
];

const CATEGORIES = ["Roads & Transit", "Utilities", "Sanitation", "Safety & Lighting", "Environment", "Other"] as const;

interface IssueReportProps {
  user: any;
}

/**
 * IssueReport component provides a community feed and interactive form
 * for citizens to submit, track, upvote, and monitor public space hazards,
 * infrastructure failures, utility breaks, or sanitational concerns.
 */
export default function IssueReport({ user }: IssueReportProps) {
  const [issues, setIssues] = useState<PublicIssue[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("All");
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  // Sync with Firestore or localStorage depending on user mode
  React.useEffect(() => {
    const fetchIssues = async () => {
      if (user?.isMock) {
        // Load mock issues from localStorage
        const savedMock = localStorage.getItem("janalok_mock_issues");
        if (savedMock) {
          setIssues(JSON.parse(savedMock));
        } else {
          localStorage.setItem("janalok_mock_issues", JSON.stringify(INITIAL_ISSUES));
          setIssues(INITIAL_ISSUES);
        }
      } else {
        // Real user / Guest -> load from Firebase
        try {
          const issuesCol = collection(db, "issues");
          const snapshot = await getDocs(issuesCol);
          const list: PublicIssue[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as any);
          });

          if (list.length > 0) {
            list.sort((a, b) => new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime());
            setIssues(list);
            localStorage.setItem("janalok_all_issues", JSON.stringify(list));
          } else {
            // empty firestore: seed INITIAL_ISSUES!
            const seeded: PublicIssue[] = [];
            for (const item of INITIAL_ISSUES) {
              const docRef = await addDoc(collection(db, "issues"), item);
              seeded.push({ ...item, id: docRef.id });
            }
            setIssues(seeded);
            localStorage.setItem("janalok_all_issues", JSON.stringify(seeded));
          }
        } catch (err) {
          console.warn("Firestore incident load failed, activating offline cache fallback:", err);
          const saved = localStorage.getItem("janalok_all_issues");
          if (saved) {
            setIssues(JSON.parse(saved));
          } else {
            localStorage.setItem("janalok_all_issues", JSON.stringify(INITIAL_ISSUES));
            setIssues(INITIAL_ISSUES);
          }
        }
      }
    };

    fetchIssues();
  }, [user?.isMock]);

  // Reset pagination window when active filters change
  React.useEffect(() => {
    setVisibleCount(5);
  }, [activeFilter, activeStatusFilter]);

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("Roads & Transit");
  const [location, setLocation] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [photoInputUrl, setPhotoInputUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrMsg, setOcrMsg] = useState<string | null>(null);

  // Upvote handling in Firestore or localStorage
  const handleUpvote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Snappy UI feedback first
    setIssues(prev => {
      const updated = prev.map(issue => {
        if (issue.id === id) {
          return { ...issue, upvotes: (issue.upvotes || 0) + 1 };
        }
        return issue;
      });
      if (user?.isMock) {
        localStorage.setItem("janalok_mock_issues", JSON.stringify(updated));
      } else {
        localStorage.setItem("janalok_all_issues", JSON.stringify(updated));
      }
      return updated;
    });

    if (!user?.isMock) {
      try {
        const match = issues.find(i => i.id === id);
        if (match) {
          const docRef = doc(db, "issues", id);
          await updateDoc(docRef, {
            upvotes: (match.upvotes || 0) + 1
          });
        }
      } catch (err) {
        console.warn("Firestore upvote sync failed:", err);
      }
    }
  };

  // OCR Auto-populate
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrScanning(true);
    setOcrMsg(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const res = await fetch("/api/vision-ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64String })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.structured) {
            if (data.structured.title) setTitle(data.structured.title);
            if (data.structured.location) setLocation(data.structured.location);
            if (data.structured.description || data.structured.summary) {
              setDescription(data.structured.description || data.structured.summary);
            }
            if (data.structured.documentType) {
              setCategory("Other");
            }
            setOcrMsg("✅ Pre-populated location and description successfully using Google Cloud Vision OCR!");
          } else if (data.rawText) {
            setDescription(data.rawText);
            setOcrMsg("✅ Text extracted! Please review fields.");
          }
        }
        setPhotoInputUrl(base64String);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn("OCR incident scan failed:", err);
      setOcrMsg("⚠️ Image scanned, but OCR extraction skipped. You can type details manually.");
    } finally {
      setOcrScanning(false);
    }
  };

  // Submit Issue to Firestore or LocalStorage
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim()) return;

    setSubmitting(true);
    try {
      const defaultPhotos: Record<string, string> = {
        "Roads & Transit": "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=400",
        "Utilities": "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=400",
        "Sanitation": "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=400",
        "Safety & Lighting": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?auto=format&fit=crop&q=80&w=400",
        "Environment": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=400",
        "Other": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400"
      };

      const finalReporterName = reporterName.trim() || (user ? (user.displayName || user.email?.split("@")[0]) : "") || "Anonymous Citizen";

      const rawPayload = {
        title: title.trim(),
        description: description.trim(),
        category,
        status: "Reported" as const,
        location: location.trim(),
        dateReported: new Date().toISOString().split("T")[0],
        reporterName: finalReporterName,
        upvotes: 1,
        photoUrl: photoInputUrl.trim() || defaultPhotos[category],
        priority,
        updates: [
          { date: new Date().toISOString().split("T")[0], status: "Reported" as const, comment: "Public complaint received via Citizen Portal. Waiting for inspection queue." }
        ]
      };

      if (user?.isMock) {
        const mockId = `mock-issue-${Date.now()}`;
        const newIssue: PublicIssue = {
          id: mockId,
          ...rawPayload
        };

        setIssues(prev => {
          const updated = [newIssue, ...prev];
          localStorage.setItem("janalok_mock_issues", JSON.stringify(updated));
          return updated;
        });

        const userCreatedIds = JSON.parse(localStorage.getItem("user_created_issue_ids") || "[]");
        userCreatedIds.push(newIssue.id);
        localStorage.setItem("user_created_issue_ids", JSON.stringify(userCreatedIds));
      } else {
        // Push to Firestore
        const docRef = await addDoc(collection(db, "issues"), rawPayload);
        const newIssue: PublicIssue = {
          id: docRef.id,
          ...rawPayload
        };

        setIssues(prev => {
          const updated = [newIssue, ...prev];
          localStorage.setItem("janalok_all_issues", JSON.stringify(updated));
          return updated;
        });

        // Cache as user-created for AI Memory Vault personalization
        const userCreatedIds = JSON.parse(localStorage.getItem("user_created_issue_ids") || "[]");
        userCreatedIds.push(newIssue.id);
        localStorage.setItem("user_created_issue_ids", JSON.stringify(userCreatedIds));
      }
      
      // Reset Form States
      setTitle("");
      setDescription("");
      setLocation("");
      setReporterName("");
      setPriority("Medium");
      setPhotoInputUrl("");
      setShowForm(false);
    } catch (err) {
      console.error("Failed to add incident report:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchesCategory = activeFilter === "All" || issue.category === activeFilter;
    const matchesStatus = activeStatusFilter === "All" || issue.status === activeStatusFilter;
    return matchesCategory && matchesStatus;
  });

  const paginatedIssues = filteredIssues.slice(0, visibleCount);

  return (
    <div className="space-y-6" id="issue-report-component">
      {/* Upper controls block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-natural-charcoal">Public Issue Tracker</h2>
          <p className="text-xs text-natural-forest font-medium">Report public space hazards, utility breaks, or municipal failures. Track resolution progress transparently.</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 px-5 py-3 bg-natural-forest hover:bg-[#4A5741] text-white font-bold text-sm rounded-2xl shadow-xs transition-all duration-200 cursor-pointer self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showForm ? "View Issues Feed" : "Report Public Issue"}</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="report-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white border border-natural-border rounded-[32px] p-6 shadow-xs max-w-2xl mx-auto"
          >
            <h3 className="text-base font-serif font-bold text-natural-charcoal mb-5 border-b border-natural-border pb-3 flex items-center">
              <Camera className="w-4 h-4 mr-2 text-natural-clay" />
              File a Local Public Grievance
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="issue-title-input" className="text-xs font-bold uppercase tracking-widest text-natural-forest">Issue Title*</label>
                  <input
                    type="text"
                    id="issue-title-input"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g., Deep pothole, Flickering street lamp"
                    className="w-full p-2.5 bg-natural-bone border border-natural-border rounded-xl text-xs md:text-sm text-natural-charcoal font-semibold focus:outline-none focus:border-natural-forest focus:ring-1 focus:ring-natural-forest"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="issue-category-select" className="text-xs font-bold uppercase tracking-widest text-natural-forest">Category*</label>
                  <select
                    id="issue-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-natural-bone border border-natural-border rounded-xl text-xs md:text-sm text-natural-charcoal font-semibold focus:outline-none focus:border-natural-forest"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="issue-description-textarea" className="text-xs font-bold uppercase tracking-widest text-natural-forest">Description*</label>
                <textarea
                  id="issue-description-textarea"
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail. What is the hazard? How long has it been present?"
                  className="w-full p-2.5 bg-natural-bone border border-natural-border rounded-xl text-xs md:text-sm text-natural-charcoal font-semibold focus:outline-none focus:border-natural-forest focus:ring-1 focus:ring-natural-forest"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="issue-location-input" className="text-xs font-bold uppercase tracking-widest text-natural-forest">Specific Location / Landmark*</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-natural-forest/60 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      id="issue-location-input"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="E.g., 400 block of Oak St near the park"
                      className="w-full pl-9 pr-3 py-2.5 bg-natural-bone border border-natural-border rounded-xl text-xs md:text-sm text-natural-charcoal font-semibold focus:outline-none focus:border-natural-forest"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="issue-reporter-input" className="text-xs font-bold uppercase tracking-widest text-natural-forest">Your Name (Optional)</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-natural-forest/60 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      id="issue-reporter-input"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder="Leave empty for Anonymous"
                      className="w-full pl-9 pr-3 py-2.5 bg-natural-bone border border-natural-border rounded-xl text-xs md:text-sm text-natural-charcoal font-semibold focus:outline-none focus:border-natural-forest"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-natural-forest">Hazard Urgency Priority</label>
                  <div className="flex space-x-2">
                    {["Low", "Medium", "High"].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p as any)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
                          priority === p
                            ? p === "High" ? "bg-rose-50 border-rose-200 text-rose-700" :
                              p === "Medium" ? "bg-natural-cream border-natural-border text-natural-forest" :
                              "bg-[#E5E0D8]/40 border-natural-border text-natural-charcoal"
                            : "bg-white border-natural-border text-natural-forest/60 hover:border-natural-clay"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="issue-photo-input" className="text-xs font-bold uppercase tracking-widest text-natural-forest">Photo URL (Optional)</label>
                  <div className="relative">
                    <ImageIcon className="w-4 h-4 text-natural-forest/60 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      id="issue-photo-input"
                      value={photoInputUrl}
                      onChange={(e) => setPhotoInputUrl(e.target.value)}
                      placeholder="Paste image link or leave empty to generate"
                      className="w-full pl-9 pr-3 py-2.5 bg-natural-bone border border-natural-border rounded-xl text-xs md:text-sm text-natural-charcoal font-semibold focus:outline-none focus:border-natural-forest"
                    />
                  </div>
                </div>
              </div>

              {/* Drag and Drop Real Vision-OCR scanner */}
              <div className="border-2 border-dashed border-natural-border hover:border-natural-clay rounded-xl p-6 text-center cursor-pointer transition-colors bg-natural-bone/40 relative">
                <input
                  type="file"
                  id="incident-scan-input"
                  accept="image/*"
                  onChange={handleFileScan}
                  className="hidden"
                />
                <label htmlFor="incident-scan-input" className="cursor-pointer block space-y-2">
                  {ocrScanning ? (
                    <div className="w-6 h-6 border-2 border-natural-forest/30 border-t-natural-forest rounded-full animate-spin mx-auto mb-2"></div>
                  ) : (
                    <Camera className="w-6 h-6 text-natural-forest/60 mx-auto mb-2" />
                  )}
                  <p className="text-xs font-semibold text-natural-charcoal">
                    {ocrScanning ? "Processing Photo with Google Vision OCR..." : "Upload & Analyze Incident Image"}
                  </p>
                  <p className="text-[10px] text-natural-forest/80 mt-1">
                    Upload an image of the pothole, leak, or sign. We'll pre-fill description and location.
                  </p>
                </label>
              </div>

              {ocrMsg && (
                <div className="p-3 bg-natural-cream border border-natural-border text-natural-forest text-xs rounded-xl font-semibold">
                  {ocrMsg}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-natural-border">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-natural-border text-natural-forest font-semibold rounded-2xl text-xs md:text-sm hover:bg-natural-bone transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-natural-forest text-white rounded-2xl text-xs md:text-sm font-bold shadow-xs hover:bg-[#4A5741] disabled:bg-natural-bone disabled:text-natural-forest/50 transition-colors cursor-pointer flex items-center"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      <span>Filing Incident Report...</span>
                    </>
                  ) : (
                    <span>Submit Report</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* Grievance Feed UI */
          <motion.div
            key="issues-feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Filtering bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-natural-bone border border-natural-border p-4 rounded-2xl">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-natural-forest/60" />
                <span className="text-xs font-bold uppercase tracking-widest text-natural-forest">Filters:</span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {["All", ...CATEGORIES].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                      activeFilter === filter
                        ? "bg-natural-forest border-natural-forest text-white font-bold"
                        : "bg-white border-natural-border text-natural-forest hover:border-natural-clay hover:bg-natural-bone"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="h-px w-full md:hidden bg-natural-border"></div>

              {/* Status filtering */}
              <div className="flex items-center space-x-1 text-xs">
                <span className="font-semibold text-natural-forest/80 mr-2">Status:</span>
                {["All", "Reported", "Under Review", "Scheduled", "Resolved"].map(status => (
                  <button
                    key={status}
                    onClick={() => setActiveStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      activeStatusFilter === status
                        ? "bg-natural-forest text-white font-bold"
                        : "bg-transparent text-natural-forest/60 hover:text-natural-charcoal"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Grievance Cards */}
            <div className="grid grid-cols-1 gap-4">
              {paginatedIssues.map((issue) => {
                const isExpanded = expandedIssue === issue.id;
                return (
                  <div
                    key={issue.id}
                    className={`bg-white border rounded-[32px] transition-all duration-200 overflow-hidden ${
                      isExpanded ? "border-natural-clay shadow-xs" : "border-natural-border hover:border-natural-clay shadow-3xs"
                    }`}
                  >
                    {/* Card main trigger button for toggling expansion details */}
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                      className="w-full text-left p-5 flex flex-col md:flex-row gap-5 hover:bg-natural-bone/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest rounded-t-[32px] transition-all cursor-pointer"
                      aria-label={`${isExpanded ? "Collapse" : "Expand"} details for: ${issue.title}`}
                    >
                      {/* Left: Illustration Photo */}
                      {issue.photoUrl && (
                        <div className="w-full md:w-40 h-32 md:h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-natural-bone border border-natural-border">
                          <img
                            src={issue.photoUrl}
                            alt={`Incident photo illustrating: ${issue.title}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            width={160}
                            height={112}
                          />
                        </div>
                      )}

                      {/* Right: Content details */}
                      <div className="flex-1 space-y-2 flex flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-bold text-natural-forest bg-natural-cream border border-natural-border px-2.5 py-0.5 rounded-full">
                                {issue.category}
                              </span>
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center ${
                                issue.status === "Resolved" ? "bg-[#FEFAE0] text-natural-forest border-natural-border" :
                                issue.status === "Scheduled" ? "bg-natural-bone text-natural-forest border-natural-border" :
                                issue.status === "Under Review" ? "bg-[#E5E0D8]/45 text-natural-charcoal border-natural-border" :
                                "bg-natural-bone text-natural-forest border-natural-border"
                              }`}>
                                {issue.status === "Resolved" && <CheckCircle className="w-3 h-3 mr-1" />}
                                {issue.status === "Scheduled" && <Clock className="w-3 h-3 mr-1" />}
                                {issue.status === "Under Review" && <Eye className="w-3 h-3 mr-1" />}
                                {issue.status}
                              </span>
                            </div>

                            <span className="text-[10px] text-natural-forest/80 font-semibold">
                              Reported: {issue.dateReported}
                            </span>
                          </div>

                          <h3 className="text-base font-serif font-bold text-natural-charcoal mt-1.5 flex items-center">
                            {issue.title}
                            {issue.priority === "High" && (
                              <span className="ml-2 text-[10px] text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md font-bold">
                                High Hazard
                              </span>
                            )}
                          </h3>
                          <p className={`text-xs text-natural-forest/90 font-medium leading-relaxed mt-1 ${isExpanded ? "" : "line-clamp-2"}`}>
                            {issue.description}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Sibling Footer containing location and actions */}
                    <div className="px-5 pb-5 pt-3 flex flex-wrap items-center justify-between gap-4 border-t border-natural-border/30 text-[11px] text-natural-forest">
                      <div className="flex items-center space-x-3 font-semibold">
                        <span className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-natural-forest/70" />
                          {issue.location}
                        </span>
                        <span className="flex items-center">
                          <User className="w-3.5 h-3.5 mr-1 text-natural-forest/70" />
                          {issue.reporterName}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => handleUpvote(issue.id, e)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-natural-bone hover:bg-natural-cream border border-natural-border text-natural-forest hover:text-natural-charcoal rounded-xl transition-colors cursor-pointer font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest"
                          aria-label={`Upvote report: ${issue.title}. Current count is ${issue.upvotes}`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{issue.upvotes} Upvotes</span>
                        </button>
                        <span className="text-natural-clay font-bold hover:underline text-[10px] hidden md:inline">
                          {isExpanded ? "Collapse Details" : "View Progress Timeline"}
                        </span>
                      </div>
                    </div>

                    {/* Expandable History and updates timeline map */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="border-t border-natural-border bg-natural-bone/25"
                        >
                          <div className="p-5 space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-natural-forest flex items-center">
                              <Sparkles className="w-3.5 h-3.5 mr-1 text-natural-clay" />
                              Official Resolution Roadmap & History
                            </h4>

                            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-natural-border">
                              {issue.updates.map((update, uidx) => {
                                const isLatest = uidx === issue.updates.length - 1;
                                return (
                                  <div key={uidx} className="relative">
                                    <span className={`absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                                      isLatest
                                        ? "bg-natural-forest border-natural-forest ring-4 ring-natural-bone"
                                        : "bg-white border-natural-border"
                                    }`} />
                                    
                                    <div className="space-y-0.5">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-[10px] font-bold text-natural-forest/60">{update.date}</span>
                                        <span className="text-xs font-bold text-natural-charcoal bg-white border border-natural-border px-2.5 py-0.5 rounded-md">
                                          {update.status}
                                        </span>
                                      </div>
                                      <p className="text-xs text-natural-charcoal font-medium leading-relaxed">{update.comment}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {filteredIssues.length > visibleCount && (
                <div className="flex justify-center pt-4" id="load-more-btn-container">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 5)}
                    className="px-6 py-2.5 bg-white border border-natural-border text-natural-forest font-bold text-xs rounded-full hover:border-natural-clay hover:text-natural-charcoal cursor-pointer shadow-3xs hover:shadow-2xs transition-all"
                  >
                    Load More Incidents ({filteredIssues.length - visibleCount} remaining)
                  </button>
                </div>
              )}

              {filteredIssues.length === 0 && (
                <div className="py-12 text-center bg-natural-bone border-2 border-dashed border-natural-border rounded-[32px] flex flex-col items-center justify-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-natural-forest/40" />
                  <h4 className="text-xs font-bold text-natural-charcoal">No Issues Matches Found</h4>
                  <p className="text-[10px] text-natural-forest font-semibold">No reported public issues meet your filtered combination.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
