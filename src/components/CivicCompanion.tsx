import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Languages, HelpCircle, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { ChatMessage } from "../types";
import { motion } from "motion/react";

interface CivicCompanionProps {
  onRecommendService: (query: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  user: any;
}

const SUPPORTED_LANGUAGES = [
  { code: "English", label: "English" },
  { code: "Español", label: "Español" },
  { code: "Tiếng Việt", label: "Tiếng Việt" },
  { code: "Tagalog", label: "Tagalog" },
  { code: "中文", label: "中文" },
];

const PRESETS = [
  {
    title: "Voter Registration",
    prompt: "What are the eligibility requirements and registration deadlines for voting in municipal elections?",
    icon: Sparkles,
  },
  {
    title: "Renew Driver's License",
    prompt: "How do I renew my driver's license online and what documents do I need to upload?",
    icon: Sparkles,
  },
  {
    title: "Report Broken Streetlight",
    prompt: "I want to report a broken streetlight on my street. Which department handles this and what information should I provide?",
    icon: Sparkles,
  },
  {
    title: "Small Business Permit",
    prompt: "What permits are required to start a small retail business or food stall in the city?",
    icon: Sparkles,
  },
];

// Helper to format basic markdown-like structures safely (bold, lists, headers)
function formatMessageContent(text: string) {
  return text.split("\n").map((line, idx) => {
    let content: React.ReactNode = line;
    
    // Check for headers
    if (line.startsWith("### ")) {
      return (
        <h4 key={idx} className="text-base font-bold text-slate-800 mt-3 mb-1">
          {line.replace("### ", "")}
        </h4>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h3 key={idx} className="text-lg font-bold text-slate-900 mt-4 mb-2">
          {line.replace("## ", "")}
        </h3>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h2 key={idx} className="text-xl font-bold text-slate-900 mt-4 mb-2">
          {line.replace("# ", "")}
        </h2>
      );
    }

    // Check for list items
    const listMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
    if (listMatch) {
      const itemText = listMatch[2];
      content = <li className="ml-4 list-disc text-slate-700 my-1">{parseBoldText(itemText)}</li>;
      return <div key={idx}>{content}</div>;
    }

    const numberedMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
    if (numberedMatch) {
      const itemText = numberedMatch[2];
      content = <li className="ml-4 list-decimal text-slate-700 my-1">{parseBoldText(itemText)}</li>;
      return <div key={idx}>{content}</div>;
    }

    // Default line with potential bold tags
    if (line.trim() === "") {
      return <div key={idx} className="h-2"></div>;
    }

    return (
      <p key={idx} className="text-slate-700 leading-relaxed mb-1.5 text-sm md:text-base">
        {parseBoldText(line)}
      </p>
    );
  });
}

function parseBoldText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/**
 * CivicCompanion is an interactive AI-powered chat companion component
 * that assists citizens in understanding local government policies,
 * rules, registration procedures, and recommending specific civic services.
 *
 * @param props.onRecommendService callback to switch to service finder with search query
 * @param props.selectedLanguage currently active translation language
 * @param props.setSelectedLanguage callback to change selected language
 * @param props.user authenticated citizen or null
 */
export default function CivicCompanion({ onRecommendService, selectedLanguage, setSelectedLanguage, user }: CivicCompanionProps) {
  const activeName = user ? (user.displayName || user.email?.split("@")[0] || "Citizen") : "Guest Citizen";
  const initials = activeName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "GC";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickInquiriesCollapsed, setQuickInquiriesCollapsed] = useState(false);
  
