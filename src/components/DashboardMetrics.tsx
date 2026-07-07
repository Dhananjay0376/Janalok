import React from "react";
import { TrendingUp, BarChart2, CheckCircle2, Clock, ThumbsUp, DollarSign, Calendar } from "lucide-react";
import { motion } from "motion/react";

// Mock Stats data
const RESOLUTION_BY_CATEGORY = [
  { name: "Roads & Transit", days: 6.4, color: "#D4A373" },      // Clay
  { name: "Utilities", days: 2.1, color: "#5F6F52" },            // Forest
  { name: "Sanitation", days: 1.5, color: "#A9B388" },           // Sage
  { name: "Safety & Lighting", days: 4.8, color: "#2C3333" },    // Charcoal
  { name: "Environment", days: 3.2, color: "#A3B18A" },          // Organic Sage
];

const ISSUE_VOLUME_MONTHLY = [
  { month: "Jan", reported: 45, resolved: 38 },
  { month: "Feb", reported: 68, resolved: 52 },
  { month: "Mar", reported: 85, resolved: 78 },
  { month: "Apr", reported: 110, resolved: 95 },
  { month: "May", reported: 98, resolved: 90 },
  { month: "Jun", reported: 130, resolved: 115 },
];

const BUDGET_BREAKDOWN = [
  { category: "Infrastructure & Roads", share: 38, amount: "$4.5M", color: "#D4A373" },
  { category: "Public Safety & Lighting", share: 22, amount: "$2.6M", color: "#2C3333" },
  { category: "Environmental & Parks", share: 18, amount: "$2.1M", color: "#5F6F52" },
  { category: "Sanitation & Waste", share: 12, amount: "$1.4M", color: "#A9B388" },
  { category: "Social Services", share: 10, amount: "$1.2M", color: "#A3B18A" },
];

/**
 * DashboardMetrics displays municipal statistics and key performance indicators,
 * including resolution rates, repair timelines, satisfaction levels, 
 * historical trends, and fiscal transparency budget charts.
 */
