import React, { useState, lazy, Suspense } from "react";
import { Sparkles, FileText, Building2, AlertTriangle, BarChart3, User, Info, Shield } from "lucide-react";
import CivicCompanion from "./components/CivicCompanion";
import { auth, onAuthStateChanged } from "./firebase";
import AuthModal from "./components/AuthModal";
import { AppUser } from "./types";

const SimplifyDocument = lazy(() => import("./components/SimplifyDocument"));
const ServiceFinder = lazy(() => import("./components/ServiceFinder"));
const IssueReport = lazy(() => import("./components/IssueReport"));
const DashboardMetrics = lazy(() => import("./components/DashboardMetrics"));

import { motion } from "motion/react";

type TabId = "companion" | "simplifier" | "services" | "tracker" | "performance";

/**
 * Loading skeleton fallback for lazy-loaded secondary views
 */
function TabLoadingFallback() {
  return (
    <div className="bg-white p-8 border border-natural-border rounded-[32px] shadow-xs space-y-6 animate-pulse" id="lazy-tab-skeleton">
      <div className="h-8 bg-natural-bone rounded-full w-1/3" />
      <div className="space-y-3">
        <div className="h-4 bg-natural-bone rounded-full w-full" />
        <div className="h-4 bg-natural-bone rounded-full w-5/6" />
        <div className="h-4 bg-natural-bone rounded-full w-4/5" />
      </div>
      <div className="h-40 bg-natural-bone rounded-[24px] w-full" />
    </div>
  );
}

/**
 * Main App component that serves as the layout frame and router for Janālok.
 * Manages active viewport tab states, selected translation language, 
 * and handles bridging/routing search queries from the chat companion 
 * to the service directory finder.
 */
