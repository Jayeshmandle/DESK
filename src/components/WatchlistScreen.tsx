/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Zap
} from 'lucide-react';
import { StockQuote, WatchlistItem } from '../types/desk';

interface WatchlistScreenProps {
  watchlist: WatchlistItem[];
  quotes: Map<string, StockQuote>;
  onRemoveFromWatchlist: (symbol: string) => void;
  onAddToWatchlist: (symbol: string) => void;
  onTradeSymbol: (symbol: string) => void;
}

export const WatchlistScreen: React.FC<WatchlistScreenProps> = ({
  watchlist,
  quotes,
  onRemoveFromWatchlist,
  onAddToWatchlist,
  onTradeSymbol
}) => {
  const [newSymbolInput, setNewSymbolInput] = useState<string>('');
  const [filterQuery, setFilterQuery] = useState<string>('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbolInput.trim()) return;
    const sym = newSymbolInput.toUpperCase().trim();
    onAddToWatchlist(sym);
    setNewSymbolInput('');
  };

  const filteredWatchlist = watchlist.filter((w) =>
    w.symbol.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Top Header & Quick Add */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Watchlist ({watchlist.length} Symbols)
          </h2>
          <p className="text-xs text-slate-400">
            Real-time Upstox/NSE quotes, sparklines &amp; multi-timeframe EMAs
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter existing */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter list..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 w-36 md:w-44"
            />
          </div>

          {/* Quick Add Symbol */}
          <form onSubmit={handleAdd} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Add symbol (e.g. HAL)..."
              value={newSymbolInput}
              onChange={(e) => setNewSymbolInput(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 uppercase placeholder:text-slate-400 placeholder:normal-case focus:outline-none focus:border-emerald-500 w-36 md:w-48 font-mono"
            />
            <button
              type="submit"
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
              title="Add to Watchlist"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Watchlist Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider select-none">
                <th className="py-3 px-4">Symbol / Sector</th>
                <th className="py-3 px-3 text-right">LTP (₹)</th>
                <th className="py-3 px-3 text-right">Change</th>
                <th className="py-3 px-3 text-right">Day High / Low</th>
                <th className="py-3 px-3 text-right">5m EMAs (5/9)</th>
                <th className="py-3 px-3 text-right">15m EMAs (5/9)</th>
                <th className="py-3 px-3 text-center">Trend (30m)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredWatchlist.map((item) => {
                const q = quotes.get(item.symbol);
                if (!q) {
                  return (
                    <tr key={item.symbol} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-sans font-bold text-slate-200">
                        {item.symbol}
                      </td>
                      <td colSpan={6} className="py-3 px-3 text-slate-400 italic">
                        Connecting market feed...
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onRemoveFromWatchlist(item.symbol)}
                          className="p-1 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                }

                const isPositive = q.change >= 0;

                return (
                  <tr
                    key={item.symbol}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-sans font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{q.symbol}</span>
                      </div>
                      <div className="font-sans text-[11px] text-slate-400">
                        {q.sector}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-slate-100 text-sm">
                      ₹{q.ltp.toFixed(2)}
                    </td>

                    <td
                      className={`py-3 px-3 text-right font-semibold ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {isPositive ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isPositive ? '+' : ''}
                          {q.change.toFixed(2)} ({isPositive ? '+' : ''}
                          {q.change_pct.toFixed(2)}%)
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right text-slate-300 text-[11px]">
                      <div>H: ₹{q.high.toFixed(2)}</div>
                      <div className="text-slate-400">L: ₹{q.low.toFixed(2)}</div>
                    </td>

                    <td className="py-3 px-3 text-right text-xs">
                      <div className="text-amber-400">
                        5EMA: ₹{q.ema5_5m ? q.ema5_5m.toFixed(2) : '-'}
                      </div>
                      <div className="text-cyan-400 text-[11px]">
                        9EMA: ₹{q.ema9_5m ? q.ema9_5m.toFixed(2) : '-'}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right text-xs">
                      <div className="text-amber-400">
                        5EMA: ₹{q.ema5_15m ? q.ema5_15m.toFixed(2) : '-'}
                      </div>
                      <div className="text-cyan-400 text-[11px]">
                        9EMA: ₹{q.ema9_15m ? q.ema9_15m.toFixed(2) : '-'}
                      </div>
                    </td>

                    {/* Mini Sparkline */}
                    <td className="py-3 px-3 text-center">
                      <div className="w-24 h-6 inline-flex items-center justify-center">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 24">
                          {q.sparkline && q.sparkline.length > 1 && (
                            (() => {
                              const min = Math.min(...q.sparkline);
                              const max = Math.max(...q.sparkline);
                              const range = max - min || 1;
                              const points = q.sparkline
                                .map((val, idx) => {
                                  const x = (idx / (q.sparkline.length - 1)) * 100;
                                  const y = 24 - ((val - min) / range) * 20 - 2;
                                  return `${x},${y}`;
                                })
                                .join(' ');

                              return (
                                <polyline
                                  fill="none"
                                  stroke={isPositive ? '#10b981' : '#f43f5e'}
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={points}
                                />
                              );
                            })()
                          )}
                        </svg>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onTradeSymbol(q.symbol)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <Zap className="w-3 h-3" />
                          Trade
                        </button>
                        <button
                          onClick={() => onRemoveFromWatchlist(q.symbol)}
                          title="Remove from watchlist"
                          className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredWatchlist.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    No symbols found in watchlist. Add one above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
