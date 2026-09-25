'use client';

import React, { useState, useEffect, useRef } from 'react';
import FileUpload from './components/FileUpload';
import NetworkGraph from './components/NetworkGraph';
import SidePanel from './components/SidePanel';
import CaseSidebar from './components/CaseSidebar';
import { getCaseDetails, uploadToCase } from '../lib/api';
import { Menu, Search, Bell, User, Filter, Activity, AlertCircle, Network, FolderOpen, PanelLeft } from 'lucide-react';

export default function Home() {
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [caseInfo, setCaseInfo] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [error, setError] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Desktop left sidebar open state

  /**
   * Toggle left sidebar visibility.
   * On mobile devices (< 768px), toggles the mobile drawer overlay.
   * On tablet/laptop/desktop (>= 768px), toggles the collapsible desktop sidebar with framer-motion.
   */
  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileSidebarOpen(prev => !prev);
    } else {
      setIsSidebarOpen(prev => !prev);
    }
  };

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle the left sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // =========================================================================
  // VIEWPORT RESIZER SLIDER STATE & LOGIC
  // Allows users on laptop/desktop screens to adjust the split between the
  // 'Network Graph' section (flex-1) and 'Network Insights' section (SidePanel).
  // =========================================================================
  const workspaceRef = useRef(null); // Reference to the parent container holding both sections
  const [sidePanelWidth, setSidePanelWidth] = useState(360); // Default width in pixels
  const [isDragging, setIsDragging] = useState(false); // Indicates active drag state

  /**
   * Pointer down handler on the vertical slider divider.
   * Locks pointer capture so subsequent mouse/pointer move events remain
   * bound to the resizer even if the cursor moves over the graph canvas or iframes.
   */
  const handleSliderPointerDown = (e) => {
    if (e.button !== 0) return; // Only trigger on primary (left) click
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      // Graceful fallback if pointer capture is unsupported
    }
    setIsDragging(true);
  };

  /**
   * Pointer move handler for adjusting section widths.
   * Logic:
   * 1. The workspace flex container contains [ Network Graph (flex-1) ] | [ Divider ] | [ Network Insights (width: W) ].
   * 2. The Network Insights section sits against the right boundary of the workspace container.
   * 3. Hence, (containerRect.right - e.clientX) directly equals the target width of the Network Insights section.
   * 4. Moving pointer LEFT (smaller e.clientX) -> increased width for Network Insights, reducing Network Graph space.
   * 5. Moving pointer RIGHT (larger e.clientX) -> decreased width for Network Insights, expanding Network Graph space.
   * 6. Because Network Graph is flex-1 and Insights has fixed width, the sum of both remains constant.
   */
  const handleSliderPointerMove = (e) => {
    if (!isDragging) return;

    if (workspaceRef.current) {
      const containerRect = workspaceRef.current.getBoundingClientRect();
      const totalAvailableWidth = containerRect.width;

      // Calculate candidate width for Network Insights based on pointer X position
      const targetInsightsWidth = containerRect.right - e.clientX;

      // Constraints to keep both sections functional and visually balanced:
      // - Minimum width for Insights: 280px (prevents cards and metric labels from truncating)
      // - Maximum width for Insights: totalAvailableWidth - 360px (guarantees Network Graph has >= 360px canvas)
      //   capped at a max sensible width of 680px
      const minInsightsWidth = 280;
      const maxInsightsWidth = Math.max(minInsightsWidth, Math.min(680, totalAvailableWidth - 360));

      // Clamp target width within safe boundaries
      const clampedWidth = Math.min(Math.max(targetInsightsWidth, minInsightsWidth), maxInsightsWidth);
      setSidePanelWidth(clampedWidth);
    }
  };

  /**
   * Pointer up / cancel handler to release pointer capture and conclude drag.
   */
  const handleSliderPointerUp = (e) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore if pointer capture was already released
      }
      setIsDragging(false);
    }
  };

  /**
   * Keyboard accessibility: allows adjusting section widths using ArrowLeft / ArrowRight
   * when the vertical slider handle is focused.
   */
  const handleSliderKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      // Left arrow: expands Insights panel (+24px), reduces Graph panel
      e.preventDefault();
      setSidePanelWidth(prev => Math.min(prev + 24, 650));
    } else if (e.key === 'ArrowRight') {
      // Right arrow: shrinks Insights panel (-24px), expands Graph panel
      e.preventDefault();
      setSidePanelWidth(prev => Math.max(prev - 24, 280));
    } else if (e.key === 'Home' || e.key === 'Escape') {
      // Reset to default width
      e.preventDefault();
      setSidePanelWidth(360);
    }
  };

  const loadCaseData = async (id) => {
    try {
      setError(null);
      const data = await getCaseDetails(id);
      setCaseInfo(data.case_info);
      setGraphData(data.graph_data);
      setInsights(data.insights);
      setNarrative(data.narrative || null);
      setSelectedNode(null);
    } catch (err) {
      setError("Failed to load case data.");
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeCaseId) {
      loadCaseData(activeCaseId);
    } else {
      setCaseInfo(null);
      setGraphData(null);
      setInsights(null);
      setNarrative(null);
      setSelectedNode(null);
    }
  }, [activeCaseId]);

  const handleFileUpload = async (file) => {
    if (!activeCaseId) return;
    try {
      setError(null);
      const data = await uploadToCase(activeCaseId, file);
      
      setGraphData(data.graph_data);
      setInsights(data.insights);
      setNarrative(data.narrative || null);
      if (data.case_info) setCaseInfo(data.case_info);
      setError(null);
    } catch (err) {
      if (err.isTimeout) {
        // Non-blocking informative message
        setError(`⏳ ${err.customMessage} The graph will appear shortly.`);
        
        // Simple polling retry logic
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const data = await getCaseDetails(activeCaseId);
            if (data.graph_data?.nodes?.length > 0) {
               setGraphData(data.graph_data);
               setInsights(data.insights);
               setNarrative(data.narrative || null);
               setError(null);
               clearInterval(pollInterval);
            }
          } catch (e) {
            // Ignore polling errors
          }
          if (attempts >= 5) clearInterval(pollInterval);
        }, 5000);
      } else {
        setError(err.response?.data?.detail || 'An error occurred during analysis.');
      }
      throw err;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Left Sidebar: Case Management */}
      <CaseSidebar 
        activeCaseId={activeCaseId} 
        onSelectCase={setActiveCaseId} 
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        isDesktopOpen={isSidebarOpen}
        onToggleDesktop={() => setIsSidebarOpen(prev => !prev)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen w-full overflow-hidden min-w-0">
        
        {/* Top App Bar */}
        <header className="h-13 border-b border-outline-variant bg-surface-container flex items-center justify-between px-inset-container shrink-0 z-30 relative">
          <div className="flex items-center gap-3">
            {/* Mobile-only drawer toggle button */}
            <button 
              onClick={() => setIsMobileSidebarOpen(true)} 
              className="md:hidden p-2 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-center cursor-pointer"
              title="Open navigation"
              aria-label="Open navigation"
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            <div className="flex items-baseline gap-3">
              <h2 className="font-headline-lg-mobile text-[18px] font-bold text-primary">
                {caseInfo?.name || "Select Case"}
              </h2>
              {caseInfo?.id && (
                <span className="font-label-caps text-[10px] text-on-surface-variant bg-surface-container-low px-2 py-1 rounded">
                  CASE #{String(caseInfo.id).substring(0, 6)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input 
                className="pl-10 pr-4 py-1.5 bg-surface-container-highest border-none rounded-full text-body-sm font-body-sm w-64 text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary focus:bg-surface transition-all outline-none" 
                placeholder="Search entities..." 
                type="text"
              />
            </div>
            <button className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-primary-container/15 transition-colors flex items-center justify-center cursor-pointer">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary-container/20 border border-primary/30 ml-2 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
          </div>
        </header>

        {/* Workspace & Sidebar Layout */}
        <div 
          ref={workspaceRef} 
          className={`flex-1 flex overflow-hidden relative ${isDragging ? 'select-none cursor-col-resize' : ''}`}
        >
          
          {/* Central Network Map Canvas */}
          <div className="flex-1 bg-surface-container-lowest relative flex flex-col overflow-hidden min-w-0">
            
            {/* Floating Toolbar */}
            <div className="absolute top-4 left-4 z-20 flex gap-2">
              <button className="px-3 py-1.5 bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg shadow-sm text-[12px] font-body-sm text-on-surface flex items-center gap-2 hover:bg-surface-container-high transition-colors cursor-pointer">
                <Filter className="w-4 h-4" /> Filter
              </button>
              <button className="px-3 py-1.5 bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg shadow-sm text-[12px] font-body-sm text-on-surface flex items-center gap-2 hover:bg-surface-container-high transition-colors cursor-pointer">
                <Activity className="w-4 h-4" /> Time Slider
              </button>
            </div>
            
            {error && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-error-container/90 backdrop-blur-md border border-error/30 text-error rounded-lg shadow-md text-[13px] font-body-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Map Area */}
            <div className="flex-1 relative w-full h-full overflow-hidden">
              {activeCaseId ? (
                <>
                  {graphData && graphData.nodes && graphData.nodes.length > 0 ? (
                    <NetworkGraph data={graphData} onNodeClick={setSelectedNode} />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 border border-outline-variant">
                        <Network className="w-8 h-8 text-outline" />
                      </div>
                      <p className="font-body-sm text-on-surface-variant">Graph is empty. Upload data to begin.</p>
                    </div>
                  )}
                  {/* Floating Upload Overlay */}
                  <FileUpload onUploadFile={handleFileUpload} />
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <FolderOpen className="w-12 h-12 text-outline mb-4" />
                  <p className="font-body-sm text-on-surface-variant">Select or create a case from the sidebar.</p>
                </div>
              )}
            </div>
          </div>

          {/* 
            Vertical Resizer Slider between 'Network Graph' and 'Network Insights'.
            - Displayed only on laptop/desktop views (hidden xl:flex) and when a case is active.
            - Dragging LEFT increases Insights panel width and shrinks Graph.
            - Dragging RIGHT decreases Insights panel width and expands Graph.
            - Total width remains constant as both sections share the flex container space.
          */}
          {activeCaseId && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-valuenow={sidePanelWidth}
              aria-valuemin={280}
              aria-valuemax={680}
              aria-label="Adjust width between Network Graph and Network Insights"
              tabIndex={0}
              onPointerDown={handleSliderPointerDown}
              onPointerMove={handleSliderPointerMove}
              onPointerUp={handleSliderPointerUp}
              onPointerCancel={handleSliderPointerUp}
              onKeyDown={handleSliderKeyDown}
              onDoubleClick={() => setSidePanelWidth(360)}
              title="Drag or press Left/Right arrows to resize (Double-click to reset)"
              className={`hidden xl:flex relative w-2.5 shrink-0 z-30 cursor-col-resize select-none items-center justify-center group transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                isDragging 
                  ? 'bg-primary/20' 
                  : 'hover:bg-primary/10'
              }`}
            >
              {/* Subtle 1px vertical divider line */}
              <div 
                className={`w-[1px] h-full transition-colors duration-150 ${
                  isDragging 
                    ? 'bg-primary' 
                    : 'bg-outline-variant group-hover:bg-primary/50'
                }`} 
              />

              {/* Tactile center grab pill indicator */}
              <div 
                className={`absolute top-1/2 -translate-y-1/2 w-1 rounded-full transition-all duration-150 pointer-events-none ${
                  isDragging 
                    ? 'h-8 bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]' 
                    : 'h-6 bg-outline-variant group-hover:bg-primary/70'
                }`} 
              />
            </div>
          )}

          {/* Right Sidebar: Network Insights */}
          {activeCaseId && (
            <SidePanel 
              insights={insights} 
              selectedNode={selectedNode} 
              narrative={narrative} 
              width={sidePanelWidth} 
            />
          )}

        </div>
      </main>
    </div>
  );
}
