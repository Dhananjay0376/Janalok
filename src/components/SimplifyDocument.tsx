import React, { useState } from "react";
import { FileText, ChevronRight, HelpCircle, AlertCircle, Copy, Check, CheckSquare, Square, Trash, Upload, Sparkles, ShieldCheck } from "lucide-react";
import { SimplifiedDoc } from "../types";
import { motion } from "motion/react";

interface SimplifyDocumentProps {
  selectedLanguage: string;
}

const DOCUMENT_PRESETS = [
  {
    title: "Sidewalk Clearance Bylaw",
    preview: "Municipal Code Sec. 14.82(a) regarding public easements...",
    content: `Municipal Code Sec. 14.82(a): Property owners, lessees, or occupants with premises abutting any public street, sidewalk, or easement shall, within 24 hours subsequent to the cessation of any meteorological precipitation event yielding snow, ice, or sleet, clear a contiguous pedestrian pathway measuring no less than forty-eight (48) inches in width. Failure to maintain compliance with this subsection shall subject the non-compliant entity to civil infractions, including but not limited to, administrative citations of fifty dollars ($50.00) for initial occurrences, escalating to two hundred fifty dollars ($250.00) for subsequent non-conformities within a single calendar annum, plus assessment of removal fees if mitigated by municipal agency workers.`,
  },
  {
    title: "Property Tax Valuation Adjustment",
    preview: "Assessment Notice concerning structural additions...",
    content: `Notice of Proposed Ad Valorem Assessment Adjustment. Pursuant to Title 5, Chapter 32 of the State Revenue Code, notice is hereby given that the Office of the County Assessor has executed a re-evaluation of the taxable value of the subject real property as consequence of permitted improvements (Permit Ref: #2026-X821, Description: Patio Addition). The market valuation has been adjusted upward by $22,400. To object to this modified appraisal, the assesse must file an official petition with the Board of Equalization within thirty (30) calendar days from the date of postmark of this correspondence. Petitions submitted after the 30-day statutory window shall be deemed summarily invalid and dismissed without prejudice, resulting in the permanent lock of the calculated tax levy for the current fiscal period.`,
  },
  {
    title: "Commercial Signage Restrictions",
    preview: "Zoning regulations for storefront banners...",
    content: `Zoning Ordinance Chapter 8, Article III (Signage Restrictions in Historic Core): No transient or permanent promotional installations, specifically including illuminated exterior signs, vinyl storefront banners, or digital liquid crystal display (LCD) monitors facing the public right-of-way, shall be erected, modified, or maintained within the Historic Core Preservation Zone without first procuring an administrative Certificate of Appropriateness from the Historic Landmarks Commission. Signage shall not exceed an aggregate surface area of eight percent (8%) of the first-story facade of the commercial unit. Non-illuminated signs fabricated from natural timbers or cast iron are preferred. Violations are subject to daily penalties of one hundred dollars ($100.00) and immediate mechanical removal by code compliance enforcement personnel.`,
  },
];

/**
 * SimplifyDocument component allows citizens to input dense, complicated legal 
 * or municipal regulations, ordinances, and bylaws, and translates them 
 * into simplified plain English terms with action steps and glossaries.
 *
 * @param props.selectedLanguage current selected language for translation
 */
