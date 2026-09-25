import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, User, Building, MapPin, Phone, Car, MousePointer2, Info,
  ShieldAlert, Target, GitBranch, Users2, ListChecks, Zap, Clock
} from 'lucide-react';

const THREAT_STYLES = {
  LOW:      { bg: 'bg-green-500/15',  text: 'text-green-400',  ring: 'ring-green-500/30' },
  MODERATE: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', ring: 'ring-yellow-500/30' },
  HIGH:     { bg: 'bg-orange-500/15', text: 'text-orange-400', ring: 'ring-orange-500/30' },
  CRITICAL: { bg: 'bg-red-500/15',    text: 'text-red-400',    ring: 'ring-red-500/30' },
};

const PRIORITY_STYLES = {
  HIGH:   'bg-red-500/15 text-red-400',
  MEDIUM: 'bg-yellow-500/15 text-yellow-400',
  LOW:    'bg-surface-variant text-on-surface-variant',
};

function getIcon(type, className) {
  switch (type?.toUpperCase()) {
    case 'PERSON': return <User className={className} />;
    case 'ORG': return <Building className={className} />;
    case 'LOCATION': return <MapPin className={className} />;
    case 'PHONE': return <Phone className={className} />;
    case 'VEHICLE_PLATE': return <Car className={className} />;
    default: return <User className={className} />;
  }
}

function ThreatBadge({ level, reasoning }) {
  const style = THREAT_STYLES[level?.toUpperCase()] || THREAT_STYLES.MODERATE;
  return (
    <div className={`rounded-xl p-4 ring-1 ${style.bg} ${style.ring}`}>
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className={`w-4 h-4 ${style.text}`} />
        <span className={`font-label-caps text-[11px] font-bold tracking-wide ${style.text}`}>
          THREAT LEVEL: {level?.toUpperCase()}
        </span>
      </div>
      {reasoning && <p className="text-[12px] text-on-surface-variant leading-snug">{reasoning}</p>}
    </div>
  );
}

function TargetCard({ target }) {
  return (
    <div className="p-3 bg-surface-container-high rounded-lg border border-outline-variant">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {getIcon(target.type, "w-4 h-4 text-primary shrink-0")}
          <span className="font-semibold text-[14px] text-on-surface truncate">{target.name}</span>
        </div>
        <span className={`shrink-0 font-label-caps text-[9px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[target.priority?.toUpperCase()] || PRIORITY_STYLES.LOW}`}>
          {target.priority?.toUpperCase()}
        </span>
      </div>
      <p className="text-[11px] text-primary font-medium mb-1">{target.role}</p>
      <p className="text-[12px] text-on-surface-variant leading-snug">{target.reasoning}</p>
    </div>
  );
}

function BridgeCard({ bridge }) {
  return (
    <div className="p-3 bg-secondary/10 rounded-lg border border-secondary/30">
      <div className="flex items-center gap-2 mb-1.5">
        <GitBranch className="w-4 h-4 text-secondary shrink-0" />
        {getIcon(bridge.type, "w-4 h-4 text-secondary shrink-0")}
        <span className="font-semibold text-[14px] text-on-surface truncate">{bridge.name}</span>
      </div>
      <p className="text-[11px] text-secondary font-medium mb-1">Bridges: {bridge.connects}</p>
      <p className="text-[12px] text-on-surface-variant leading-snug">{bridge.reasoning}</p>
    </div>
  );
}

function ActionCard({ action }) {
  const urgent = action.urgency?.toUpperCase() === 'IMMEDIATE';
  return (
    <div className={`p-3 rounded-lg border flex gap-3 ${urgent ? 'bg-red-500/10 border-red-500/30' : 'bg-surface-container-high border-outline-variant'}`}>
      {urgent
        ? <Zap className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        : <Clock className="w-4 h-4 text-on-surface-variant shrink-0 mt-0.5" />}
      <div className="min-w-0">
        <p className="text-[13px] text-on-surface font-medium leading-snug">{action.action}</p>
        <p className="text-[11px] text-on-surface-variant mt-1 leading-snug">{action.rationale}</p>
      </div>
    </div>
  );
}