export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("companion");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [serviceQuery, setServiceQuery] = useState<string>("");
  const [user, setUser] = useState<AppUser | null>(() => {
    const explicitlyLoggedOut = localStorage.getItem("explicitly_logged_out") === "true";
    if (explicitlyLoggedOut) {
      return null;
    }
    return {
      displayName: "Dhananjay Narula",
      email: "dhananjay0376@gmail.com",
      isMock: true,
      uid: "mock-dhananjay-narula-123"
    };
  });
  const [authOpen, setAuthOpen] = useState(false);

  // Subscribe to Firebase Authentication state updates
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        localStorage.removeItem("explicitly_logged_out");
        setUser(currentUser);
      } else {
        const explicitlyLoggedOut = localStorage.getItem("explicitly_logged_out") === "true";
        if (explicitlyLoggedOut) {
          setUser(null);
        } else {
          setUser({
            displayName: "Dhananjay Narula",
            email: "dhananjay0376@gmail.com",
            isMock: true,
            uid: "mock-dhananjay-narula-123"
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle manual sign out for both mock and real users
  const handleSignOut = async () => {
    localStorage.setItem("explicitly_logged_out", "true");
    if (user?.isMock) {
      setUser(null);
    } else {
      await auth.signOut();
      setUser(null);
    }
  };

  const handleSignInMock = () => {
    localStorage.removeItem("explicitly_logged_out");
    setUser({
      displayName: "Dhananjay Narula",
      email: "dhananjay0376@gmail.com",
      isMock: true,
      uid: "mock-dhananjay-narula-123"
    });
  };

  // Synchronize HTML lang attribute based on selected citizen language
  React.useEffect(() => {
    const langMap: Record<string, string> = {
      English: "en",
      Español: "es",
      "Tiếng Việt": "vi",
      Tagalog: "tl",
      "中文": "zh"
    };
    const code = langMap[selectedLanguage] || "en";
    document.documentElement.lang = code;
  }, [selectedLanguage]);

  // Handler to bridge Chat recommendations to the Service directory
  const handleRecommendServiceBridge = (query: string) => {
    setServiceQuery(query);
    setActiveTab("services");
  };

  const tabsList = [
    { id: "companion", label: "Janālok AI Assistant", icon: Sparkles, color: "text-natural-forest bg-natural-cream/60" },
    { id: "simplifier", label: "Legal Simplifier", icon: FileText, color: "text-natural-clay bg-natural-bone" },
    { id: "services", label: "Services Matcher", icon: Building2, color: "text-natural-forest bg-natural-cream/60" },
    { id: "tracker", label: "Incident Tracker", icon: AlertTriangle, color: "text-natural-clay bg-[#FEFAE0]/70" },
    { id: "performance", label: "Performance & Transparency", icon: BarChart3, color: "text-natural-forest bg-natural-bone" },
  ] as const;

  return (
    <div className="min-h-screen bg-natural-bone font-sans text-natural-charcoal selection:bg-natural-forest selection:text-natural-cream" id="main-app-container">
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-natural-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full shadow-xs rounded-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 5 C75 5 90 20 90 45 C90 75 50 95 50 95 C50 95 10 75 10 45 C10 20 25 5 50 5Z" fill="#5F6F52" />
                <circle cx="50" cy="42" r="14" fill="#FEFAE0" />
                <path d="M28 72C33 61 43 56 50 56C57 56 67 61 72 72" stroke="#FEFAE0" strokeWidth="6" strokeLinecap="round" />
                <path d="M50 18C44 24 44 32 50 32C56 32 56 24 50 18Z" fill="#A9B388" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-serif italic text-natural-charcoal font-medium tracking-tight">Janālok</h1>
                <span className="text-[9px] font-bold bg-natural-forest text-natural-cream px-2 py-0.5 rounded-full uppercase tracking-widest">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-natural-forest font-medium">Citizen Empowerment & Transparency Portal</p>
            </div>
          </div>

          {/* User Profile / Status Badge */}
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-natural-charcoal">{user.displayName || user.email?.split("@")[0]}</span>
                  <button
                    onClick={handleSignOut}
                    className="text-[9px] text-natural-clay hover:underline font-bold text-right cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
                <div className="w-9 h-9 bg-natural-forest rounded-xl border border-white shadow-xs flex items-center justify-center font-bold text-white text-xs">
                  {(user.displayName || user.email || "C").substring(0, 2).toUpperCase()}
                </div>
              </>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="px-4 py-2 bg-natural-forest hover:bg-[#4A5741] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Page Body layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Navigation Sidebar & Bento Tabs */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left panel tabs navigation */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white p-5 rounded-[32px] border border-natural-border shadow-xs space-y-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-natural-forest px-2">
                Services Hub
              </p>

              <nav className="space-y-1.5">
                {tabsList.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        if (tab.id !== "services") setServiceQuery(""); // reset bridge query
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-2xl text-left text-xs md:text-sm font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest focus-visible:ring-offset-2 ${
                        isActive
                          ? "bg-natural-forest text-natural-cream shadow-xs"
                          : "text-natural-charcoal/80 hover:bg-natural-bone hover:text-natural-charcoal"
                      }`}
                    >
                      <div className={`p-1.5 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isActive ? "bg-[#4A5741] text-natural-cream" : tab.color
                      }`}>
                        <tab.icon className="w-4 h-4" />
                      </div>
                      <span className="flex-1 line-clamp-1">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="h-px bg-natural-border my-4" />

              {/* Informational Widget */}
              <div className="bg-natural-cream/35 p-5 rounded-2xl border border-natural-border space-y-2">
                <div className="flex items-center space-x-2 text-natural-forest">
                  <Info className="w-4 h-4 text-natural-forest flex-shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Help & Accessibility</span>
                </div>
                <p className="text-[11px] text-natural-charcoal/85 leading-relaxed font-medium">
                  Janālok bridges the gap between citizens and municipal policies. All operations, file requirements, and timelines are cross-verified automatically.
                </p>
              </div>

              <div className="h-px bg-natural-border my-4" />

              {/* Platform Creator & Owner Section */}
              <div className="bg-gradient-to-br from-white to-natural-bone/45 p-5 rounded-2xl border border-natural-border space-y-3 shadow-3xs">
                <div className="flex items-center space-x-2 text-natural-forest">
                  <User className="w-4 h-4 text-natural-clay flex-shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-natural-forest">Platform Architect</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-natural-forest text-natural-cream flex items-center justify-center font-bold text-sm shadow-2xs font-serif italic">
                    DN
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-natural-charcoal">Dhananjay Narula</h4>
                    <p className="text-[9px] text-natural-forest font-bold">Chief Civic Engineer & Founder</p>
                  </div>
                </div>
                <p className="text-[10px] text-natural-charcoal/80 leading-relaxed font-medium">
                  Established by Dhananjay Narula to facilitate absolute transparency, community-sourced local accountability, and streamlined civic administration.
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel Viewports */}
          <div className="flex-1">
            <div className="h-full">
              <Suspense fallback={<TabLoadingFallback />}>
                {activeTab === "companion" && (
                  <CivicCompanion
                    user={user}
                    onRecommendService={handleRecommendServiceBridge}
                    selectedLanguage={selectedLanguage}
                    setSelectedLanguage={setSelectedLanguage}
                  />
                )}

                {activeTab === "simplifier" && (
                  <SimplifyDocument selectedLanguage={selectedLanguage} />
                )}

                {activeTab === "services" && (
                  <ServiceFinder
                    selectedLanguage={selectedLanguage}
                    initialQuery={serviceQuery}
                    onClearInitialQuery={() => setServiceQuery("")}
                  />
                )}

                {activeTab === "tracker" && (
                  <IssueReport user={user} />
                )}

                {activeTab === "performance" && (
                  <DashboardMetrics />
                )}
              </Suspense>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-natural-border bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-natural-forest/80 font-medium">
          <p>© 2026 Janālok platform. Transparency ID: 88-294021 • Built with Public Safety Protocols</p>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-natural-charcoal">Privacy Policy</a>
            <a href="#" className="hover:text-natural-charcoal">Digital Inclusion Charter</a>
            <a href="#" className="hover:text-natural-charcoal">Accessibility Score: 98%</a>
          </div>
        </div>
      </footer>

      {/* User Auth Modal overlay */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSignInMock={handleSignInMock}
      />
    </div>
  );
}
