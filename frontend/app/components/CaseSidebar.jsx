'use client';

import React, { useState, useEffect } from 'react';
import { getCases, createCase } from '../../lib/api';
import { Shield, X, Plus, FolderOpen, HelpCircle, LogOut, Loader2, AlertCircle } from 'lucide-react';

export default function CaseSidebar({ activeCaseId, onSelectCase, isOpen, onClose }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseDesc, setNewCaseDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCases();
      setCases(data || []);
      if (Array.isArray(data) && data.length > 0 && !activeCaseId) {
        onSelectCase(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load cases:", err);
      setError("Unable to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newCaseName.trim()) {
      setCreateError("Case name is required.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setCreateError(null);
      const newCase = await createCase(newCaseName.trim(), newCaseDesc.trim());
      setCases([newCase, ...cases]);
      setIsModalOpen(false);
      setNewCaseName('');
      setNewCaseDesc('');
      onSelectCase(newCase.id);
      if (onClose) onClose();
    } catch (err) {
      console.error("Failed to create case:", err);
      setCreateError(err.response?.data?.detail || "Failed to create case. Ensure backend is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full py-6 text-primary font-label-caps w-full">
      {/* Brand Header */}
      <div className="px-6 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="hidden lg:block overflow-hidden">
            <h1 className="font-headline-lg text-[20px] font-bold text-primary truncate">Intelligence</h1>
            <p className="font-body-sm text-[11px] text-on-surface-variant truncate">Network Analytics</p>
          </div>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button onClick={onClose} className="md:hidden p-2 text-on-surface-variant hover:text-primary">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* New Case Button */}
      <div className="px-4 mb-4">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center lg:justify-start gap-3 bg-primary text-on-primary py-3 px-4 rounded-lg font-bold hover:brightness-110 active:scale-98 transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden lg:inline text-sm">New Case</span>
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-3 p-2.5 rounded bg-error-container/20 border border-error/30 text-error text-[11px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Active Cases Header */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <h3 className="text-on-surface-variant text-[11px] font-bold tracking-wider uppercase hidden lg:block">
          Active Cases ({cases.length})
        </h3>
      </div>

      {/* Cases List */}
      <ul className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto custom-scrollbar">
        {loading ? (
          <li className="flex items-center justify-center py-8 text-on-surface-variant gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading cases...
          </li>
        ) : cases.length === 0 ? (
          <li className="text-center py-6 text-on-surface-variant text-[12px]">
            No cases found. Create one to start.
          </li>
        ) : (
          cases.map((c) => {
            const isActive = activeCaseId === c.id;
            return (
              <li key={c.id}>
                <button
                  onClick={() => {
                    onSelectCase(c.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-left ${
                    isActive
                      ? 'text-primary bg-primary/15 border-l-4 border-primary font-bold'
                      : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
                  }`}
                >
                  <FolderOpen className="w-5 h-5 shrink-0 mr-3" />
                  <div className="hidden lg:block overflow-hidden flex-1">
                    <div className="truncate text-[13px]">{c.name}</div>
                    {c.description && (
                      <div className="truncate text-[10px] text-on-surface-variant/70 font-normal">
                        {c.description}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {/* Footer Navigation */}
      <ul className="flex flex-col gap-1 px-2 mt-auto pt-4 border-t border-outline-variant mx-3">
        <li>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all text-xs" href="#">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span className="hidden lg:block">Support</span>
          </a>
        </li>
      </ul>
    </div>
  );

  return (
    <>
      {/* Desktop / Tablet Fixed Sidebar */}
      <nav className="hidden md:flex flex-col h-full bg-surface-container border-r border-outline-variant w-20 lg:w-64 fixed left-0 top-0 z-40 transition-all duration-300">
        {sidebarContent}
      </nav>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <nav className="relative w-72 bg-surface-container h-full shadow-2xl flex flex-col z-10">
            {sidebarContent}
          </nav>
        </div>
      )}

      {/* Create Case Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <Plus className="w-5 h-5" /> Create Investigation Case
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-on-surface-variant hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded bg-error/15 border border-error/30 text-error text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  Case Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operation Goldstrike"
                  value={newCaseName}
                  onChange={(e) => setNewCaseName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Brief summary of the investigation case..."
                  value={newCaseDesc}
                  onChange={(e) => setNewCaseDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-sm hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary font-bold text-sm hover:brightness-110 flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    'Create Case'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