export default function SimplifyDocument({ selectedLanguage }: SimplifyDocumentProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [result, setResult] = useState<SimplifiedDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleSimplify = async (sourceText: string) => {
    if (!sourceText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCheckedSteps({});

    try {
      const res = await fetch("/api/simplify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          language: selectedLanguage,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to parse document jargon.");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during simplification.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };

  const processImageFile = async (file: File) => {
    setOcrLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const res = await fetch("/api/vision-ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64String })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "OCR request failed.");
        }

        const data = await res.json();
        if (data.rawText || data.structured?.summary) {
          let composed = "";
          if (data.structured) {
            composed += `=== AUTO-EXTRACTED WORKSPACE ===\n`;
            if (data.structured.documentType) composed += `• Type: ${data.structured.documentType}\n`;
            if (data.structured.name) composed += `• Primary Party: ${data.structured.name}\n`;
            if (data.structured.documentId) composed += `• Reference ID: ${data.structured.documentId}\n`;
            if (data.structured.location) composed += `• Location/Property: ${data.structured.location}\n`;
            composed += `================================\n\n`;
          }
          composed += data.rawText || data.structured.summary;
          setText(composed);
        } else {
          throw new Error("Could not extract legible text from image.");
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("OCR upload error:", err);
      setError(err.message || "OCR service failed. Please paste text manually.");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const textToCopy = `Summary: ${result.summary}\n\nKey Takeaways:\n${result.keyTakeaways.map(t => `- ${t}`).join("\n")}\n\nNext Steps:\n${result.nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleStep = (idx: number) => {
    setCheckedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-6" id="simplify-document-component">
      {/* Introduction Banner */}
      <div className="bg-natural-forest text-natural-cream p-6 rounded-[32px] flex flex-col md:flex-row md:items-center justify-between gap-4 border border-natural-border shadow-xs">
        <div>
          <h2 className="text-xl font-serif italic font-bold text-white">Legal & Civic Jargon Simplifier</h2>
          <p className="text-xs text-natural-cream/95 mt-1.5 max-w-xl font-medium">
            Don't let complex government documents, zoning codes, tax letters, or city bylaws confuse you. 
            Upload an image of the document or paste it below to generate a simple plain-language breakdown.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-[#4A5741] text-natural-cream px-3 py-1.5 rounded-full text-xs self-start md:self-auto font-bold border border-white/10">
          <FileText className="w-4 h-4 text-natural-sage" />
          <span>OCR Powered by Google Vision</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Input & Presets */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-[32px] border border-natural-border shadow-xs space-y-4">
            
            {/* Real OCR Document Uploader Dropzone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer relative ${
                dragActive ? "border-natural-clay bg-natural-cream/20" : "border-natural-border bg-natural-bone/20 hover:bg-natural-bone/40"
              }`}
            >
              <input
                type="file"
                id="doc-ocr-upload"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="doc-ocr-upload" className="cursor-pointer block space-y-2">
                <div className="mx-auto w-10 h-10 bg-natural-cream rounded-full flex items-center justify-center text-natural-forest">
                  {ocrLoading ? (
                    <div className="w-5 h-5 border-2 border-natural-forest/30 border-t-natural-forest rounded-full animate-spin"></div>
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-natural-charcoal">
                    {ocrLoading ? "Analyzing Document with Google Cloud..." : "Upload or Drag Notice/ID Image"}
                  </p>
                  <p className="text-[10px] text-natural-forest/70 font-medium">Auto-scans and extracts fields using Vision OCR</p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="simplify-official-text" className="text-xs font-bold uppercase tracking-widest text-natural-forest">
                Paste or Extracted Text
              </label>
              {text && (
                <button
                  onClick={() => setText("")}
                  className="text-natural-forest hover:text-natural-charcoal text-xs flex items-center space-x-1 font-bold cursor-pointer"
                >
                  <Trash className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
            
            <textarea
              id="simplify-official-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste complex notices, municipal code snippets, bylaws, tax guidelines, or official rules here..."
              rows={8}
              className="w-full p-3 bg-natural-bone border border-natural-border rounded-2xl text-natural-charcoal text-sm placeholder-natural-forest/60 focus:outline-none focus:border-natural-forest focus:ring-1 focus:ring-natural-forest resize-y"
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex items-start space-x-2 font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={() => handleSimplify(text)}
              disabled={loading || ocrLoading || !text.trim()}
              className="w-full py-3 bg-natural-forest text-white rounded-2xl text-sm font-bold shadow-xs hover:bg-[#4A5741] disabled:bg-natural-bone disabled:text-natural-forest/50 transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Simplifying Jargon...</span>
                </>
              ) : (
                <span>Simplify Document</span>
              )}
            </button>
          </div>

          {/* Preset Cards */}
          <div className="bg-white p-5 rounded-[32px] border border-natural-border shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-natural-forest flex items-center">
              <HelpCircle className="w-3.5 h-3.5 mr-1.5 text-natural-clay" />
              Try a Municipal Example
            </h3>
            <div className="space-y-2">
              {DOCUMENT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setText(preset.content);
                    handleSimplify(preset.content);
                  }}
                  className="w-full text-left p-3 border border-natural-border hover:border-natural-clay rounded-2xl hover:bg-natural-bone/45 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-natural-charcoal">{preset.title}</span>
                    <ChevronRight className="w-3 h-3 text-natural-forest" />
                  </div>
                  <p className="text-[10px] text-natural-forest mt-1 line-clamp-1">{preset.preview}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Results */}
        <div className="lg:col-span-7">
          {loading && (
            <div className="bg-white border border-natural-border rounded-[32px] p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-xs h-full min-h-[300px]">
              <div className="p-4 bg-natural-cream rounded-full text-natural-forest animate-pulse">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-natural-charcoal">Processing Legal & Government Jargon</h3>
                <p className="text-xs text-natural-forest/80 mt-1 font-semibold">Analyzing sentences, extracting actions, translating vocabulary...</p>
              </div>
              <div className="w-48 bg-natural-bone h-2 rounded-full overflow-hidden">
                <div className="bg-natural-forest h-full w-2/3 rounded-full animate-pulse"></div>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="bg-rose-50 border border-rose-100 text-rose-800 p-5 rounded-[32px] space-y-2 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
              <div>
                <h4 className="font-bold text-sm">Simplification Failed</h4>
                <p className="text-xs text-rose-600 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="bg-natural-bone/50 border-2 border-dashed border-natural-border rounded-[32px] p-12 text-center flex flex-col items-center justify-center space-y-3 h-full min-h-[300px]">
              <FileText className="w-10 h-10 text-natural-forest/40" />
              <div className="max-w-sm">
                <h4 className="text-sm font-bold text-natural-charcoal">No Simplified Document Yet</h4>
                <p className="text-xs text-natural-forest mt-1.5 font-medium leading-relaxed">
                  Paste code, letters, bylaws, or regulations on the left, or select a preset to generate a beautiful readable guide.
                </p>
              </div>
            </div>
          )}

          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-natural-border rounded-[32px] p-6 shadow-xs space-y-6"
            >
              {/* Header and Copy Button */}
              <div className="flex items-center justify-between border-b border-natural-border pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-natural-forest bg-[#FEFAE0] px-3 py-1 rounded-full border border-natural-border">
                    Jargon-Free Result
                  </span>
                  <h3 className="text-lg font-serif italic text-natural-charcoal mt-2">Plain Language Translation</h3>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-natural-bone hover:bg-natural-cream border border-natural-border text-natural-forest hover:text-natural-charcoal rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#5F6F52]" />
                      <span className="text-natural-forest font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Summary</span>
                    </>
                  )}
                </button>
              </div>

              {/* 1. Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-natural-forest/80">General Meaning</h4>
                <p className="text-natural-charcoal leading-relaxed text-sm md:text-base font-medium">
                  {result.summary}
                </p>
              </div>

              {/* 2. Key Takeaways */}
              <div className="space-y-3 bg-natural-cream/35 p-5 rounded-2xl border border-natural-border">
                <h4 className="text-xs font-bold uppercase tracking-widest text-natural-forest">Key Points & Rules</h4>
                <ul className="space-y-2.5">
                  {result.keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start text-xs md:text-sm text-natural-charcoal font-medium">
                      <span className="w-1.5 h-1.5 bg-natural-clay rounded-full mt-2 mr-2.5 flex-shrink-0" />
                      <span className="leading-relaxed">{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3. Action Checklist */}
              {result.nextSteps && result.nextSteps.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-natural-forest/85">Required Action Checklist</h4>
                  <div className="space-y-2">
                    {result.nextSteps.map((step, idx) => {
                      const isChecked = !!checkedSteps[idx];
                      return (
                        <button
                          key={idx}
                          onClick={() => toggleStep(idx)}
                          className={`w-full flex items-start text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                            isChecked
                              ? "bg-[#FEFAE0]/30 border-natural-border text-natural-charcoal/60"
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
                          <span className={`text-xs md:text-sm leading-relaxed ${isChecked ? "line-through opacity-70" : "font-medium"}`}>
                            {step}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Glossary */}
              {result.glossary && result.glossary.length > 0 && (
                <div className="space-y-3 border-t border-natural-border pt-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-natural-forest/85">Jargon Decoded</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.glossary.map((g, idx) => (
                      <div key={idx} className="p-3 bg-natural-bone border border-natural-border rounded-2xl space-y-1.5">
                        <span className="text-xs font-bold text-natural-forest bg-[#FEFAE0] px-2.5 py-0.5 rounded-md inline-block border border-natural-border">
                          {g.term}
                        </span>
                        <p className="text-xs text-natural-charcoal/90 leading-relaxed font-medium">{g.definition}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
