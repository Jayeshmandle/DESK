/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Edit2,
  Info,
  Layers,
  Lock,
  PieChart,
  Save,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap
} from 'lucide-react';
import {
  ActiveScreen,
  AlertItem,
  PaperOrder,
  PaperTrade,
  SectorSummary,
  Settings,
  StockQuote
} from '../types/desk';
import { CheckpointItem, LockedOpeningBias, PortfolioRepository } from '../services/portfolioRepository';
import { MarketDataService } from '../services/marketDataService';
import { MarginService } from '../services/marginService';
import { OrderService } from '../services/orderService';

interface HomeScreenProps {
  settings: Settings;
  freeMargin: number;
  usedMargin: number;
  openTrades: PaperTrade[];
  pendingOrders: PaperOrder[];
  closedTrades: PaperTrade[];
  quotes: Map<string, StockQuote>;
  sectorSummaries: SectorSummary[];
  alerts: AlertItem[];
  onNavigate: (screen: ActiveScreen) => void;
  onTradeSymbol: (symbol: string) => void;
  onRefreshDb?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  settings,
  freeMargin,
  usedMargin,
  openTrades,
  pendingOrders,
  closedTrades,
  quotes,
  sectorSummaries,
  alerts,
  onNavigate,
  onTradeSymbol,
  onRefreshDb
}) => {
  const istStatus = MarketDataService.isMarketOpenIST(settings);

  // P&L Calculations
  const todayStr = new Date().toISOString().slice(0, 10);
  const realizedPnlToday = closedTrades
    .filter((t) => t.day === todayStr)
    .reduce((sum, t) => sum + (t.pnl || 0), 0);
  const unrealizedPnl = openTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const netPnlToday = realizedPnlToday + unrealizedPnl;

  // 1. OPENING BIAS (Locked)
  const [lockedBias, setLockedBias] = useState<LockedOpeningBias>(() =>
    PortfolioRepository.getOpeningBias()
  );

  // 4. CHECKPOINTS (09:35, 10:15, 12:00, 14:30)
  const [checkpoints, setCheckpoints] = useState<CheckpointItem[]>(() =>
    PortfolioRepository.getCheckpoints()
  );
  const [editingCheckpointTime, setEditingCheckpointTime] = useState<string | null>(null);
  const [checkpointNoteInput, setCheckpointNoteInput] = useState<string>('');

  // Secondary sector radar collapse state
  const [showRadar, setShowRadar] = useState<boolean>(false);
  const [quickOrderMsg, setQuickOrderMsg] = useState<string | null>(null);

  // Parse current IST hours and minutes for checkpoint active status and late-session note
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + istOffset);
  const istMinutes = istDate.getHours() * 60 + istDate.getMinutes();

  // Late session: after 14:00 IST (14 * 60 = 840 mins)
  const isAfter1400 = istMinutes >= 840;

  // 2. TRADE TODAY Panel: allowed stick sectors based on locked bias
  const tradeTodaySide = lockedBias.bias === 'BULLISH' ? 'LONG' : 'SHORT';

  const stickSectors = useMemo(() => {
    if (lockedBias.bias === 'BULLISH') {
      return [
        { name: 'Nifty Private Bank', note: 'Holding VWAP, leading breadth', momentum: '+0.95%' },
        { name: 'Nifty PSU Bank', note: 'Breakout continuation', momentum: '+1.40%' },
        { name: 'Nifty IT', note: 'Consolidating above 9 EMA', momentum: '+0.60%' },
        { name: 'Nifty FMCG', note: 'Defensive relative strength', momentum: '+0.35%' }
      ];
    } else {
      // BEARISH or NEUTRAL
      return [
        { name: 'Nifty Auto', note: 'Breaking below day open & 9 EMA', momentum: '-1.15%' },
        { name: 'Nifty Realty', note: 'Sharp rejection at session high', momentum: '-1.45%' },
        { name: 'Nifty Metal', note: 'Weak relative strength vs Nifty', momentum: '-0.85%' },
        { name: 'Nifty Energy', note: 'Losing session VWAP anchor', momentum: '-0.70%' }
      ];
    }
  }, [lockedBias.bias]);

  // 3. STRONG REVERSE Section (Sectors reversing against the open)
  const strongReversals = useMemo(() => [
    {
      dir: 'UP' as const,
      name: 'Nifty IT',
      since: '10:45',
      ageMin: 45,
      why: 'Reclaimed VWAP with expanding volume'
    },
    {
      dir: 'UP' as const,
      name: 'Nifty PSU Bank',
      since: '11:10',
      ageMin: 20,
      why: 'Breakout above opening range high'
    },
    {
      dir: 'DOWN' as const,
      name: 'Nifty FMCG',
      since: '12:05',
      ageMin: 15,
      why: 'Gave back open & breached 9 EMA'
    }
  ], []);

  // 5. BEST SETUP Card: One top setup aligned with bias
  const bestSetup = useMemo(() => {
    if (lockedBias.bias === 'BULLISH') {
      const entry = 1675.0;
      const sl = 1662.0;
      const target = 1701.0;
      const qty = 20;
      const margin = MarginService.calcMarginAlloc(qty, entry, settings.leverage);
      return {
        symbol: 'HDFCBANK',
        sector: 'Nifty Private Bank',
        side: 'BUY' as const,
        grade: 'A',
        score: 88,
        entry,
        sl,
        target,
        qty,
        marginAlloc: margin,
        reason: 'Clean pullback to 9 EMA (15m) in leading stick sector. Risk:Reward 1:2.0.'
      };
    } else {
      // BEARISH setup
      const entry = 975.0;
      const sl = 984.5;
      const target = 956.0;
      const qty = 30;
      const margin = MarginService.calcMarginAlloc(qty, entry, settings.leverage);
      return {
        symbol: 'TATAMOTORS',
        sector: 'Nifty Auto',
        side: 'SELL' as const,
        grade: 'A',
        score: 86,
        entry,
        sl,
        target,
        qty,
        marginAlloc: margin,
        reason: 'Failed retest of opening VWAP in weakest stick sector. Clean breakdown structure.'
      };
    }
  }, [lockedBias.bias, settings.leverage]);

  // Handle direct limit placement from Best Setup
  const handlePlaceBestSetup = () => {
    setQuickOrderMsg(null);
    const watchlistSymbols = PortfolioRepository.getWatchlist().map((w) => w.symbol);

    // Ensure symbol is on watchlist
    if (!watchlistSymbols.includes(bestSetup.symbol)) {
      PortfolioRepository.addToWatchlist(bestSetup.symbol);
    }

    const res = OrderService.placeLimitOrder({
      symbol: bestSetup.symbol,
      key: `NSE_EQ|${bestSetup.symbol}`,
      side: bestSetup.side,
      limit_price: bestSetup.entry,
      sl: bestSetup.sl,
      target: bestSetup.target,
      qty: bestSetup.qty,
      margin_alloc: bestSetup.marginAlloc,
      track_ema: { span: 9, tf: 15 },
      settings,
      openTrades,
      pendingOrders,
      closedTrades,
      watchlistSymbols: [...watchlistSymbols, bestSetup.symbol]
    });

    if (res.success) {
      setQuickOrderMsg(`✓ LIMIT PLACED: ${bestSetup.side} ${bestSetup.qty} ${bestSetup.symbol} @ ₹${bestSetup.entry}. Margin blocked.`);
      if (onRefreshDb) onRefreshDb();
    } else {
      setQuickOrderMsg(`✗ Order rejected: ${res.error}`);
    }
  };

  const handleSaveCheckpointNote = (time: string) => {
    const updated = checkpoints.map((c) =>
      c.time === time ? { ...c, notes: checkpointNoteInput } : c
    );
    PortfolioRepository.saveCheckpoints(updated);
    setCheckpoints(updated);
    setEditingCheckpointTime(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Risk Alert Banner if approaching or past loss limit */}
      {netPnlToday < -((settings.capital * settings.daily_loss_limit_pct) / 100 * 0.7) && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 flex items-center justify-between text-rose-300">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold">Risk Alert: Approaching Daily Loss Limit</div>
              <div className="text-xs text-rose-300/80">
                Current Net P&amp;L is -₹{Math.abs(netPnlToday).toLocaleString('en-IN')}. Daily max allowable loss is -₹
                {((settings.capital * settings.daily_loss_limit_pct) / 100).toLocaleString('en-IN')}.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-xs font-semibold rounded-lg text-white"
          >
            Review Risk Locks
          </button>
        </div>
      )}

      {/* Top Desk KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Equity / Capital */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Capital &amp; Equity</span>
            <PieChart className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            ₹{settings.capital.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span>Leverage:</span>
            <span className="font-mono text-slate-300 font-semibold">{settings.leverage}x</span>
          </div>
        </div>

        {/* Free Margin */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Free Margin</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            ₹{freeMargin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span>Used:</span>
            <span className="font-mono text-slate-300">
              ₹{usedMargin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Today's Net P&L */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Net P&amp;L Today</span>
            {netPnlToday >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              netPnlToday >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netPnlToday >= 0 ? '+' : ''}₹
            {netPnlToday.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>
              Realized:{' '}
              <span
                className={`font-mono ${
                  realizedPnlToday >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ₹{realizedPnlToday.toFixed(2)}
              </span>
            </span>
            <span>·</span>
            <span>
              Open:{' '}
              <span
                className={`font-mono ${
                  unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ₹{unrealizedPnl.toFixed(2)}
              </span>
            </span>
          </div>
        </div>

        {/* Market Session & Time */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>NSE Session</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-100 flex items-center gap-2">
            <span>{istStatus.istTimeStr}</span>
          </div>
          <div className="text-xs mt-2 flex items-center justify-between">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                istStatus.isOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {istStatus.isOpen ? 'LIVE SESSION (09:15–15:30)' : 'MARKET CLOSED'}
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          1. OPENING BIAS (LOCKED)
          Format: "Opening bias (locked HH:MM): Bearish/Bullish — live may differ intraday"
         ══════════════════════════════════════════════════════════ */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                lockedBias.bias === 'BULLISH'
                  ? 'bg-emerald-600 shadow-lg shadow-emerald-950/60'
                  : 'bg-rose-600 shadow-lg shadow-rose-950/60'
              }`}
            >
              {lockedBias.bias === 'BULLISH' ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>SESSION OPENING BIAS</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                  LOCKED {lockedBias.lockedTime} IST
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                Opening bias (locked {lockedBias.lockedTime}):{' '}
                <span
                  className={
                    lockedBias.bias === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'
                  }
                >
                  {lockedBias.bias}
                </span>{' '}
                <span className="text-xs text-slate-400 font-normal">— live may differ intraday</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center font-mono text-xs">
            <span className="text-slate-400">Index vs VWAP:</span>
            <span
              className={`font-bold ${
                lockedBias.indexVsVwapPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {lockedBias.indexVsVwapPct >= 0 ? '+' : ''}
              {lockedBias.indexVsVwapPct}%
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-300/90 leading-relaxed pl-1 sm:pl-13">
          {lockedBias.note}
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════
          2. TRADE TODAY PANEL & 5. BEST SETUP SPLIT
         ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: TRADE TODAY Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  TRADE TODAY · {tradeTodaySide} · {lockedBias.bias}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  <strong className="text-slate-300">Stick rule:</strong> Stick = trade this side only on these sectors — Buy dips / Sell rallies
                </p>
              </div>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded uppercase self-start sm:self-center ${
                  tradeTodaySide === 'LONG'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {tradeTodaySide} ONLY
              </span>
            </div>

            {/* Allowed Sectors (Stick List) */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Sectors (Stick List):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {stickSectors.map((sec) => (
                  <div
                    key={sec.name}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-200">{sec.name}</div>
                      <div className="text-[11px] text-slate-400">{sec.note}</div>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold ${
                        sec.momentum.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {sec.momentum}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Late Session Note (when after 14:00 IST) */}
            {isAfter1400 ? (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Late Session Rule (after 14:00 IST):</strong> Intraday square-off approaching. Avoid fresh breakout entries; tighten trailing stops.
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 italic">
                Active intraday session. Enforce risk locks &amp; trailing stops.
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════
              3. STRONG REVERSE SECTION
             ══════════════════════════════════════════════════════════ */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  STRONG REVERSE SECTORS
                </h2>
                <p className="text-xs text-slate-400">
                  Sectors with prominent intraday directional turns against the opening session
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {strongReversals.map((rev) => (
                <div
                  key={rev.name}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`font-mono font-extrabold text-[11px] px-1.5 py-0.5 rounded ${
                        rev.dir === 'UP'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {rev.dir === 'UP' ? 'Rev↑' : 'Rev↓'}
                    </span>
                    <span className="font-bold text-slate-200">{rev.name}</span>
                    <span className="text-slate-400 text-[11px]">
                      · since {rev.since} ({rev.ageMin}m ago)
                    </span>
                  </div>
                  <div className="text-slate-300 text-[11px] sm:text-right font-medium">
                    <span className="text-slate-400">Why: </span>
                    {rev.why}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: 5. BEST SETUP CARD & QUICK ORDER TICKET */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-slate-100">BEST SETUP (QUANT SELECTION)</h2>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                GRADE {bestSetup.grade} · {bestSetup.score}/100
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-extrabold text-slate-100 font-mono">
                    {bestSetup.symbol}
                  </div>
                  <div className="text-[11px] text-slate-400">{bestSetup.sector}</div>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded uppercase font-mono ${
                    bestSetup.side === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {bestSetup.side}
                </span>
              </div>

              {/* Price Ladders */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Entry Limit Price:</span>
                  <span className="text-slate-100 font-bold">₹{bestSetup.entry.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Stop-Loss (SL):</span>
                  <span className="text-rose-400 font-semibold">₹{bestSetup.sl.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Target (TP 2x):</span>
                  <span className="text-emerald-400 font-semibold">₹{bestSetup.target.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800/80 pt-1.5 text-[11px]">
                  <span className="text-slate-400 font-sans">Qty &amp; Margin Block:</span>
                  <span className="text-amber-400">
                    {bestSetup.qty} shares (₹{bestSetup.marginAlloc.toLocaleString('en-IN')})
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed italic">
                {bestSetup.reason}
              </p>

              {quickOrderMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-mono ${
                    quickOrderMsg.startsWith('✓')
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                  }`}
                >
                  {quickOrderMsg}
                </div>
              )}

              {/* Action Button: Place BUY/SELL Limit @ entry */}
              <button
                onClick={handlePlaceBestSetup}
                className={`w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 ${
                  bestSetup.side === 'BUY'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Place {bestSetup.side} limit @ ₹{bestSetup.entry.toFixed(2)}
              </button>

              <button
                onClick={() => onTradeSymbol(bestSetup.symbol)}
                className="w-full py-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors text-center"
              >
                Customize in Trade Ticket →
              </button>
            </div>
          </div>

          {/* Active Positions Quick Peek */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span>Open Positions ({openTrades.length})</span>
              <button
                onClick={() => onNavigate('portfolio')}
                className="text-indigo-400 hover:text-indigo-300 font-sans"
              >
                View All →
              </button>
            </div>
            {openTrades.length === 0 ? (
              <div className="text-xs text-slate-400 py-3 text-center">
                No active positions. Paper orders are user-initiated.
              </div>
            ) : (
              <div className="space-y-1.5">
                {openTrades.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between font-mono"
                  >
                    <span>
                      {t.symbol} ({t.side} {t.qty})
                    </span>
                    <span
                      className={`font-bold ${
                        (t.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {(t.pnl || 0) >= 0 ? '+' : ''}₹{(t.pnl || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          4. CHECKPOINTS SECTION (09:35, 10:15, 12:00, 14:30)
         ══════════════════════════════════════════════════════════ */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              INTRADAY CHECKPOINTS (09:35 · 10:15 · 12:00 · 14:30)
            </h2>
            <p className="text-xs text-slate-400">
              Sector breadth &amp; momentum checkpoints recorded throughout the trading session (persisted locally)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {checkpoints.map((cp) => {
            const [cpH, cpM] = cp.time.split(':').map(Number);
            const cpMinutes = cpH * 60 + cpM;
            const isPassed = istMinutes > cpMinutes;
            const isCurrent = Math.abs(istMinutes - cpMinutes) <= 25;

            return (
              <div
                key={cp.time}
                className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-colors ${
                  isCurrent
                    ? 'bg-indigo-950/30 border-indigo-500/50 ring-1 ring-indigo-500/30'
                    : isPassed
                    ? 'bg-slate-950 border-slate-800'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-base font-extrabold text-slate-100">
                      {cp.time} IST
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        isCurrent
                          ? 'bg-indigo-500/30 text-indigo-300 animate-pulse'
                          : isPassed
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {isCurrent ? 'ACTIVE SLOT' : isPassed ? 'PASSED' : 'UPCOMING'}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-300 mb-2">
                    {cp.label}
                  </div>

                  {editingCheckpointTime === cp.time ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={checkpointNoteInput}
                        onChange={(e) => setCheckpointNoteInput(e.target.value)}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-sans focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingCheckpointTime(null)}
                          className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveCheckpointNote(cp.time)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 leading-relaxed min-h-[40px]">
                      {cp.notes}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1">
                  <div className="truncate text-slate-400">
                    <span className="text-emerald-400 font-semibold">Lead: </span>
                    {cp.leaders}
                  </div>
                  <div className="truncate text-slate-400">
                    <span className="text-rose-400 font-semibold">Lag: </span>
                    {cp.laggards}
                  </div>
                  {editingCheckpointTime !== cp.time && (
                    <button
                      onClick={() => {
                        setEditingCheckpointTime(cp.time);
                        setCheckpointNoteInput(cp.notes);
                      }}
                      className="text-[10px] text-indigo-400 hover:underline pt-1 flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Note
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          6. SECONDARY SECTOR RADAR (COLLAPSIBLE)
         ══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div
          onClick={() => setShowRadar(!showRadar)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors select-none"
        >
          <div>
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              Secondary Sector Radar ({sectorSummaries.length} Indices)
            </h2>
            <p className="text-xs text-slate-400">
              Broad market index performance matrix (secondary to bias desk)
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
            <span>{showRadar ? 'Collapse' : 'Expand Radar'}</span>
            {showRadar ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {showRadar && (
          <div className="p-4 pt-0 border-t border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              {sectorSummaries.map((sec) => (
                <div
                  key={sec.name}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <span className="text-xs font-semibold text-slate-200">{sec.name}</span>
                  <span
                    className={`font-mono text-xs font-bold ${
                      sec.avgChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {sec.avgChangePct >= 0 ? '+' : ''}
                    {sec.avgChangePct.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Alerts Feed */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          Terminal Execution &amp; Rule Audit Log
        </div>
        <div className="space-y-1.5 max-h-32 overflow-y-auto font-mono text-xs text-slate-300">
          {alerts.slice(0, 5).map((a) => (
            <div
              key={a.id}
              className="py-1 border-b border-slate-800/60 last:border-0 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 truncate pr-4">
                <span className="text-slate-400 text-[11px]">{a.ts}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-sans ${
                    a.kind === 'FILL'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : a.kind === 'SL_HIT' || a.kind === 'ERROR'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {a.kind}
                </span>
                <span className="truncate">{a.msg}</span>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="text-xs text-slate-400 py-1 font-sans">
              No executions yet today. Paper trades are user-initiated only.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