export default function DashboardMetrics() {
  const maxDays = Math.max(...RESOLUTION_BY_CATEGORY.map((c) => c.days));
  const maxReported = Math.max(...ISSUE_VOLUME_MONTHLY.map((m) => m.reported));

  return (
    <div className="space-y-6" id="dashboard-metrics-component">
      {/* Stat Cards - Top grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-white p-5 border border-natural-border rounded-[32px] shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-natural-cream text-natural-forest rounded-2xl border border-natural-border">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-natural-forest/80">Resolution Rate</p>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl md:text-2xl font-serif font-bold text-natural-charcoal">88.5%</span>
              <span className="text-[10px] font-bold text-natural-forest bg-[#FEFAE0] border border-natural-border px-1.5 py-0.5 rounded-md">+2.4%</span>
            </div>
            <p className="text-[10px] text-natural-forest/75 font-semibold mt-1">148 resolved of 167 reported</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-5 border border-natural-border rounded-[32px] shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-natural-bone text-natural-clay rounded-2xl border border-natural-border">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-natural-forest/80">Avg. Repair Time</p>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl md:text-2xl font-serif font-bold text-natural-charcoal">3.6 Days</span>
              <span className="text-[10px] font-bold text-natural-forest bg-[#FEFAE0] border border-natural-border px-1.5 py-0.5 rounded-md">-12h</span>
            </div>
            <p className="text-[10px] text-natural-forest/75 font-semibold mt-1">Response down from 4.1 days</p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-5 border border-natural-border rounded-[32px] shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-natural-cream text-natural-forest rounded-2xl border border-natural-border">
            <ThumbsUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-natural-forest/80">Citizen Satisfaction</p>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl md:text-2xl font-serif font-bold text-natural-charcoal">92.4%</span>
              <span className="text-[10px] font-bold text-natural-forest bg-[#FEFAE0] border border-natural-border px-1.5 py-0.5 rounded-md">+1.8%</span>
            </div>
            <p className="text-[10px] text-natural-forest/75 font-semibold mt-1">Based on 490 survey responses</p>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-5 border border-natural-border rounded-[32px] shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-natural-bone text-natural-charcoal rounded-2xl border border-natural-border">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-natural-forest/80">Total Fiscal Budget</p>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl md:text-2xl font-serif font-bold text-natural-charcoal">$11.8M</span>
              <span className="text-[10px] font-bold text-natural-forest bg-natural-bone border border-natural-border px-1.5 py-0.5 rounded-md">FY 2026</span>
            </div>
            <p className="text-[10px] text-natural-forest/75 font-semibold mt-1">100% transparently audited</p>
          </div>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Panel 1: Resolution Time by Category (Horizontal Bar Chart) */}
        <div className="lg:col-span-6 bg-white border border-natural-border rounded-[32px] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-natural-border pb-3">
            <div>
              <h3 className="text-base font-serif font-bold text-natural-charcoal">Incident Resolution Time</h3>
              <p className="text-[10px] text-natural-forest font-semibold">Average calendar days to close tickets by sector</p>
            </div>
            <BarChart2 className="w-4 h-4 text-natural-forest/70" />
          </div>

          <div className="space-y-4 pt-2">
            {RESOLUTION_BY_CATEGORY.map((c, idx) => {
              const pct = (c.days / maxDays) * 100;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-natural-charcoal">{c.name}</span>
                    <span className="font-semibold text-natural-forest">{c.days} days</span>
                  </div>
                  <div className="w-full bg-natural-bone h-2.5 rounded-full overflow-hidden relative border border-natural-border/30">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.1 }}
                      className="h-full rounded-full animate-pulse"
                      style={{ backgroundColor: c.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel 2: Issue Volume (Monthly Vertical Stacked Bars) */}
        <div className="lg:col-span-6 bg-white border border-natural-border rounded-[32px] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-natural-border pb-3">
            <div>
              <h3 className="text-base font-serif font-bold text-natural-charcoal">Reported vs. Resolved Grievances</h3>
              <p className="text-[10px] text-natural-forest font-semibold">Monthly cumulative volume tracking</p>
            </div>
            <TrendingUp className="w-4 h-4 text-natural-forest/70" />
          </div>

          {/* SVG Custom double bar chart */}
          <div className="h-44 flex items-end justify-between pt-4 px-2">
            {ISSUE_VOLUME_MONTHLY.map((m, idx) => {
              const repHeight = (m.reported / maxReported) * 100;
              const resHeight = (m.resolved / maxReported) * 100;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 space-y-2">
                  <div className="w-full flex items-end justify-center space-x-1.5 h-32">
                    {/* Reported bar */}
                    <div className="relative group w-3.5">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${repHeight}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.05 }}
                        className="bg-natural-bone border border-natural-border rounded-t-md group-hover:bg-natural-border transition-colors w-full"
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-natural-charcoal text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap z-10 shadow-xs border border-natural-border">
                        {m.reported} Filed
                      </div>
                    </div>

                    {/* Resolved bar */}
                    <div className="relative group w-3.5">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${resHeight}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.05 + 0.1 }}
                        className="bg-natural-forest border border-natural-forest rounded-t-md group-hover:bg-[#4A5741] transition-colors w-full"
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-natural-forest text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap z-10 shadow-xs">
                        {m.resolved} Solved
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-natural-forest/80">{m.month}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center space-x-4 pt-2 text-[10px] font-semibold">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 bg-natural-bone border border-natural-border rounded-sm inline-block"></span>
              <span className="text-natural-forest font-semibold">Reported Complaints</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 bg-natural-forest rounded-sm inline-block"></span>
              <span className="text-natural-forest font-semibold">Resolved Actions</span>
            </div>
          </div>
        </div>

        {/* Panel 3: Fiscal Budget Allocation Breakdown */}
        <div className="lg:col-span-12 bg-white border border-natural-border rounded-[32px] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-natural-border pb-3">
            <div>
              <h3 className="text-base font-serif font-bold text-natural-charcoal">Municipal Budget Transparency</h3>
              <p className="text-[10px] text-natural-forest font-semibold">Allocation breakdown of city council funds for FY 2026</p>
            </div>
            <Calendar className="w-4 h-4 text-natural-forest/70" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2">
            {BUDGET_BREAKDOWN.map((b, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-natural-border flex flex-col justify-between space-y-3 bg-natural-bone/40">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: b.color }} />
                    <span className="text-[11px] font-bold text-natural-charcoal line-clamp-1">{b.category}</span>
                  </div>
                  <h4 className="text-lg font-serif font-bold text-natural-forest">{b.amount}</h4>
                </div>

                {/* Progress share indicators */}
                <div className="space-y-1">
                  <div className="w-full bg-natural-bone h-1.5 rounded-full overflow-hidden border border-natural-border/20">
                    <div className="h-full rounded-full" style={{ width: `${b.share}%`, backgroundColor: b.color }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-natural-forest font-bold">
                    <span>Share</span>
                    <span>{b.share}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-natural-forest/80 font-semibold text-center mt-2 leading-relaxed">
            *All financial records are pulled directly from the OpenGov Transparency API of the Municipal Comptroller.
          </p>
        </div>
      </div>
    </div>
  );
}
