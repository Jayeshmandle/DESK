/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Zap
} from 'lucide-react';
import { SECTOR_STOCKS_MAP } from '../data/sectors';
import { StockQuote, WatchlistItem } from '../types/desk';

interface ScannerScreenProps {
  quotes: Map<string, StockQuote>;
  watchlist: WatchlistItem[];
  onAddToWatchlist: (symbol: string) => void;
  onTradeSymbol: (symbol: string) => void;
}

export const ScannerScreen: React.FC<ScannerScreenProps> = ({
  quotes,
  watchlist,
  onAddToWatchlist,
  onTradeSymbol
}) => {
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [sortBy, setSortBy] = useState<'score' | 'rs' | 'rvol' | 'change_pct' | 'ltp'>('score');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const sectorNames = useMemo(() => ['All', ...Object.keys(SECTOR_STOCKS_MAP)], []);

  const filteredQuotes = useMemo(() => {
    let list = Array.from(quotes.values());

    if (selectedSector !== 'All') {
      const symbolsInSector = SECTOR_STOCKS_MAP[selectedSector] || [];
      list = list.filter((q) => symbolsInSector.includes(q.symbol));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) => item.symbol.toLowerCase().includes(q) || item.sector.toLowerCase().includes(q)
      );
    }

    if (gradeFilter !== 'ALL') {
      list = list.filter((item) => item.grade === gradeFilter);
    }

    return list.sort((a, b) => {
      let valA = a[sortBy] ?? 0;
      let valB = b[sortBy] ?? 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [quotes, selectedSector, searchQuery, gradeFilter, sortBy, sortAsc]);

  const watchlistSymbolSet = useMemo(
    () => new Set(watchlist.map((w) => w.symbol)),
    [watchlist]
  );

  const handleSort = (field: 'score' | 'rs' | 'rvol' | 'change_pct' | 'ltp') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Top Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              NSE Sector Scanner &amp; Quant Matrix
            </h2>
            <p className="text-xs text-slate-400">
              Filtered across {filteredQuotes.length} stocks · Live Relative Strength (RS), RVOL, &amp; Momentum Grades
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search symbol or sector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 w-48 md:w-60"
              />
            </div>

            {/* Grade Segmented Control */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
              {(['ALL', 'A', 'B', 'C'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGradeFilter(g)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    gradeFilter === g
                      ? 'bg-slate-800 text-slate-100 shadow-xs'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {g === 'ALL' ? 'All' : `Grade ${g}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sector Quick Filter Horizontal Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          {sectorNames.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              className={`px-3 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors ${
                selectedSector === sec
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* High-Density Scanner Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider select-none">
                <th className="py-3 px-4">Symbol / Sector</th>
                <th
                  onClick={() => handleSort('ltp')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>LTP (₹)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('change_pct')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Day Chg %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('rs')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>RS vs Sector</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('rvol')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>RVOL</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">VWAP Dist %</th>
                <th className="py-3 px-3 text-right">9 EMA (15m)</th>
                <th
                  onClick={() => handleSort('score')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Score &amp; Grade</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredQuotes.map((q) => {
                const inWatchlist = watchlistSymbolSet.has(q.symbol);
                const vwapDist = Math.round(((q.ltp - q.vwap) / q.vwap) * 10000) / 100;

                return (
                  <tr
                    key={q.symbol}
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

                    <td className="py-3 px-3 text-right font-semibold text-slate-100">
                      ₹{q.ltp.toFixed(2)}
                    </td>

                    <td
                      className={`py-3 px-3 text-right font-semibold ${
                        q.change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {q.change_pct >= 0 ? '+' : ''}
                      {q.change_pct.toFixed(2)}%
                    </td>

                    <td
                      className={`py-3 px-3 text-right font-semibold ${
                        q.rs >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {q.rs >= 0 ? '+' : ''}
                      {q.rs.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right text-slate-300">
                      <span
                        className={
                          q.rvol >= 1.5
                            ? 'text-amber-400 font-bold'
                            : q.rvol >= 1.0
                            ? 'text-slate-200'
                            : 'text-slate-400'
                        }
                      >
                        {q.rvol.toFixed(2)}x
                      </span>
                    </td>

                    <td
                      className={`py-3 px-3 text-right ${
                        vwapDist >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {vwapDist >= 0 ? '+' : ''}
                      {vwapDist.toFixed(2)}%
                    </td>

                    <td className="py-3 px-3 text-right text-cyan-400">
                      ₹{q.ema9_15m ? q.ema9_15m.toFixed(2) : '-'}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-slate-200 font-bold">{q.score}</span>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded font-sans uppercase ${
                            q.grade === 'A'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : q.grade === 'B'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {q.grade}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onAddToWatchlist(q.symbol)}
                          title={inWatchlist ? 'Already on watchlist' : 'Add to Watchlist'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            inWatchlist
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {inWatchlist ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onTradeSymbol(q.symbol)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <Zap className="w-3 h-3" />
                          Trade
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    No market quotes available. Enter your Upstox access token in Settings, or switch to Demo mode to preview sample matrix.
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