export default function SidePanel({ insights, selectedNode, narrative, width }) {
  const hasNarrative = narrative && (narrative.executive_summary || narrative.key_targets?.length);

  return (
    <aside
      style={{ width: width ? `${width}px` : undefined }}
      className={`bg-surface-container flex flex-col h-full shrink-0 z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.5)] hidden xl:flex ${!width ? 'w-80' : ''}`}
    >
      <div className="p-4 border-b border-outline-variant bg-surface-container-high">
        <h3 className="font-label-caps text-label-caps font-bold text-on-surface flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          NETWORK INSIGHTS
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">

        {/* Selected node — unchanged */}
        <AnimatePresence mode="wait">
          {selectedNode ? (
            <motion.div key="node-details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-body-sm text-body-sm font-semibold text-on-surface-variant mb-4">Selected Entity</h4>
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-md border-2 border-surface-container-lowest">
                  {getIcon(selectedNode.type, "w-6 h-6 text-surface-container-lowest")}
                </div>
                <div>
                  <h4 className="text-[18px] font-bold text-on-surface">{selectedNode.label}</h4>
                  <p className="text-[12px] text-on-surface-variant">{selectedNode.type}</p>
                </div>
              </div>
              {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                <div className="mt-4 pt-4 border-t border-outline-variant space-y-2">
                  {Object.entries(selectedNode.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">{key}:</span>
                      <span className="text-on-surface font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="empty-selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center text-center py-8 border border-dashed border-outline-variant rounded-xl bg-surface-container-low">
              <MousePointer2 className="w-8 h-8 text-outline mb-2" />
              <p className="text-[12px] text-on-surface-variant">Select an entity on the graph</p>
            </motion.div>
          )}
        </AnimatePresence>

        <hr className="border-outline-variant" />

        {/* Structured case briefing */}
        {hasNarrative && (
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col gap-5">

            <ThreatBadge level={narrative.threat_level} reasoning={narrative.threat_level_reasoning} />

            {narrative.executive_summary && (
              <div>
                <h4 className="font-body-sm font-semibold text-on-surface-variant mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Executive Summary
                </h4>
                <p className="text-[13px] text-on-surface leading-[1.7]">{narrative.executive_summary}</p>
              </div>
            )}

            {narrative.key_targets?.length > 0 && (
              <div>
                <h4 className="font-body-sm font-semibold text-on-surface-variant mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Key Targets
                </h4>
                <div className="flex flex-col gap-2">
                  {narrative.key_targets.map((t, i) => <TargetCard key={i} target={t} />)}
                </div>
              </div>
            )}

            {narrative.bridge_entities?.length > 0 && (
              <div>
                <h4 className="font-body-sm font-semibold text-on-surface-variant mb-3 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-secondary" /> Bridge Entities
                </h4>
                <div className="flex flex-col gap-2">
                  {narrative.bridge_entities.map((b, i) => <BridgeCard key={i} bridge={b} />)}
                </div>
              </div>
            )}

            {narrative.clusters?.length > 0 && (
              <div>
                <h4 className="font-body-sm font-semibold text-on-surface-variant mb-3 flex items-center gap-2">
                  <Users2 className="w-4 h-4 text-primary" /> Clusters
                </h4>
                <div className="flex flex-col gap-2">
                  {narrative.clusters.map((c, i) => (
                    <div key={i} className="p-3 bg-surface-container-high rounded-lg border border-outline-variant">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-[13px] text-on-surface">{c.label}</span>
                        <span className="text-[10px] text-on-surface-variant">{c.size} members</span>
                      </div>
                      <p className="text-[12px] text-on-surface-variant leading-snug">{c.composition}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {narrative.recommended_actions?.length > 0 && (
              <div>
                <h4 className="font-body-sm font-semibold text-on-surface-variant mb-3 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-primary" /> Recommended Actions
                </h4>
                <div className="flex flex-col gap-2">
                  {narrative.recommended_actions.map((a, i) => <ActionCard key={i} action={a} />)}
                </div>
              </div>
            )}
          </motion.section>
        )}

        {hasNarrative && <hr className="border-outline-variant" />}

        {/* Raw centrality metrics — kept as-is below the curated briefing */}
        {insights?.top_influencers && (
          <section>
            <h4 className="font-body-sm font-semibold text-on-surface-variant mb-4 flex justify-between items-center">
              Top Influencers <Info className="w-4 h-4 cursor-pointer hover:text-primary" />
            </h4>
            <div className="flex flex-col gap-4">
              {insights.top_influencers.map((inf, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[14px] text-on-surface flex items-center gap-2">
                      {getIcon(inf.type, "w-4 h-4 text-primary")}
                      <span className="truncate max-w-[140px]">{inf.label}</span>
                    </span>
                    <span className="text-[10px] text-primary">{(inf.score * 100).toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${inf.score * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}