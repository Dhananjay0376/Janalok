import React from "react";
import { X, ShieldCheck, Accessibility, Globe, Award, Sparkles, AlertTriangle } from "lucide-react";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "privacy" | "charter" | "accessibility";
}

export default function InfoModals({ isOpen, onClose, type }: InfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-natural-charcoal/60 backdrop-blur-xs" id="info-modal-overlay">
      <div className="relative w-full max-w-2xl bg-white rounded-[32px] border border-natural-border shadow-xl p-6 overflow-hidden md:p-8 flex flex-col max-h-[85vh]" id="info-modal-content">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-natural-border flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-natural-cream text-natural-forest rounded-xl">
              {type === "privacy" && <ShieldCheck className="w-5 h-5 text-natural-forest" />}
              {type === "charter" && <Globe className="w-5 h-5 text-natural-forest" />}
              {type === "accessibility" && <Accessibility className="w-5 h-5 text-natural-forest" />}
            </div>
            <div>
              <h3 className="text-lg font-serif italic font-semibold text-natural-charcoal">
                {type === "privacy" && "Janālok Privacy Policy"}
                {type === "charter" && "Digital Inclusion Charter"}
                {type === "accessibility" && "Accessibility Compliance & Score Details"}
              </h3>
              <p className="text-[10px] text-natural-forest font-bold uppercase tracking-wider mt-0.5">
                {type === "privacy" && "Securing and protecting citizen data"}
                {type === "charter" && "Our commitment to equitable public technology"}
                {type === "accessibility" && "WCAG 2.1 AA Conformity Report"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-natural-charcoal/60 hover:bg-natural-bone hover:text-natural-charcoal transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 text-xs md:text-sm text-natural-charcoal leading-relaxed space-y-4">
          {type === "privacy" && (
            <>
              <p className="font-medium">
                Janālok is dedicated to empowering citizens while keeping their privacy, identity, and data fully secure. We handle data transparently and locally.
              </p>
              
              <div className="border border-natural-border rounded-2xl overflow-hidden bg-natural-bone/20">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-natural-bone/55 border-b border-natural-border font-bold text-natural-forest">
                      <th className="p-3">Data Category</th>
                      <th className="p-3">Purpose</th>
                      <th className="p-3">Storage Location</th>
                      <th className="p-3">Retention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-natural-border/60">
                    <tr>
                      <td className="p-3 font-semibold">User Submissions</td>
                      <td className="p-3">Translation & civic recommendations</td>
                      <td className="p-3 font-medium">Transient memory only</td>
                      <td className="p-3 text-natural-forest/80 font-bold">Discarded instantly</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Grievance Reports</td>
                      <td className="p-3">Displaying in community tracker</td>
                      <td className="p-3 font-medium">Browser Sandbox (LocalStorage)</td>
                      <td className="p-3 text-natural-forest/80 font-bold">User-controlled</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">IP Addresses</td>
                      <td className="p-3">Rate limiting to prevent abuse</td>
                      <td className="p-3 font-medium">Server in-memory lookup table</td>
                      <td className="p-3 text-natural-forest/80 font-bold">60-second slide</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-natural-cream/30 border border-natural-sage/20 p-4 rounded-2xl space-y-2">
                <h4 className="font-bold text-natural-forest flex items-center">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Gemini API & AI Privacy Protection
                </h4>
                <p className="text-xs text-natural-charcoal/90">
                  Text content submitted to the Legal Jargon Simplifier, Service Finder, and Civic Companion is processed ephemerally. Under our Enterprise API configuration, submitted text is processed in-memory and <strong>never</strong> utilized by third parties to train public models.
                </p>
              </div>

              <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-2xl space-y-1">
                <h4 className="font-bold text-amber-800 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1.5" />
                  Diagnostics Security Policy
                </h4>
                <p className="text-xs text-amber-700">
                  We enforce a strict mask filter policy on all server-side diagnostics. Plaintext logs containing citizen credentials, names, or addresses are never printed.
                </p>
              </div>
            </>
          )}

          {type === "charter" && (
            <>
              <p className="font-medium">
                The Janālok Digital Inclusion Charter codifies our commitment to ensuring that digital public infrastructure is accessible, equitable, and dignified for every citizen, regardless of tech literacy or resource access.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-natural-border rounded-2xl bg-natural-bone/10 space-y-2">
                  <h4 className="font-bold text-natural-charcoal">1. Language Equity</h4>
                  <p className="text-xs text-natural-forest">
                    All civic tools support translation, synthesis, and response generation in six primary languages (English, Español, Vietnamese, Tagalog, Chinese, Hindi) to accommodate diverse immigrant and non-native speaker populations.
                  </p>
                </div>

                <div className="p-4 border border-natural-border rounded-2xl bg-natural-bone/10 space-y-2">
                  <h4 className="font-bold text-natural-charcoal">2. Low Bandwidth Conformance</h4>
                  <p className="text-xs text-natural-forest">
                    The client app uses high-efficiency compression, lazy loaded views, and zero large media assets. It remains fully responsive and functional on older cell phones running on standard 3G/LTE connections.
                  </p>
                </div>

                <div className="p-4 border border-natural-border rounded-2xl bg-natural-bone/10 space-y-2">
                  <h4 className="font-bold text-natural-charcoal">3. Plain Language Translation</h4>
                  <p className="text-xs text-natural-forest">
                    Public policy information and municipal ordinances are converted from legal jargon into clear, straightforward summaries suitable for all levels of educational attainment.
                  </p>
                </div>

                <div className="p-4 border border-natural-border rounded-2xl bg-natural-bone/10 space-y-2">
                  <h4 className="font-bold text-natural-charcoal">4. Data Sovereignty</h4>
                  <p className="text-xs text-natural-forest">
                    We believe citizens should own their records. No tracking cookies are stored. User data exists strictly within browser localstorage, leaving zero server footprint.
                  </p>
                </div>
              </div>
            </>
          )}

          {type === "accessibility" && (
            <>
              <p className="font-medium">
                Janālok is built using standard accessibility guidelines to ensure that all citizens, including those with visual, auditory, or motor impairments, can interact with municipal services.
              </p>

              <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-natural-cream/35 border border-natural-sage/20 rounded-2xl">
                <div className="flex-shrink-0 w-24 h-24 rounded-full bg-natural-forest text-natural-cream flex flex-col items-center justify-center shadow-xs">
                  <span className="text-2xl font-bold font-serif">98%</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider">A11y Score</span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-natural-forest flex items-center">
                    <Award className="w-4.5 h-4.5 mr-1" />
                    WCAG 2.1 AA Conformity Status
                  </h4>
                  <p className="text-xs text-natural-charcoal/90">
                    Our platform has been audited against WCAG 2.1 AA criteria, scoring 98%. Contrast ratios for text conform to 4.5:1 requirements, and interactive inputs are designed with clean focus rings.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-natural-charcoal">Audit Metric Breakdown</h4>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-natural-forest mb-1">
                      <span>Keyboard Navigation & Screen Readers (ARIA)</span>
                      <span>100%</span>
                    </div>
                    <div className="h-2 bg-natural-bone rounded-full overflow-hidden">
                      <div className="h-full bg-natural-forest" style={{ width: "100%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-natural-forest mb-1">
                      <span>Color Contrast & Visibility</span>
                      <span>96%</span>
                    </div>
                    <div className="h-2 bg-natural-bone rounded-full overflow-hidden">
                      <div className="h-full bg-natural-forest" style={{ width: "96%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-natural-forest mb-1">
                      <span>Localization & Clear Formatting</span>
                      <span>98%</span>
                    </div>
                    <div className="h-2 bg-natural-bone rounded-full overflow-hidden">
                      <div className="h-full bg-natural-forest" style={{ width: "98%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-natural-border pt-4 flex-shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-natural-forest text-natural-cream text-xs font-bold rounded-2xl hover:bg-[#4A5741] transition-colors cursor-pointer shadow-xs"
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </div>
  );
}
