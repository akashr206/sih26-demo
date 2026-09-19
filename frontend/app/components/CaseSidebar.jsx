'use client';

import React, { useState, useEffect } from 'react';
import { getCases, createCase } from '../../lib/api';
import { Shield, X, Plus, FolderOpen, HelpCircle, LogOut } from 'lucide-react';

export default function CaseSidebar({ activeCaseId, onSelectCase }) {
  const [cases, setCases] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseDesc, setNewCaseDesc] = useState('');

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const data = await getCases();
      setCases(data);
      if (data.length > 0 && !activeCaseId) {
        onSelectCase(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load cases:", error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCaseName.trim()) return;
    try {
      const newCase = await createCase(newCaseName, newCaseDesc);
      setCases([newCase, ...cases]);
      setIsCreating(false);
      setNewCaseName('');
      setNewCaseDesc('');
      onSelectCase(newCase.id);
    } catch (error) {
      console.error("Failed to create case:", error);
    }
  };

  return (
    <nav className="hidden md:flex flex-col py-stack-lg h-full bg-surface-container text-primary font-label-caps text-label-caps w-20 lg:w-64 fixed left-0 top-0 border-r border-outline-variant z-40 transition-all duration-300">
      <div className="px-6 mb-8 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-on-primary-container" />
        </div>
        <div className="hidden lg:block overflow-hidden">
          <h1 className="font-headline-lg text-[24px] font-bold text-primary truncate">Intelligence</h1>
          <p className="font-body-sm text-[12px] text-on-surface-variant truncate">Active Surveillance</p>
        </div>
      </div>
      
      <div className="px-4 mb-4">
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="w-full flex items-center justify-center lg:justify-start gap-3 bg-primary-container text-on-primary-container py-3 px-4 rounded-lg font-bold hover:bg-primary transition-colors"
        >
          {isCreating ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          <span className="hidden lg:inline">{isCreating ? 'Cancel' : 'New Case'}</span>
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="px-4 mb-4 hidden lg:flex flex-col gap-2">
          <input
            type="text"
            placeholder="Case Name..."
            value={newCaseName}
            onChange={(e) => setNewCaseName(e.target.value)}
            className="w-full bg-surface-container-highest border border-outline-variant rounded px-3 py-2 text-on-surface text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <input
            type="text"
            placeholder="Description..."
            value={newCaseDesc}
            onChange={(e) => setNewCaseDesc(e.target.value)}
            className="w-full bg-surface-container-highest border border-outline-variant rounded px-3 py-2 text-on-surface text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <button type="submit" className="w-full bg-primary/20 text-primary py-2 rounded font-bold hover:bg-primary/30 transition-colors">
            Create
          </button>
        </form>
      )}

      <div className="px-4 mb-2">
        <h3 className="text-on-surface-variant text-[10px] uppercase tracking-wider mb-2 hidden lg:block">Active Cases</h3>
      </div>
      <ul className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto custom-scrollbar">
        {cases.map((c) => {
          const isActive = activeCaseId === c.id;
          return (
            <li key={c.id}>
              <button
                onClick={() => onSelectCase(c.id)}
                className={`w-full flex flex-col items-start px-4 py-3 rounded-r-full group-hover:translate-x-1 transition-all duration-200 text-left ${
                  isActive
                    ? 'text-primary border-l-4 border-primary bg-primary-container/15'
                    : 'text-on-surface-variant border-l-4 border-transparent hover:text-primary hover:bg-surface-container-low'
                }`}
              >
                <div className="flex items-center gap-4 w-full">
                  <FolderOpen className="w-5 h-5" />
                  <div className="hidden lg:block overflow-hidden flex-1">
                    <div className="truncate font-bold text-[13px]">{c.name}</div>
                    {c.description && <div className="truncate text-[10px] text-on-surface-variant mt-0.5 font-normal normal-case opacity-70">{c.description}</div>}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      
      <ul className="flex flex-col gap-2 px-2 mt-auto pt-4 border-t border-outline-variant mx-4">
        <li>
          <a className="flex items-center gap-4 px-4 py-3 rounded-r-full text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all duration-200" href="#">
            <HelpCircle className="w-5 h-5" />
            <span className="hidden lg:block">Support</span>
          </a>
        </li>
        <li>
          <a className="flex items-center gap-4 px-4 py-3 rounded-r-full text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all duration-200" href="#">
            <LogOut className="w-5 h-5" />
            <span className="hidden lg:block">Logout</span>
          </a>
        </li>
      </ul>
    </nav>
  );
}