  // Personalized state banks
  const [userIssues, setUserIssues] = useState<any[]>([]);
  const [pastTopics, setPastTopics] = useState<string[]>([]);
  const [showMobileMemory, setShowMobileMemory] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Welcome message with personalization
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "model",
        content: `Hello ${activeName}! I am your **Janālok Companion**. As your personalized civic assistant, I have connected with your citizen record. I can help you track your filed public reports, simplify city paperwork, find local government programs, or pin nearby municipal offices. Let's make civic tech work for you!\n\nWhat can I assist you with today?`,
        timestamp: new Date(),
      },
    ]);
  }, [user, activeName]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, loading]);

  // Handle auto-detect location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (err) => {
          console.warn("Geolocation coordinate query declined or unavailable:", err);
        }
      );
    }
  }, []);

  // Sync and manage local memory cache
  useEffect(() => {
    const loadMemory = () => {
      const allIssuesRaw = localStorage.getItem("janalok_all_issues");
      const userIssueIdsRaw = localStorage.getItem("user_created_issue_ids");
      
      const allIssues = allIssuesRaw ? JSON.parse(allIssuesRaw) : [];
      const userIssueIds = userIssueIdsRaw ? JSON.parse(userIssueIdsRaw) : [];
      
      let personalIssues = allIssues.filter((i: any) => userIssueIds.includes(i.id));
      
      // Seed a default issue for Dhananjay/Citizen to demonstrate instant memory out-of-the-box
      if (personalIssues.length === 0) {
        const defaultUserIssue = {
          id: "PW-1029",
          title: "Reported Pothole on MG Road",
          description: "Large deep pothole on MG Road corner, near the main library. Causing traffic slowdowns.",
          category: "Roads & Transit",
          status: "Scheduled",
          location: "MG Road near Central Library",
          dateReported: "2026-06-30",
          reporterName: activeName,
          upvotes: 8,
          priority: "High",
          updates: [
            { date: "2026-06-30", status: "Reported", comment: "Logged as Ref: #PW-1029." },
            { date: "2026-07-02", status: "Scheduled", comment: "Patching crew dispatched. Repairs scheduled for July 8." }
          ]
        };
        personalIssues = [defaultUserIssue];
        localStorage.setItem("user_created_issue_ids", JSON.stringify(["PW-1029"]));
        
        // Add to global cache
        const currentAll = [...allIssues];
        if (!currentAll.some((x: any) => x.id === "PW-1029")) {
          currentAll.push(defaultUserIssue);
          localStorage.setItem("janalok_all_issues", JSON.stringify(currentAll));
        }
      }
      
      setUserIssues(personalIssues);
      
      // Sync past topics
      const savedTopics = localStorage.getItem("user_past_topics");
      if (savedTopics) {
        setPastTopics(JSON.parse(savedTopics));
      } else {
        const defaultTopics = ["Voter Eligibility", "Driver's License Online", "Small Business Permit"];
        setPastTopics(defaultTopics);
        localStorage.setItem("user_past_topics", JSON.stringify(defaultTopics));
      }
    };

    loadMemory();
    
    // Periodically poll local storage to keep tabs unified instantly
    window.addEventListener("storage", loadMemory);
    const interval = setInterval(loadMemory, 1500);
    
    return () => {
      window.removeEventListener("storage", loadMemory);
      clearInterval(interval);
    };
  }, [user, activeName]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    // Save query to past topics memory if short and unique
    if (textToSend.length < 40 && !pastTopics.includes(textToSend)) {
      const updatedTopics = [textToSend, ...pastTopics.filter(t => t !== textToSend).slice(0, 4)];
      setPastTopics(updatedTopics);
      localStorage.setItem("user_past_topics", JSON.stringify(updatedTopics));
    }

    try {
      const historyPayload = [...messages, userMsg].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyPayload,
          language: selectedLanguage,
          userLocation: userLocation,
          userProfile: {
            name: activeName,
            issues: userIssues,
            pastQueries: pastTopics
          }
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to get response from Civic Companion.");
      }

      const data = await res.json();
      const modelMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "model",
        content: data.text || "I was unable to synthesize a response. Please try again.",
        timestamp: new Date(),
        sources: data.sources,
        activeGrounding: data.activeGrounding
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const renderMemoryContent = () => (
    <div className="flex flex-col space-y-5">
      {/* Verified Citizen Profile Card */}
      <div className="bg-white border border-natural-border p-4 rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-natural-forest/10 text-natural-forest font-bold rounded-xl flex items-center justify-center text-sm">
            {initials}
          </div>
          <div>
            <h3 className="text-xs font-bold text-natural-charcoal">{activeName}</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-natural-cream text-natural-forest border border-natural-sage/10 mt-1">
              ✓ Verified Citizen
            </span>
          </div>
        </div>
        <div className="text-[10px] text-natural-forest space-y-1 pt-2.5 border-t border-natural-border/60">
          <p><span className="text-natural-forest/70 font-semibold">Zone:</span> Municipal Zone 4-A</p>
          <p><span className="text-natural-forest/70 font-semibold">Standing:</span> Active Community Reporter</p>
        </div>
      </div>

      {/* Reported Grievance memory */}
      <div className="space-y-2.5">
        <h4 className="text-[10px] font-bold text-natural-forest/80 uppercase tracking-wider flex items-center">
          <span>📋 My Incidents (Memory)</span>
          <span className="ml-auto bg-natural-sage/20 text-natural-forest px-1.5 py-0.5 rounded-md text-[9px] font-bold">
            {userIssues.length}
          </span>
        </h4>
        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
          {userIssues.map((issue) => (
            <button
              key={issue.id}
              onClick={() => {
                handleSend(`Please give me an update on my reported incident: "${issue.title}" (Ref: ${issue.id}).`);
                setShowMobileMemory(false);
              }}
              className="w-full text-left p-2.5 rounded-xl border border-natural-border bg-white hover:border-natural-clay hover:shadow-2xs transition-all duration-200 cursor-pointer text-xs"
            >
              <div className="flex justify-between items-start mb-0.5">
                <span className="font-bold text-natural-charcoal truncate pr-2">{issue.title}</span>
                <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                  issue.status === "Scheduled" || issue.status === "In Progress"
                    ? "bg-amber-50 text-amber-700 border border-amber-100"
                    : issue.status === "Resolved"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-slate-50 text-slate-700 border border-slate-100"
                }`}>
                  {issue.status}
                </span>
              </div>
              <p className="text-[9px] text-natural-forest line-clamp-1 mb-1">{issue.description}</p>
              <div className="flex text-[8px] text-natural-forest/80">
                <span>📍 {issue.location}</span>
                <span className="ml-auto">{issue.dateReported}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Inquiry memory list */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold text-natural-forest/80 uppercase tracking-wider">
          🔍 Past Inquiries
        </h4>
        <div className="flex flex-wrap gap-1">
          {pastTopics.map((topic, index) => (
            <button
              key={index}
              onClick={() => {
                handleSend(topic);
                setShowMobileMemory(false);
              }}
              className="text-[9px] font-bold bg-natural-bone hover:bg-natural-cream text-natural-forest border border-natural-border rounded-lg px-2 py-1 transition-colors cursor-pointer"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-220px)] min-h-[450px] bg-white rounded-[32px] border border-natural-border shadow-xs overflow-hidden" id="civic-companion-component">
      {/* Sidebar: Citizen Profile & Memory Vault (Desktop Only) */}
      <div className="w-80 border-r border-natural-border bg-natural-bone/35 p-5 hidden md:flex flex-col space-y-4 flex-shrink-0 overflow-y-auto">
        <h2 className="text-xs font-serif font-bold text-natural-charcoal uppercase tracking-wider mb-1">Citizen Memory Vault</h2>
        {renderMemoryContent()}
      </div>

      {/* Chat container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header Panel */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-natural-border bg-natural-bone">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-natural-cream text-natural-forest rounded-xl">
              <Sparkles className="w-5 h-5 text-natural-forest animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-natural-charcoal">Janālok AI Assistant</h2>
              <p className="text-xs text-natural-forest font-medium">Janālok Intelligent Citizen Assistant</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Mobile Memory Vault Toggle */}
            <button
              type="button"
              onClick={() => setShowMobileMemory(true)}
              className="md:hidden flex items-center space-x-1.5 px-3 py-1.5 bg-natural-cream text-natural-forest border border-natural-sage/20 rounded-xl text-xs font-bold hover:bg-natural-sage/10 cursor-pointer"
            >
              <span>👤 Memory Vault</span>
            </button>

            {/* Language Selector */}
            <div className="flex items-center space-x-2 bg-white px-3 py-1.5 border border-natural-border rounded-xl shadow-2xs">
              <Languages className="w-4 h-4 text-natural-forest" />
              <label htmlFor="chat-lang-select" className="text-xs font-bold text-natural-forest/90">Language:</label>
              <select
                id="chat-lang-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="text-xs font-bold text-natural-forest bg-transparent border-none outline-none focus:ring-2 focus:ring-natural-forest/40 rounded-md cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Messages Window */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4" role="log" aria-live="polite">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex max-w-[85%] md:max-w-[75%] space-x-2.5 ${
                    isUser ? "flex-row-reverse space-x-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar icon */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isUser ? "bg-[#D4A373] text-white" : "bg-[#A9B388] text-white"
                    }`}
                  >
                    {isUser ? initials : "✨"}
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`px-4 py-3 rounded-2xl text-natural-charcoal text-sm md:text-base border ${
                        isUser
                          ? "bg-natural-forest border-natural-forest text-white rounded-tr-none"
                          : "bg-natural-bone border-natural-border rounded-tl-none"
                      }`}
                    >
                      <div className={isUser ? "text-natural-cream font-medium" : "text-natural-charcoal"}>
                        {formatMessageContent(msg.content)}
                      </div>

                      {/* Grounding and Maps Citations Rendering */}
                      {!isUser && msg.sources && (
                        <div className="mt-3 pt-3 border-t border-natural-border/40 text-left">
                          <div className="flex items-center space-x-1 mb-1.5 text-[10px] font-bold text-natural-forest uppercase tracking-wider">
                            <Sparkles className="w-3 h-3 text-natural-clay animate-pulse" />
                            <span>Verified Grounding Citations</span>
                          </div>
                          <div className="space-y-1.5">
                            {msg.sources.groundingChunks?.map((chunk: any, chunkIdx: number) => {
                              if (chunk.web) {
                                return (
                                  <a
                                    key={chunkIdx}
                                    href={chunk.web.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-[10px] text-natural-clay hover:underline font-bold"
                                  >
                                    🌐 {chunk.web.title || "External Source"}
                                  </a>
                                );
                              }
                              if (chunk.maps) {
                                return (
                                  <div key={chunkIdx} className="text-[10px] text-natural-forest bg-white/50 border border-natural-border/30 p-2 rounded-lg space-y-1">
                                    <span className="font-bold flex items-center text-natural-charcoal">📍 {chunk.maps.title || "Government Office"}</span>
                                    {chunk.maps.address && <p className="text-[9px] text-natural-forest/80 font-medium">{chunk.maps.address}</p>}
                                    {chunk.maps.uri && (
                                      <a
                                        href={chunk.maps.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block text-[9px] text-natural-clay hover:underline font-bold mt-1"
                                      >
                                        Pin on Google Maps →
                                      </a>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div
                      className={`text-[10px] text-natural-forest/80 px-1 font-semibold ${
                        isUser ? "text-right" : "text-left"
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="flex space-x-2.5 items-center">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#A9B388] text-white flex items-center justify-center">
                  ✨
                </div>
                <div className="bg-natural-bone border border-natural-border px-4 py-3 rounded-2xl rounded-tl-none">
                  <div className="flex space-x-1 items-center h-5">
                    <div className="w-1.5 h-1.5 bg-natural-forest rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-1.5 h-1.5 bg-natural-forest rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-1.5 h-1.5 bg-natural-forest rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start space-x-3 text-rose-700">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Janālok AI Assistant Error</p>
                <p className="text-xs opacity-90">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Recommended quick templates panel */}
        <div className="px-6 py-4 border-t border-natural-border bg-natural-bone/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-natural-forest flex items-center">
              <HelpCircle className="w-3.5 h-3.5 mr-1.5 text-natural-forest" />
              Quick Inquiries:
            </p>
            <button
              type="button"
              onClick={() => setQuickInquiriesCollapsed(!quickInquiriesCollapsed)}
              className="text-[10px] font-bold text-natural-clay hover:text-natural-forest flex items-center space-x-1 cursor-pointer"
            >
              <span>{quickInquiriesCollapsed ? "Expand" : "Collapse"}</span>
              {quickInquiriesCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {!quickInquiriesCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(preset.prompt)}
                  className="flex items-start text-left p-3 bg-white border border-natural-border rounded-2xl hover:border-natural-clay hover:shadow-2xs transition-all duration-250 cursor-pointer"
                >
                  <preset.icon className="w-4 h-4 text-natural-forest mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-natural-charcoal">{preset.title}</h4>
                    <p className="text-[10px] text-natural-forest line-clamp-1">{preset.prompt}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Input panel */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="p-4 border-t border-natural-border bg-white"
        >
          <div className="relative flex items-center bg-natural-bone border border-natural-border focus-within:border-natural-forest focus-within:ring-2 focus-within:ring-natural-sage/20 rounded-2xl transition-all duration-200">
            <input
              type="text"
              id="civic-companion-text-input"
              aria-label="Message to Janālok AI Assistant"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder={`Ask about city procedures, files, or guidelines in ${selectedLanguage}...`}
              className="flex-1 px-4 py-3 bg-transparent border-none outline-none text-natural-charcoal text-sm placeholder-natural-forest/60 font-medium focus:ring-2 focus:ring-natural-forest/40 rounded-xl"
            />
            <div className="flex items-center space-x-1.5 pr-2.5">
              {input.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    onRecommendService(input);
                  }}
                  title="Match with civic services directly"
                  aria-label="Match with civic services directly"
                  className="p-2 text-natural-clay hover:bg-natural-cream/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-natural-forest transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className={`px-5 py-2 rounded-full transition-all duration-200 text-xs font-bold cursor-pointer ${
                  input.trim() && !loading
                    ? "bg-natural-forest text-white hover:bg-[#4A5741] shadow-xs"
                    : "text-natural-forest/50 bg-natural-border/40"
                }`}
              >
                Send
              </button>
            </div>
          </div>
          <p className="text-[10px] text-natural-forest/80 font-medium text-center mt-2">
            Janālok uses Generative AI to simplify policy knowledge. Always double-check critical deadlines with city halls.
          </p>
        </form>
      </div>

      {/* Mobile Memory Vault Dialog/Modal */}
      {showMobileMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-[24px] border border-natural-border shadow-lg w-full max-w-sm p-6 flex flex-col space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-serif font-bold text-natural-charcoal uppercase tracking-wider">Citizen Memory Vault</h3>
              <button
                type="button"
                onClick={() => setShowMobileMemory(false)}
                className="text-xs font-bold text-natural-clay bg-natural-bone px-3 py-1.5 rounded-xl border border-natural-border cursor-pointer hover:bg-natural-cream"
              >
                Close
              </button>
            </div>
            {renderMemoryContent()}
          </div>
        </div>
      )}
    </div>
  );
}
