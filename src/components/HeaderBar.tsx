/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Activity,
  CheckCircle2,
  Code2,
  FileCode,
  Play,
  Smartphone,
  Sparkles,
  Zap
} from 'lucide-react';
import { ActiveScreen } from '../types/desk';

interface HeaderBarProps {
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  dataMode: 'LIVE' | 'DEMO';
  hasUpstoxToken: boolean;
  onToggleDataMode: () => void;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
  onOpenTests: () => void;
  onOpenFlutterCode: () => void;
  freeMargin: number;
  netPnl: number;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeScreen,
  onNavigate,
  dataMode,
  hasUpstoxToken,
  onToggleDataMode,
  isMobileFrame,
  onToggleMobileFrame,
  onOpenTests,
  onOpenFlutterCode,
  freeMargin,
  netPnl
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 select-none">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onNavigate('home')}
          className="text-lg font-extrabold tracking-tight text-slate-100 whitespace-nowrap shrink-0 flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Zap className="w-4 h-4" />
          </div>
          <span>NSE Paper Desk</span>
        </button>

        {/* Mode Flag: DEMO vs LIVE */}
        <button
          onClick={onToggleDataMode}
          title="Click to toggle between LIVE (Upstox) and DEMO mode"
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1.5 font-mono ${
            dataMode === 'LIVE'
              ? hasUpstoxToken
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              dataMode === 'LIVE'
                ? hasUpstoxToken
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-rose-400'
                : 'bg-amber-400'
            }`}
          />
          <span>{dataMode === 'LIVE' ? (hasUpstoxToken ? 'LIVE · UPSTOX' : 'LIVE · NO TOKEN') : 'DEMO MODE'}</span>
        </button>
      </div>

      {/* Zone 2: 4–5 clean single-line text navigation links */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-400">
        <button
          onClick={() => onNavigate('home')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeScreen === 'home'
              ? 'text-indigo-400 font-bold border-b-2 border-indigo-500 pb-0.5'
              : 'hover:text-slate-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => onNavigate('scanner')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeScreen === 'scanner'
              ? 'text-indigo-400 font-bold border-b-2 border-indigo-500 pb-0.5'
              : 'hover:text-slate-200'
          }`}
        >
          Scanner
        </button>
        <button
          onClick={() => onNavigate('watchlist')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeScreen === 'watchlist'
              ? 'text-indigo-400 font-bold border-b-2 border-indigo-500 pb-0.5'
              : 'hover:text-slate-200'
          }`}
        >
          Watchlist
        </button>
        <button
          onClick={() => onNavigate('trade')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeScreen === 'trade'
              ? 'text-indigo-400 font-bold border-b-2 border-indigo-500 pb-0.5'
              : 'hover:text-slate-200'
          }`}
        >
          Trade Ticket
        </button>
        <button
          onClick={() => onNavigate('portfolio')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeScreen === 'portfolio'
              ? 'text-indigo-400 font-bold border-b-2 border-indigo-500 pb-0.5'
              : 'hover:text-slate-200'
          }`}
        >
          Portfolio
        </button>
        <button
          onClick={() => onNavigate('settings')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeScreen === 'settings'
              ? 'text-indigo-400 font-bold border-b-2 border-indigo-500 pb-0.5'
              : 'hover:text-slate-200'
          }`}
        >
          Settings
        </button>
      </nav>

      {/* Zone 3: Quick metrics & primary actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Free margin indicator */}
        <div className="hidden sm:flex items-center gap-3 pr-2 border-r border-slate-800 text-xs font-mono">
          <div>
            <span className="text-slate-400 font-sans mr-1">Free:</span>
            <span className="text-emerald-400 font-bold">
              ₹{freeMargin.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-sans mr-1">Net:</span>
            <span className={`font-bold ${netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netPnl >= 0 ? '+' : ''}₹{netPnl.toFixed(0)}
            </span>
          </div>
        </div>

        {/* APK / Mobile Frame Toggle */}
        <button
          onClick={onToggleMobileFrame}
          title="Toggle Android APK Phone Simulation Frame"
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            isMobileFrame
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{isMobileFrame ? 'APK Frame: ON' : 'APK Frame'}</span>
        </button>

        {/* Flutter Source Export */}
        <button
          onClick={onOpenFlutterCode}
          className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <FileCode className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Flutter Code</span>
        </button>

        {/* Acceptance Tests Button */}
        <button
          onClick={onOpenTests}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Acceptance Tests</span>
        </button>
      </div>
    </header>
  );
};
