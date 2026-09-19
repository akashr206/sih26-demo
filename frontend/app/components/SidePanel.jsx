import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, User, Building, MapPin, Phone, Car, MousePointer2, Info } from 'lucide-react';

export default function SidePanel({ insights, selectedNode }) {
  const getIcon = (type, className) => {
    switch (type?.toUpperCase()) {
      case 'PERSON': return <User className={className} />;
      case 'ORG': return <Building className={className} />;
      case 'LOCATION': return <MapPin className={className} />;
      case 'PHONE': return <Phone className={className} />;
      case 'VEHICLE_PLATE': return <Car className={className} />;
      default: return <User className={className} />;
    }
  };

  return (
    <aside className="w-80 bg-surface-container border-l border-outline-variant flex flex-col h-full shrink-0 z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.5)] hidden xl:flex">
      {/* Header */}
      <div className="p-6 border-b border-outline-variant bg-surface-container-high">
        <h3 className="font-label-caps text-label-caps font-bold text-on-surface flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          NETWORK INSIGHTS
        </h3>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
        
        {/* Selected Node Details */}
        <AnimatePresence mode="wait">
          {selectedNode ? (
            <motion.div
              key="node-details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h4 className="font-body-sm text-body-sm font-semibold text-on-surface-variant mb-4 flex justify-between items-center">
                Selected Entity
              </h4>
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-md border-2 border-surface-container-lowest">
                  {getIcon(selectedNode.type, "w-6 h-6 text-surface-container-lowest")}
                </div>
                <div>
                  <h4 className="font-headline-lg-mobile text-[18px] font-bold text-on-surface">{selectedNode.label}</h4>
                  <p className="font-body-sm text-[12px] text-on-surface-variant">{selectedNode.type}</p>
                </div>
              </div>
              
              {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                <div className="mt-4 pt-4 border-t border-outline-variant">
                  <h5 className="font-label-caps text-[10px] text-on-surface-variant uppercase mb-2">Metadata</h5>
                  <div className="space-y-2">
                    {Object.entries(selectedNode.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between font-body-sm text-sm">
                        <span className="text-on-surface-variant">{key}:</span>
                        <span className="text-on-surface font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty-selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center text-center py-8 border border-dashed border-outline-variant rounded-xl bg-surface-container-low"
            >
              <MousePointer2 className="w-8 h-8 text-outline mb-2" />
              <p className="font-body-sm text-[12px] text-on-surface-variant">Select an entity on the graph</p>
            </motion.div>
          )}
        </AnimatePresence>

        <hr className="border-outline-variant" />

        {/* Top Influencers */}
        {insights && insights.top_influencers && (
          <section>
            <h4 className="font-body-sm text-body-sm font-semibold text-on-surface-variant mb-4 flex justify-between items-center">
              Top Influencers
              <Info className="w-4 h-4 cursor-pointer hover:text-primary" />
            </h4>
            <div className="flex flex-col gap-4">
              {insights.top_influencers.map((inf, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-end mb-1">
                    <span className="font-body-sm text-[14px] text-on-surface flex items-center gap-2">
                      {getIcon(inf.type, "w-4 h-4 text-primary")}
                      <span className="truncate max-w-[140px]">{inf.label}</span>
                    </span>
                    <span className="font-label-caps text-[10px] text-primary">{(inf.score * 100).toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${inf.score * 100}%` }}></div>
                  </div>
                </div>
              ))}
              {insights.top_influencers.length === 0 && <p className="font-body-sm text-sm text-on-surface-variant">No influencers detected.</p>}
            </div>
          </section>
        )}

        {insights && insights.top_influencers && insights.top_influencers.length > 0 && <hr className="border-outline-variant" />}

        {/* Key Middlemen */}
        {insights && insights.key_middlemen && (
          <section>
            <h4 className="font-body-sm text-body-sm font-semibold text-on-surface-variant mb-4 flex justify-between items-center">
              Key Middlemen
              <Info className="w-4 h-4 cursor-pointer hover:text-primary" />
            </h4>
            <div className="flex flex-col gap-4">
              {insights.key_middlemen.map((bridge, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-end mb-1">
                    <span className="font-body-sm text-[14px] text-on-surface flex items-center gap-2">
                      {getIcon(bridge.type, "w-4 h-4 text-secondary")}
                      <span className="truncate max-w-[140px]">{bridge.label}</span>
                    </span>
                    <span className="font-label-caps text-[10px] text-secondary">{(bridge.score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${bridge.score * 100}%` }}></div>
                  </div>
                </div>
              ))}
              {insights.key_middlemen.length === 0 && <p className="font-body-sm text-sm text-on-surface-variant">No middlemen detected.</p>}
            </div>
          </section>
        )}

        {/* Clusters */}
        {insights && insights.communities && insights.communities.length > 0 && (
          <>
            <hr className="border-outline-variant" />
            <section>
              <h4 className="font-body-sm text-body-sm font-semibold text-on-surface-variant mb-4 flex justify-between items-center">
                Clusters
                <Info className="w-4 h-4 cursor-pointer hover:text-primary" />
              </h4>
              <div className="flex flex-col gap-2">
                {insights.communities.map((comm, idx) => (
                  <div key={idx} className="p-3 bg-surface-container-high rounded-lg border border-outline-variant">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-label-caps text-[10px] font-bold text-on-surface">Group {comm.community_id}</span>
                      <span className="font-body-sm text-[10px] text-on-surface-variant">{comm.size} members</span>
                    </div>
                    <p className="font-body-sm text-[11px] text-on-surface-variant truncate">
                      {comm.members.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

      </div>
    </aside>
  );
}
