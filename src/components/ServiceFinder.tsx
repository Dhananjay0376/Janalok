import React, { useState } from "react";
import { Search, Sparkles, Building, ArrowRight, ShieldAlert, CheckCircle2, Clock, CheckSquare, Square, Info } from "lucide-react";
import { CivicService } from "../types";
import { motion } from "motion/react";

interface ServiceFinderProps {
  selectedLanguage: string;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
}

const STATIC_DIRECTORY: CivicService[] = [
  {
    name: "Residential Trash & Recycling Cart Request",
    description: "Request standard recycling and composting carts or replace damaged trash bins at your home.",
    department: "Department of Public Works",
    urgency: "Medium",
    requirements: ["Proof of residency (utility bill or lease agreement)", "Valid Government-issued ID", "Property tax assessment ID (if owner)"],
    processingTime: "3-5 business days",
    steps: ["Verify residential address status", "Choose standard bin size capacity (32, 64, or 96 gallons)", "Submit verification and electronic form", "Receive delivery notification and secure tracking ID"],
  },
  {
    name: "Municipal Voter Registration Renewal",
    description: "Update your residential voting address, change party affiliation, or register as a new voter.",
    department: "Office of the City Clerk - Elections Division",
    urgency: "High",
    requirements: ["Social Security Number (last 4 digits)", "Valid Driver's License or State Identity card", "Two documents verifying residency (bank statement + lease)"],
    processingTime: "Immediate (Online) / 7-10 days (by mail)",
    steps: ["Confirm current voter qualification requirements", "Input standard personal information and legal identifier numbers", "Confirm electronic declaration of residency status", "Download certificate of registration confirmation"],
  },
  {
    name: "Residential Dog Licensing & Vaccination Record",
    description: "Renew or register standard dog license tags. All dogs over 4 months must be registered under municipal laws.",
    department: "Animal Care & Control Services",
    urgency: "Low",
    requirements: ["Rabies vaccination certificate from certified veterinarian", "Spay or neuter certificate (for discounted registration fee)", "Photo of the dog"],
    processingTime: "Immediate online, tags mailed in 5 days",
    steps: ["Verify dog's vaccination schedule is completely current", "Upload digital copy of veterinary rabies certificate", "Provide animal physical traits (breed, color, weight)", "Process registration transaction and await tag shipment"],
  },
  {
    name: "Storefront Business License & Tax Certificate",
    description: "Request a local business operations permit or tax registration certificate for brick-and-mortar stores.",
    department: "Department of Revenue & Economic Development",
    urgency: "High",
    requirements: ["State Tax Identification Number", "Zoning Compliance Permit", "Articles of Incorporation (if applicable)", "Floor plan with fire safety dimensions"],
    processingTime: "10-14 business days",
    steps: ["Verify proposed storefront is in compliance with zoning layout", "Submit detailed descriptions of business operations", "Provide fire safety and emergency evacuation layout diagrams", "Execute administrative fees and authorize background checks"],
  },
  {
    name: "Affordable Housing Program & Renter Subsidy",
    description: "Apply for municipal tenant vouchers, search housing registries, or apply for low-income assistance.",
    department: "Housing Authority & Social Services Division",
    urgency: "High",
    requirements: ["Latest federal tax filings & W-2 forms", "3 months of detailed bank statements for all family members", "Birth certificates of all dependents"],
    processingTime: "30-45 days (application review window)",
    steps: ["Determine family size category eligibility limits", "Upload comprehensive household income verifications", "Provide detail on current rental expenditures and landlord references", "Confirm queue placement and contact info"],
  },
];

/**
 * ServiceFinder component helps citizens locate local government programs, 
 * departments, requirements, permits, and schedules. It supports both a static 
 * local directory and dynamic AI-powered smart recommendations.
 *
 * @param props.selectedLanguage current chosen translation language
 * @param props.initialQuery optional initial query string to search for immediately
 * @param props.onClearInitialQuery optional callback to reset the initial query on the parent state
 */
