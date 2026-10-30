/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Lock,
  Play,
  Shield,
  Zap
} from 'lucide-react';
import { MarketDataService } from '../services/marketDataService';
import { Settings } from '../types/desk';

interface ConnectUpstoxScreenProps {
  settings: Settings;
  onConnectToken: (token: string) => void;
  onEnableDemoMode: () => void;
  onOpenTests: () => void;
}

export const ConnectUpstoxScreen: React.FC<ConnectUpstoxScreenProps> = ({
  settings,
  onConnectToken,
  onEnableDemoMode,
  onOpenTests
}) => {
  const [tokenInput, setTokenInput] = useState<string>(settings.upstox_token || '');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid Upstox v2 access token' });
      return;
    }

    setIsVerifying(true);
    setStatusMsg(null);

    const test = await MarketDataService.testUpstoxToken(tokenInput);
    setIsVerifying(false);

    if (test.success) {
      setStatusMsg({ type: 'success', text: test.message });
      setTimeout(() => {
        onConnectToken(tokenInput.trim());
      }, 500);
    } else {
      setStatusMsg({ type: 'error', text: test.message });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Brand & Badge */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-1">
            <Key className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Connect Upstox API v2
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Per strict execution rules, simulated market feeds are disabled in LIVE mode. A valid Upstox access token is required to stream real NSE quotes, EMAs, and portfolio fills.
          </p>
        </div>

        {/* Mode Tag */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-semibold text-slate-300">Desk Status:</span>
            <span className="text-amber-400 font-mono">Awaiting Credentials (LIVE Mode)</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            Zero Mock Data
          </span>
        </div>

        {/* Token Input Form */}
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Upstox Access Token (Bearer)
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="Paste your daily Upstox API v2 access token..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMsg.type === 'error'
                  ? 'bg-rose-950/40 border border-rose-800/80 text-rose-300'
                  : 'bg-emerald-950/40 border border-emerald-800/80 text-emerald-300'
              }`}
            >
              {statusMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 disabled:opacity-50"
          >
            {isVerifying ? (
              <span>Verifying Token...</span>
            ) : (
              <>
                <span>Connect &amp; Start Trading</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Step-by-step instructions */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs">
          <div className="font-semibold text-slate-300 flex items-center justify-between">
            <span>How to get your Upstox access token:</span>
            <a
              href="https://developer.upstox.com"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
            >
              developer.upstox.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
            <li>Log in to the Upstox Developer Console.</li>
            <li>Create an app or select an existing one with Market Data scopes.</li>
            <li>Generate your daily access token under the app details.</li>
            <li>Paste the Bearer token above and connect.</li>
          </ol>
        </div>

        {/* Fallback to Demo Mode (Rule 3 & 4) */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 text-center sm:text-left">
            <span>Don&apos;t have an Upstox developer account right now?</span>
          </div>
          <button
            onClick={onEnableDemoMode}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5"
          >
            <Play className="w-3 h-3 text-amber-400" />
            Switch to Demo Mode (Sample Data)
          </button>
        </div>

        {/* Acceptance Tests Runner Link */}
        <div className="text-center pt-1">
          <button
            onClick={onOpenTests}
            className="text-[11px] text-slate-400 hover:text-slate-300 underline font-mono"
          >
            Run Section 12 Acceptance Tests Suite (Offline Assertions) →
          </button>
        </div>
      </div>
    </div>
  );
};
