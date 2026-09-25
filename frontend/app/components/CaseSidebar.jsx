'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCases, createCase, deleteCase } from '../../lib/api';
import { Shield, X, Plus, FolderOpen, HelpCircle, Loader2, AlertCircle, Trash2, PanelLeft } from 'lucide-react';

export default function CaseSidebar({
  activeCaseId,
  onSelectCase,
  isOpen,
  onClose,
  isDesktopOpen = true,
  onToggleDesktop
}) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseDesc, setNewCaseDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [caseToDelete, setCaseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

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

  useEffect(() => { loadCases(); }, []);

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

  const handleDeleteCase = async () => {
    if (!caseToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteCase(caseToDelete.id);
      const remaining = cases.filter((c) => c.id !== caseToDelete.id);
      setCases(remaining);
      if (activeCaseId === caseToDelete.id) {
        onSelectCase(remaining.length > 0 ? remaining[0].id : null);
      }
      setCaseToDelete(null);
    } catch (err) {
      console.error("Failed to delete case:", err);
      setDeleteError(err.response?.data?.detail || "Failed to delete case.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Single unified content tree — never remounts on toggle.
  // Only the text labels fade/collapse; icons and rows stay put.
  const sidebarBody = (isCollapsed) => (
    <div className="flex flex-col h-full py-4 text-primary font-label-caps w-full">
      {/* Brand Header */}
      <div className={`mb-4 flex items-center h-12 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                key="brand-text"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden min-w-0"
              >
                <h1 className="text-[18px] font-bold text-primary truncate leading-tight whitespace-nowrap">Intelligence</h1>
                <p className="text-[10px] text-on-surface-variant truncate whitespace-nowrap">Network Analytics</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {onToggleDesktop && !isCollapsed && (
          <button
            type="button"
            onClick={onToggleDesktop}
            className="hidden md:flex p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors shrink-0 cursor-pointer"
            title="Collapse sidebar (Ctrl+B)"
            aria-label="Collapse sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}

        {onClose && (
          <button onClick={onClose} className="md:hidden p-2 text-on-surface-variant hover:text-primary cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Collapsed-only expand toggle, pinned under header */}
      {isCollapsed && onToggleDesktop && (
        <div className="flex justify-center mb-4">
          <button
            type="button"
            onClick={onToggleDesktop}
            className="p-2 rounded-lg text-primary bg-primary/10 hover:bg-primary/20 ring-1 ring-primary/30 transition-all cursor-pointer"
            title="Expand sidebar (Ctrl+B)"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* New Case Button */}
      <div className={`mb-4 ${isCollapsed ? 'flex justify-center' : 'px-4'}`}>
        <button
          onClick={() => setIsModalOpen(true)}
          title="New Case"
          className={`flex items-center bg-primary text-on-primary hover:brightness-110 active:scale-95 transition-all shadow-md rounded-lg cursor-pointer
            ${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full justify-start gap-3 py-2.5 px-4 font-bold'}`}
        >
          <Plus className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="text-sm whitespace-nowrap">New Case</span>}
        </button>
      </div>

      {!isCollapsed && error && (
        <div className="mx-4 mb-3 p-2.5 rounded bg-error-container/20 border border-error/30 text-error text-[11px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {!isCollapsed && (
        <div className="px-4 mb-2">
          <h3 className="text-on-surface-variant text-[11px] font-bold tracking-wider uppercase">
            Active Cases ({cases.length})
          </h3>
        </div>
      )}

      {/* Cases List */}
      <ul className={`flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar ${isCollapsed ? 'px-2 items-center' : 'px-2'}`}>
        {loading ? (
          <li className={`flex items-center justify-center py-8 text-on-surface-variant gap-2 text-xs ${isCollapsed ? 'w-10' : ''}`}>
            <Loader2 className="w-4 h-4 animate-spin" /> {!isCollapsed && "Loading cases..."}
          </li>
        ) : cases.length === 0 ? (
          !isCollapsed && (
            <li className="text-center py-6 text-on-surface-variant text-[12px]">
              No cases found. Create one to start.
            </li>
          )
        ) : (
          cases.map((c) => {
            const isActive = activeCaseId === c.id;
            if (isCollapsed) {
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCase(c.id)}
                    title={c.name}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? 'text-primary bg-primary/20 border-l-2 border-primary font-bold shadow-sm'
                        : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
                    }`}
                  >
                    <FolderOpen className="w-5 h-5" />
                  </button>
                </li>
              );
            }
            return (
              <li key={c.id} className="relative group/case">
                <div
                  onClick={() => { onSelectCase(c.id); if (onClose) onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'text-primary bg-primary/15 border-l-4 border-primary font-bold'
                      : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
                  }`}
                >
                  <div className="flex items-center min-w-0 flex-1 mr-2">
                    <FolderOpen className="w-5 h-5 shrink-0 mr-3" />
                    <div className="overflow-hidden flex-1">
                      <div className="truncate text-[13px] whitespace-nowrap">{c.name}</div>
                      {c.description && (
                        <div className="truncate text-[10px] text-on-surface-variant/70 font-normal whitespace-nowrap">
                          {c.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Delete Case"
                    onClick={(e) => { e.stopPropagation(); setDeleteError(null); setCaseToDelete(c); }}
                    className="opacity-0 group-hover/case:opacity-100 p-1.5 rounded text-on-surface-variant/70 hover:text-error hover:bg-error/20 transition-all shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      {/* Footer */}
      <div className={`mt-auto pt-4 border-t border-outline-variant ${isCollapsed ? 'flex justify-center' : 'px-2 mx-3'}`}>
        {isCollapsed ? (
          <a href="#" title="Support" className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all">
            <HelpCircle className="w-5 h-5" />
          </a>
        ) : (
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all text-xs whitespace-nowrap" href="#">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Support</span>
          </a>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop / Tablet — single content tree, width animates on the wrapper only */}
      <motion.aside
        animate={{ width: isDesktopOpen ? 256 : 60 }}
        initial={false}
        transition={{ type: 'tween', duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        style={{ willChange: 'width' }}
        className="hidden md:flex flex-col h-full bg-surface-container border-r border-outline-variant shrink-0 z-40 overflow-hidden"
      >
        {sidebarBody(!isDesktopOpen)}
      </motion.aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.nav
              key="mobile-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-72 bg-surface-container h-full shadow-2xl flex flex-col z-10"
            >
              {sidebarBody(false)}
            </motion.nav>
          </div>
        )}
      </AnimatePresence>

      {/* Create Case Modal — unchanged */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <Plus className="w-5 h-5" /> Create Investigation Case
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
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
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Case Name *</label>
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
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Description</label>
                <textarea
                  placeholder="Brief summary of the investigation case..."
                  value={newCaseDesc}
                  onChange={(e) => setNewCaseDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-sm hover:bg-surface-container transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-lg bg-primary text-on-primary font-bold text-sm hover:brightness-110 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed">
                  {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>) : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal — unchanged */}
      {caseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 w-full max-w-sm shadow-2xl relative">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-error/15 border border-error/30 flex items-center justify-center shrink-0 text-error">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">Delete Investigation Case</h3>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Permanently remove <span className="font-semibold text-primary">&quot;{caseToDelete.name}&quot;</span>? All associated entities, contacts, and graph intelligence data will be purged.
                </p>
              </div>
            </div>
            {deleteError && (
              <div className="mb-4 p-2.5 rounded bg-error/15 border border-error/30 text-error text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
            <div className="flex justify-end gap-2.5 mt-5">
              <button type="button" disabled={isDeleting} onClick={() => { setCaseToDelete(null); setDeleteError(null); }} className="px-3.5 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant text-xs hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                Cancel
              </button>
              <button type="button" disabled={isDeleting} onClick={handleDeleteCase} className="px-4 py-1.5 rounded-lg bg-error hover:bg-error/90 text-on-error font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed">
                {isDeleting ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...</>) : (<><Trash2 className="w-3.5 h-3.5" /> Delete Case</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}