export default function ServiceFinder({ selectedLanguage, initialQuery = "", onClearInitialQuery }: ServiceFinderProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<CivicService[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"directory" | "recommend">("directory");
  const [searchTerm, setSearchTerm] = useState("");
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});

  // Direct trigger if query was passed from the chatbot
  React.useEffect(() => {
    if (initialQuery) {
      setActiveTab("recommend");
      setQuery(initialQuery);
      handleRecommend(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery]);

  const handleRecommend = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setRecommendations(null);
    setCheckedDocs({});

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          language: selectedLanguage,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to query recommended services.");
      }

      const data = await res.json();
      setRecommendations(data.recommendedServices || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred matching services.");
    } finally {
      setLoading(false);
    }
  };

  const toggleDoc = (docName: string) => {
    setCheckedDocs(prev => ({ ...prev, [docName]: !prev[docName] }));
  };

  const filteredDirectory = STATIC_DIRECTORY.filter((service) =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" id="service-finder-component">
      {/* Switch Navigation tabs */}
      <div className="flex border-b border-natural-border">
        <button
          onClick={() => setActiveTab("directory")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "directory"
              ? "border-natural-forest text-natural-forest"
              : "border-transparent text-natural-forest/60 hover:text-natural-charcoal"
          }`}
        >
          All Service Directories
        </button>
        <button
          onClick={() => setActiveTab("recommend")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === "recommend"
              ? "border-natural-forest text-natural-forest"
              : "border-transparent text-natural-forest/60 hover:text-natural-charcoal"
          }`}
        >
          <Sparkles className="w-4 h-4 text-natural-forest animate-pulse" />
          <span>AI Service Matcher</span>
        </button>
      </div>

      {activeTab === "directory" ? (
        <div className="space-y-6">
          {/* Header & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-natural-charcoal">Municipal Services Directory</h2>
              <p className="text-xs text-natural-forest font-medium">Explore standard licensing, utility bins, tax filing, and administrative guides.</p>
            </div>
            
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-natural-forest/60 absolute left-3 top-3.5" />
              <label htmlFor="service-search-input" className="sr-only">Search standard services</label>
              <input
                type="text"
                id="service-search-input"
                placeholder="Search standard services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-natural-border focus:outline-none focus:border-natural-forest focus:ring-1 focus:ring-natural-forest rounded-2xl placeholder-natural-forest/50 font-medium text-natural-charcoal"
              />
            </div>
          </div>

          {/* Directory Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDirectory.map((service, idx) => (
              <div key={idx} className="bg-white p-5 border border-natural-border rounded-[32px] shadow-xs hover:border-natural-clay hover:shadow-2xs transition-all duration-250 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3.5">
                    <span className="text-[10px] font-bold text-natural-forest bg-natural-bone border border-natural-border px-2.5 py-1 rounded-full flex items-center">
                      <Building className="w-3 h-3 mr-1 text-natural-forest" />
                      {service.department}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      service.urgency === "High" ? "bg-rose-50 text-rose-700 border-rose-100" :
                      service.urgency === "Medium" ? "bg-natural-cream text-natural-forest border-natural-border" :
                      "bg-natural-bone text-natural-charcoal/80 border-natural-border"
                    }`}>
                      {service.urgency} Urgency
                    </span>
                  </div>
                  
                  <h3 className="text-base font-serif font-bold text-natural-charcoal mb-1.5">{service.name}</h3>
                  <p className="text-xs text-natural-forest font-medium mb-4 leading-relaxed">{service.description}</p>

                  {/* Requirements List */}
                  <div className="space-y-2 mb-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-natural-forest">Required Verifications:</h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      {service.requirements.map((req, ridx) => (
                        <div key={ridx} className="flex items-center text-xs text-natural-charcoal font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-natural-forest mr-2 flex-shrink-0" />
                          <span>{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-natural-border pt-3.5 mt-4 text-xs text-natural-forest">
                  <div className="flex items-center font-medium">
                    <Clock className="w-3.5 h-3.5 mr-1 text-natural-forest/70" />
                    <span>Processing: {service.processingTime}</span>
                  </div>
                  <button
                    onClick={() => {
                      setQuery(`I need details on how to apply for "${service.name}"`);
                      setActiveTab("recommend");
                      handleRecommend(`I need details on how to apply for "${service.name}"`);
                    }}
                    className="text-xs font-bold text-natural-forest hover:text-natural-charcoal flex items-center cursor-pointer"
                  >
                    <span>Get Detailed Guide</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </div>
            ))}

            {filteredDirectory.length === 0 && (
              <div className="col-span-full py-12 text-center bg-natural-bone border-2 border-dashed border-natural-border rounded-[32px] flex flex-col items-center justify-center space-y-2">
                <Info className="w-8 h-8 text-natural-forest/40" />
                <h4 className="text-xs font-bold text-natural-charcoal">No Services Found</h4>
                <p className="text-[10px] text-natural-forest font-semibold">Try tweaking your keywords or type your need in the AI Service Matcher.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* AI recommendation panel */
        <div className="space-y-6">
          <div className="bg-natural-cream/35 border border-natural-border p-5 rounded-[32px] space-y-4">
            <div>
              <label htmlFor="ai-service-query-input" className="text-sm font-serif font-bold text-natural-charcoal flex items-center cursor-pointer mb-2 block">
                <Sparkles className="w-4 h-4 text-natural-forest mr-2 animate-pulse" aria-hidden="true" />
                AI-Powered Service Recommendations
              </label>
              <p className="text-xs text-natural-forest font-medium mt-1">
                Tell us your specific situation or family need. Our intelligent compiler will match you with official departments, estimate wait times, and create customized document checklist maps.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                id="ai-service-query-input"
                placeholder="E.g., 'I just registered a dog', 'I'm moving and need garbage bins', 'We want to renew our business licenses'..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm bg-white border border-natural-border focus:outline-none focus:border-natural-forest focus:ring-1 focus:ring-natural-forest rounded-2xl font-medium text-natural-charcoal placeholder-natural-forest/50"
              />
              <button
                onClick={() => handleRecommend(query)}
                disabled={loading || !query.trim()}
                className="px-5 py-2.5 bg-natural-forest text-white font-bold text-sm rounded-2xl hover:bg-[#4A5741] disabled:bg-natural-bone disabled:text-natural-forest/50 transition-colors cursor-pointer flex items-center justify-center space-x-2 shadow-xs"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Recommend Services</span>
                )}
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-natural-forest font-bold">
              <span className="mt-0.5 opacity-80">Quick Scenarios:</span>
              <button
                onClick={() => { setQuery("I am opening a bakery store in town"); handleRecommend("I am opening a bakery store in town"); }}
                className="px-2.5 py-0.5 bg-white border border-natural-border hover:border-natural-clay rounded-xl cursor-pointer transition-colors"
              >
                Bakeries
              </button>
              <button
                onClick={() => { setQuery("We just moved from another state and have kids"); handleRecommend("We just moved from another state and have kids"); }}
                className="px-2.5 py-0.5 bg-white border border-natural-border hover:border-natural-clay rounded-xl cursor-pointer transition-colors"
              >
                New Movers
              </button>
              <button
                onClick={() => { setQuery("Report pothole on 4th avenue"); handleRecommend("Report pothole on 4th avenue"); }}
                className="px-2.5 py-0.5 bg-white border border-natural-border hover:border-natural-clay rounded-xl cursor-pointer transition-colors"
              >
                Infrastructure Fixes
              </button>
            </div>
          </div>

          {loading && (
            <div className="bg-white border border-natural-border rounded-[32px] p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-xs min-h-[300px]">
              <div className="p-4 bg-natural-cream rounded-full text-natural-forest animate-pulse">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-natural-charcoal">AI Service Directory Query</h3>
                <p className="text-xs text-natural-forest font-semibold mt-1">Sourcing matching departments, compiling compliance checklists, and analyzing waiting metrics...</p>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="bg-rose-50 border border-rose-100 text-rose-800 p-5 rounded-[32px] space-y-2 flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
              <div>
                <h4 className="font-bold text-sm">Failed to Match Services</h4>
                <p className="text-xs text-rose-600 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {!recommendations && !loading && !error && (
            <div className="bg-natural-bone/50 border-2 border-dashed border-natural-border rounded-[32px] p-12 text-center flex flex-col items-center justify-center space-y-3 min-h-[300px]">
              <Sparkles className="w-10 h-10 text-natural-forest/40" />
              <div className="max-w-xs">
                <h4 className="text-xs font-bold text-natural-charcoal">No Custom Matches Generated</h4>
                <p className="text-xs text-natural-forest mt-1.5 font-medium leading-relaxed">Submit your situation above to let Gemini map the civic services and files you need.</p>
              </div>
            </div>
          )}

          {recommendations && recommendations.length === 0 && (
            <div className="bg-natural-bone border border-natural-border rounded-[32px] p-12 text-center flex flex-col items-center justify-center space-y-2">
              <Info className="w-8 h-8 text-natural-forest/40" />
              <h4 className="text-xs font-bold text-natural-charcoal">No Services Recommended</h4>
              <p className="text-xs text-natural-forest font-semibold">Gemini could not find a strong municipal services match for your query. Try broadening your request.</p>
            </div>
          )}

          {recommendations && recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-natural-forest">
                <span>Recommendations Generated ({recommendations.length})</span>
              </div>

              {recommendations.map((service, idx) => (
                <div key={idx} className="bg-white border border-natural-border rounded-[32px] p-6 shadow-xs space-y-6">
                  {/* Title & Stats */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-natural-border pb-4">
                    <div>
                      <span className="text-[10px] font-bold text-natural-forest bg-[#FEFAE0] border border-natural-border px-3 py-1 rounded-full">
                        {service.department}
                      </span>
                      <h3 className="text-base font-serif font-bold text-natural-charcoal mt-2.5">{service.name}</h3>
                      <p className="text-xs text-natural-forest font-medium mt-1">{service.description}</p>
                    </div>

                    <div className="flex items-center space-x-3 text-xs">
                      <div className="bg-natural-bone border border-natural-border px-3 py-1.5 rounded-xl flex items-center space-x-1 text-natural-forest font-semibold">
                        <Clock className="w-3.5 h-3.5 text-natural-forest/70" />
                        <span>{service.processingTime}</span>
                      </div>
                      <div className={`px-3 py-1.5 border rounded-xl font-bold ${
                        service.urgency.toLowerCase() === "high" ? "bg-rose-50 border-rose-100 text-rose-700" :
                        service.urgency.toLowerCase() === "medium" ? "bg-natural-cream border-natural-border text-natural-forest" :
                        "bg-natural-bone border-natural-border text-natural-charcoal/80"
                      }`}>
                        {service.urgency} Priority
                      </div>
                    </div>
                  </div>

                  {/* Requirements Document Checklist */}
                  {service.requirements && service.requirements.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-natural-forest">
                        Required Document Gathering Map
                      </h4>
                      <p className="text-[11px] text-natural-forest/80 font-semibold">
                        Check off files as you collect them to streamline your official application submission:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {service.requirements.map((req, rIdx) => {
                          const isChecked = !!checkedDocs[`${idx}-${req}`];
                          return (
                            <button
                              key={rIdx}
                              onClick={() => toggleDoc(`${idx}-${req}`)}
                              className={`flex items-start text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                                isChecked
                                  ? "bg-[#FEFAE0]/30 border-natural-border text-natural-forest/60 opacity-80"
                                  : "bg-white border-natural-border hover:border-natural-clay text-natural-charcoal shadow-2xs"
                              }`}
                            >
                              <div className="mt-0.5 mr-3 flex-shrink-0">
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-natural-forest" />
                                ) : (
                                  <Square className="w-4 h-4 text-natural-forest/40" />
                                )}
                              </div>
                              <span className={`text-xs ${isChecked ? "line-through font-medium" : "font-medium"}`}>
                                {req}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Steps list */}
                  {service.steps && service.steps.length > 0 && (
                    <div className="space-y-3 border-t border-natural-border pt-5">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-natural-forest">
                        Step-by-Step Submission Roadmap
                      </h4>
                      <div className="space-y-3.5">
                        {service.steps.map((step, sIdx) => (
                          <div key={sIdx} className="flex items-start">
                            <span className="flex-shrink-0 w-5 h-5 bg-[#FEFAE0] border border-natural-border text-natural-forest rounded-full flex items-center justify-center text-[10px] font-bold mr-3 mt-0.5 shadow-3xs">
                              {sIdx + 1}
                            </span>
                            <span className="text-xs md:text-sm text-natural-charcoal font-medium leading-relaxed">
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
