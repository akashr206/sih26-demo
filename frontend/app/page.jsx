'use client';

import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import NetworkGraph from './components/NetworkGraph';
import SidePanel from './components/SidePanel';
import CaseSidebar from './components/CaseSidebar';
import { getCaseDetails, uploadToCase } from '../lib/api';
import { Menu, Search, Bell, User, Filter, Activity, AlertCircle, Network, FolderOpen } from 'lucide-react';

export default function Home() {
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [caseInfo, setCaseInfo] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [error, setError] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (activeCaseId) {
      loadCaseData(activeCaseId);
    }
  }, [activeCaseId]);

  const loadCaseData = async (id) => {
    try {
      setError(null);
      const data = await getCaseDetails(id);
      setCaseInfo(data.case_info);
      setGraphData(data.graph_data);
      setInsights(data.insights);
      setSelectedNode(null);
    } catch (err) {
      setError("Failed to load case data.");
      console.error(err);
    }
  };

  const handleFileUpload = async (file) => {
    if (!activeCaseId) return;
    try {
      const data = await uploadToCase(activeCaseId, file);
      setGraphData(data.graph_data);
      setInsights(data.insights);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred during analysis.');
      throw err;
    }
  };

  return (
    <>
      {/* Left Sidebar: Case Management */}
      <CaseSidebar 
        activeCaseId={activeCaseId} 
        onSelectCase={setActiveCaseId} 
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="ml-0 md:ml-20 lg:ml-64 flex-1 flex flex-col h-screen w-full">
        
        {/* Top App Bar */}
        <header className="h-16 border-b border-outline-variant bg-surface-container flex items-center justify-between px-inset-container shrink-0 z-30 relative">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)} 
              className="md:hidden p-2 text-on-surface-variant hover:text-primary"
            >
              <Menu className="w-6 h-6" />
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
            <button className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-primary-container/15 transition-colors flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary-container/20 border border-primary/30 ml-2 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
          </div>
        </header>

        {/* Workspace & Sidebar Layout */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Central Network Map Canvas */}
          <div className="flex-1 bg-surface relative flex flex-col p-6 overflow-hidden">
            
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-4 z-20">
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-surface-container border border-outline-variant rounded shadow-sm text-[12px] font-body-sm text-on-surface flex items-center gap-2 hover:bg-surface-container-high transition-colors">
                  <Filter className="w-4 h-4" /> Filter
                </button>
                <button className="px-3 py-1.5 bg-surface-container border border-outline-variant rounded shadow-sm text-[12px] font-body-sm text-on-surface flex items-center gap-2 hover:bg-surface-container-high transition-colors">
                  <Activity className="w-4 h-4" /> Time Slider
                </button>
              </div>
              {error && (
                <div className="px-4 py-1.5 bg-error-container/20 border border-error/30 text-error rounded text-[12px] font-body-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            {/* Map Area */}
            <div className="flex-1 relative rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
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

          {/* Right Sidebar: Network Insights */}
          {activeCaseId && (
            <SidePanel insights={insights} selectedNode={selectedNode} />
          )}

        </div>
      </main>
    </>
  );
}
