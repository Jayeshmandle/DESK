/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Check,
  Clock,
  Key,
  RotateCcw,
  Save,
  Shield,
  Sliders,
  SlidersHorizontal,
  Wallet
} from 'lucide-react';
import { Settings } from '../types/desk';
import { DEFAULT_SETTINGS, PortfolioRepository } from '../services/portfolioRepository';

interface SettingsScreenProps {
  settings: Settings;
  onUpdateSettings: (newSettings: Settings) => void;
  onResetDb: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onResetDb
}) => {
  const [formData, setFormData] = useState<Settings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [resetConfirm, setResetConfirm] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    PortfolioRepository.saveSettings(formData);
    onUpdateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetToDefaults = () => {
    setFormData({ ...DEFAULT_SETTINGS });
    PortfolioRepository.saveSettings({ ...DEFAULT_SETTINGS });
    onUpdateSettings({ ...DEFAULT_SETTINGS });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Desk Configuration &amp; Risk Parameters
          </h2>
          <p className="text-xs text-slate-400">
            Account capital, leverage, sizing formulas, risk locks &amp; Upstox credentials
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
        >
          {savedSuccess ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Save Settings
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Capital & Leverage */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100 pb-2 border-b border-slate-800">
            <Wallet className="w-4 h-4 text-indigo-400" />
            Capital &amp; Sizing Mode
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Account Capital / Equity (₹)
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={formData.capital}
                onChange={(e) =>
                  setFormData({ ...formData, capital: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400">Spec default: ₹5,00,000</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Intraday Leverage (x)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                step="0.5"
                value={formData.leverage}
                onChange={(e) =>
                  setFormData({ ...formData, leverage: parseFloat(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400">Spec default: 5.0x leverage</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Position Sizing Formula Mode
              </label>
              <select
                value={formData.sizing_mode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sizing_mode: e.target.value as 'margin' | 'risk'
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="margin">Margin Mode (capped by margin_per_trade)</option>
                <option value="risk">Risk Mode (capped by risk_pct of equity)</option>
              </select>
              <span className="text-[10px] text-slate-400">Spec default: margin mode</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Margin Per Trade (₹) [When sizing_mode == margin]
              </label>
              <input
                type="number"
                min="5000"
                step="1000"
                value={formData.margin_per_trade}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    margin_per_trade: parseFloat(e.target.value) || 0
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400">Spec default: ₹30,000</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Risk % Per Trade [When sizing_mode == risk]
              </label>
              <input
                type="number"
                min="0.1"
                max="5.0"
                step="0.1"
                value={formData.risk_pct}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    risk_pct: parseFloat(e.target.value) || 1.0
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400">Spec default: 1.0%</span>
            </div>
          </div>
        </div>

        {/* Section 2: Trade Execution & Risk/Reward */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100 pb-2 border-b border-slate-800">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            Trade Rules &amp; Multipliers
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Risk-to-Reward Multiplier (rr_mult)
              </label>
              <input
                type="number"
                min="1.0"
                max="5.0"
                step="0.1"
                value={formData.rr_mult}
                onChange={(e) =>
                  setFormData({ ...formData, rr_mult: parseFloat(e.target.value) || 2.0 })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400">
                Formula: target = entry ± rr_mult * |entry - sl| (Default: 2.0x)
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Fallback SL % (if no manual SL given)
              </label>
              <input
                type="number"
                min="0.1"
                max="5.0"
                step="0.1"
                value={formData.fallback_sl_pct}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fallback_sl_pct: parseFloat(e.target.value) || 0.5
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400">Spec default: 0.5%</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Auto-Refresh Interval (seconds)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                step="1"
                value={formData.auto_refresh_sec}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    auto_refresh_sec: parseInt(e.target.value) || 2
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400">Spec default: 2 seconds</span>
            </div>
          </div>
        </div>

        {/* Section 3: Risk Locks & Session Gates */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100 pb-2 border-b border-slate-800">
            <Shield className="w-4 h-4 text-rose-400" />
            Risk Locks &amp; Market Session Gates
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Daily Loss Limit (%)
              </label>
              <input
                type="number"
                min="0.5"
                max="10"
                step="0.5"
                value={formData.daily_loss_limit_pct}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    daily_loss_limit_pct: parseFloat(e.target.value) || 3.0
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-rose-500"
              />
              <span className="text-[10px] text-slate-400">
                Blocks trading if loss hits -₹{((formData.capital * formData.daily_loss_limit_pct) / 100).toLocaleString('en-IN')} (3.0%)
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Max Drawdown (%)
              </label>
              <input
                type="number"
                min="1.0"
                max="20"
                step="0.5"
                value={formData.max_drawdown_pct}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_drawdown_pct: parseFloat(e.target.value) || 6.0
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-rose-500"
              />
              <span className="text-[10px] text-slate-400">Spec default: 6.0%</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Max Daily Trades
              </label>
              <input
                type="number"
                min="1"
                max="50"
                step="1"
                value={formData.max_trades_day}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_trades_day: parseInt(e.target.value) || 10
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-rose-500"
              />
              <span className="text-[10px] text-slate-400">Spec default: 10 trades</span>
            </div>
          </div>

          {/* Market Hours Enforcement Toggle & Testing Simulation Switch */}
          <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Enforce IST Market Hours (09:15–15:30)
                </div>
                <div className="text-[11px] text-slate-400">
                  Reject market orders placed outside normal NSE trading session
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.enforce_market_hours}
                onChange={(e) =>
                  setFormData({ ...formData, enforce_market_hours: e.target.checked })
                }
                className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </div>

            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-cyan-400">
                  Simulate Market Open (Off-Hours Testing)
                </div>
                <div className="text-[11px] text-slate-400">
                  Force open gate so you can test orders anytime on weekends or night
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.market_hours_simulated_open || false}
                onChange={(e) =>
                  setFormData({ ...formData, market_hours_simulated_open: e.target.checked })
                }
                className="w-4 h-4 rounded text-cyan-600 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Data Mode & Upstox API Configuration */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100 pb-2 border-b border-slate-800">
            <Key className="w-4 h-4 text-amber-400" />
            Market Data Mode &amp; Upstox API v2
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Data Mode Flag (Rule 3 &amp; 4: Default = LIVE)
              </label>
              <select
                value={formData.data_mode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    data_mode: e.target.value as 'LIVE' | 'DEMO'
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="LIVE">LIVE Mode (Upstox v2 API Only — No Mock Prices)</option>
                <option value="DEMO">DEMO Mode (Offline Sample Data)</option>
              </select>
              <span className="text-[10px] text-slate-400">
                In LIVE mode, the app requires a valid Upstox token and never generates fake quotes.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Upstox v2 Access Token
              </label>
              <input
                type="password"
                placeholder="Paste your Upstox API access token..."
                value={formData.upstox_token}
                onChange={(e) =>
                  setFormData({ ...formData, upstox_token: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-400">
                Required for LIVE mode. If missing, Connect Upstox screen is presented.
              </span>
            </div>
          </div>
        </div>

        {/* Reset & Factory Defaults */}
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-200">Reset Local Database</div>
            <div className="text-[11px] text-slate-400">
              Clear all paper orders, trades, journal history, and restore initial capital ₹5,00,000.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
            >
              Reset Settings
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset ALL paper trading data to factory defaults?')) {
                  onResetDb();
                }
              }}
              className="px-3 py-2 bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900 text-xs font-bold rounded-lg transition-colors"
            >
              Factory Reset DB
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
