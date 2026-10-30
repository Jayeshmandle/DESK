/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  CheckCircle2,
  Lock,
  RefreshCw,
  Sliders,
  TrendingDown,
  TrendingUp,
  Zap
} from 'lucide-react';
import { EmaService } from '../services/emaService';
import { MarginService } from '../services/marginService';
import { MarketDataService } from '../services/marketDataService';
import { OrderService } from '../services/orderService';
import {
  OrderSide,
  OrderType,
  PaperOrder,
  PaperTrade,
  Settings,
  StockQuote,
  WatchlistItem
} from '../types/desk';

type EmaSource = 'manual' | 'ema5_5m' | 'ema5_15m' | 'ema9_5m' | 'ema9_15m';

interface TradeScreenProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  quotes: Map<string, StockQuote>;
  watchlist: WatchlistItem[];
  settings: Settings;
  freeMargin: number;
  openTrades: PaperTrade[];
  pendingOrders: PaperOrder[];
  closedTrades: PaperTrade[];
  onOrderPlaced: () => void;
  onAddToWatchlist: (symbol: string) => void;
}

export const TradeScreen: React.FC<TradeScreenProps> = ({
  selectedSymbol,
  onSelectSymbol,
  quotes,
  watchlist,
  settings,
  freeMargin,
  openTrades,
  pendingOrders,
  closedTrades,
  onOrderPlaced,
  onAddToWatchlist
}) => {
  const currentQuote = quotes.get(selectedSymbol) || Array.from(quotes.values())[0];
  const activeSymbol = currentQuote ? currentQuote.symbol : selectedSymbol;

  const [side, setSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('LIMIT');
  const [emaSource, setEmaSource] = useState<EmaSource>('manual');
  const [autoRefreshEma, setAutoRefreshEma] = useState<boolean>(true);

  // Form inputs
  const [limitPrice, setLimitPrice] = useState<number>(currentQuote ? currentQuote.ltp : 1000);
  const [sl, setSl] = useState<number>(0);
  const [target, setTarget] = useState<number>(0);
  const [qty, setQty] = useState<number>(10);
  const [manualQtyOverride, setManualQtyOverride] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');

  const watchlistSymbolList = useMemo(() => watchlist.map((w) => w.symbol), [watchlist]);
  const isSymbolInWatchlist = watchlistSymbolList.includes(activeSymbol);
  const hasExistingOpen = openTrades.some(
    (t) => t.symbol === activeSymbol && t.status === 'OPEN'
  );

  // Current entry price depending on order type
  const entryPrice = orderType === 'MARKET' ? (currentQuote ? currentQuote.ltp : 0) : limitPrice;

  // Compute live EMA value based on selection
  const liveSelectedEma = useMemo(() => {
    if (!currentQuote) return null;
    switch (emaSource) {
      case 'ema5_5m':
        return currentQuote.ema5_5m;
      case 'ema5_15m':
        return currentQuote.ema5_15m;
      case 'ema9_5m':
        return currentQuote.ema9_5m;
      case 'ema9_15m':
        return currentQuote.ema9_15m;
      default:
        return null;
    }
  }, [currentQuote, emaSource]);

  // Handle EMA selection changes
  useEffect(() => {
    if (emaSource !== 'manual' && liveSelectedEma !== null && liveSelectedEma > 0) {
      if (autoRefreshEma || limitPrice === 0) {
        setLimitPrice(liveSelectedEma);
      }
    }
  }, [liveSelectedEma, emaSource, autoRefreshEma]);

  // When symbol or side changes, auto-calculate sensible SL and Target
  useEffect(() => {
    if (currentQuote && entryPrice > 0) {
      const fallbackSlDiff = (entryPrice * settings.fallback_sl_pct) / 100;
      let newSl = 0;
      let newTarget = 0;

      if (side === 'BUY') {
        newSl = Math.round((entryPrice - fallbackSlDiff) * 100) / 100;
        newTarget =
          Math.round((entryPrice + fallbackSlDiff * settings.rr_mult) * 100) / 100;
      } else {
        newSl = Math.round((entryPrice + fallbackSlDiff) * 100) / 100;
        newTarget =
          Math.round((entryPrice - fallbackSlDiff * settings.rr_mult) * 100) / 100;
      }

      setSl(newSl);
      setTarget(newTarget);
    }
  }, [activeSymbol, side, orderType]);

  // Position Sizing calculation
  const sizeCalc = useMemo(() => {
    return MarginService.calculateSize({
      price: entryPrice,
      sl,
      sizing_mode: settings.sizing_mode,
      capital: settings.capital,
      free_margin: freeMargin,
      leverage: settings.leverage,
      margin_per_trade: settings.margin_per_trade,
      risk_pct: settings.risk_pct,
      fallback_sl_pct: settings.fallback_sl_pct
    });
  }, [entryPrice, sl, settings, freeMargin]);

  // Keep qty synced with sizing calculation unless manually altered
  useEffect(() => {
    if (!manualQtyOverride && sizeCalc.qty > 0) {
      setQty(sizeCalc.qty);
    }
  }, [sizeCalc.qty, manualQtyOverride]);

  // Margin required for current qty
  const marginAlloc = useMemo(() => {
    return MarginService.calcMarginAlloc(qty, entryPrice, settings.leverage);
  }, [qty, entryPrice, settings.leverage]);

  // RR calculations
  const riskPerShare = Math.abs(entryPrice - sl);
  const rewardPerShare = Math.abs(target - entryPrice);
  const totalRiskAmt = Math.round(riskPerShare * qty * 100) / 100;
  const totalRewardAmt = Math.round(rewardPerShare * qty * 100) / 100;
  const rrRatio = riskPerShare > 0 ? (rewardPerShare / riskPerShare).toFixed(2) : '0';

  // Order submission
  const handlePlaceOrder = () => {
    setValidationError('');

    let trackEmaParam: { span: number; tf: number } | undefined = undefined;
    if (emaSource !== 'manual') {
      if (emaSource === 'ema5_5m') trackEmaParam = { span: 5, tf: 5 };
      else if (emaSource === 'ema5_15m') trackEmaParam = { span: 5, tf: 15 };
      else if (emaSource === 'ema9_5m') trackEmaParam = { span: 9, tf: 5 };
      else if (emaSource === 'ema9_15m') trackEmaParam = { span: 9, tf: 15 };
    }

    if (orderType === 'MARKET') {
      const res = OrderService.placeMarketOrder({
        symbol: activeSymbol,
        key: currentQuote ? currentQuote.instrument_key : `NSE_EQ|${activeSymbol}`,
        side,
        price: entryPrice,
        sl,
        target,
        qty,
        margin_alloc: marginAlloc,
        settings,
        openTrades,
        pendingOrders,
        closedTrades,
        watchlistSymbols: watchlistSymbolList
      });

      if (!res.success) {
        setValidationError(res.error || 'Market order failed');
      } else {
        onOrderPlaced();
      }
    } else {
      // LIMIT order
      const res = OrderService.placeLimitOrder({
        symbol: activeSymbol,
        key: currentQuote ? currentQuote.instrument_key : `NSE_EQ|${activeSymbol}`,
        side,
        limit_price: limitPrice,
        sl,
        target,
        qty,
        margin_alloc: marginAlloc,
        track_ema: trackEmaParam,
        settings,
        openTrades,
        pendingOrders,
        closedTrades,
        watchlistSymbols: watchlistSymbolList
      });

      if (!res.success) {
        setValidationError(res.error || 'Limit order failed');
      } else {
        onOrderPlaced();
      }
    }
  };

  const istCheck = MarketDataService.isMarketOpenIST(settings);

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      {/* Symbol Selection Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Active Instrument
            </label>
            <select
              value={activeSymbol}
              onChange={(e) => onSelectSymbol(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {Array.from(quotes.values()).map((q) => (
                <option key={q.symbol} value={q.symbol}>
                  {q.symbol} (₹{q.ltp.toFixed(2)}) · {q.sector}
                </option>
              ))}
            </select>
          </div>

          {!isSymbolInWatchlist && (
            <div className="pt-5">
              <button
                onClick={() => onAddToWatchlist(activeSymbol)}
                className="px-2.5 py-1.5 bg-amber-600/20 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-semibold hover:bg-amber-600/30 transition-colors"
              >
                + Add {activeSymbol} to Watchlist (Required to Trade)
              </button>
            </div>
          )}
        </div>

        {/* Live LTP & Metrics */}
        {currentQuote && (
          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-xl font-bold font-mono text-slate-100">
                ₹{currentQuote.ltp.toFixed(2)}
              </div>
              <div
                className={`text-xs font-mono font-semibold ${
                  currentQuote.change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {currentQuote.change_pct >= 0 ? '+' : ''}
                {currentQuote.change.toFixed(2)} ({currentQuote.change_pct >= 0 ? '+' : ''}
                {currentQuote.change_pct.toFixed(2)}%)
              </div>
            </div>

            <div className="hidden sm:block border-l border-slate-800 pl-4 text-left text-xs font-mono">
              <div className="text-slate-400">
                5m 9EMA:{' '}
                <span className="text-cyan-400">
                  ₹{currentQuote.ema9_5m ? currentQuote.ema9_5m.toFixed(2) : '-'}
                </span>
              </div>
              <div className="text-slate-400">
                15m 9EMA:{' '}
                <span className="text-cyan-400">
                  ₹{currentQuote.ema9_15m ? currentQuote.ema9_15m.toFixed(2) : '-'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Order Ticket Card */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        {/* BUY / SELL Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 border-b border-slate-800 gap-1.5">
          <button
            onClick={() => setSide('BUY')}
            className={`py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              side === 'BUY'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            BUY (LONG)
          </button>
          <button
            onClick={() => setSide('SELL')}
            className={`py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              side === 'SELL'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            SELL (SHORT)
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Type: MARKET vs LIMIT */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300">Order Execution Type</span>
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setOrderType('MARKET')}
                className={`px-4 py-1.5 rounded-md font-semibold transition-colors ${
                  orderType === 'MARKET'
                    ? 'bg-slate-800 text-slate-100 shadow-xs'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                MARKET (LTP)
              </button>
              <button
                onClick={() => setOrderType('LIMIT')}
                className={`px-4 py-1.5 rounded-md font-semibold transition-colors ${
                  orderType === 'LIMIT'
                    ? 'bg-slate-800 text-slate-100 shadow-xs'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                LIMIT
              </button>
            </div>
          </div>

          {/* Section 6: Entry Source from EMA */}
          {orderType === 'LIMIT' && (
            <div className="space-y-2 pb-4 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Entry Source (TradingView EMA Reference)
                </span>
                {emaSource !== 'manual' && (
                  <button
                    onClick={() => setAutoRefreshEma(!autoRefreshEma)}
                    className={`flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded transition-colors ${
                      autoRefreshEma
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${autoRefreshEma ? 'animate-spin' : ''}`} />
                    Auto-refresh: {autoRefreshEma ? 'ON' : 'OFF'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <button
                  onClick={() => setEmaSource('manual')}
                  className={`py-2 px-2.5 rounded-lg border text-center font-medium transition-colors ${
                    emaSource === 'manual'
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Manual
                </button>
                <button
                  onClick={() => setEmaSource('ema5_5m')}
                  className={`py-2 px-2 rounded-lg border text-center font-medium transition-colors ${
                    emaSource === 'ema5_5m'
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  5 EMA · 5m
                </button>
                <button
                  onClick={() => setEmaSource('ema5_15m')}
                  className={`py-2 px-2 rounded-lg border text-center font-medium transition-colors ${
                    emaSource === 'ema5_15m'
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  5 EMA · 15m
                </button>
                <button
                  onClick={() => setEmaSource('ema9_5m')}
                  className={`py-2 px-2 rounded-lg border text-center font-medium transition-colors ${
                    emaSource === 'ema9_5m'
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  9 EMA · 5m
                </button>
                <button
                  onClick={() => setEmaSource('ema9_15m')}
                  className={`py-2 px-2 rounded-lg border text-center font-medium transition-colors ${
                    emaSource === 'ema9_15m'
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  9 EMA · 15m
                </button>
              </div>

              {emaSource !== 'manual' && (
                <div className="text-[11px] text-cyan-400 flex items-center justify-between bg-cyan-950/30 border border-cyan-800/40 px-3 py-1.5 rounded-lg">
                  <span>
                    When placed, this limit order will dynamically follow {emaSource.replace('_', ' ').toUpperCase()} on each tick!
                  </span>
                  {liveSelectedEma && (
                    <span className="font-mono font-bold">₹{liveSelectedEma.toFixed(2)}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Entry / Limit Price */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {orderType === 'MARKET' ? 'Market Fill Price (LTP)' : 'Limit Price (₹)'}
              </label>
              <input
                type="number"
                step="0.05"
                disabled={orderType === 'MARKET'}
                value={orderType === 'MARKET' ? currentQuote?.ltp || 0 : limitPrice}
                onChange={(e) => {
                  setLimitPrice(parseFloat(e.target.value) || 0);
                  if (emaSource !== 'manual') setEmaSource('manual');
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 disabled:bg-slate-900 disabled:text-slate-400 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500"
              />
              <div className="text-[10px] text-slate-400 mt-1">
                Current LTP: ₹{currentQuote ? currentQuote.ltp.toFixed(2) : '-'}
              </div>
            </div>

            {/* Stop-Loss */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Stop-Loss (₹)
                </label>
                <span className="text-[10px] text-amber-400">
                  {side === 'BUY' ? '< Entry' : '> Entry'}
                </span>
              </div>
              <input
                type="number"
                step="0.05"
                value={sl}
                onChange={(e) => setSl(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500"
              />
              <div className="text-[10px] text-slate-400 mt-1">
                Risk/share: ₹{riskPerShare.toFixed(2)}
              </div>
            </div>

            {/* Target */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Target (₹)
                </label>
                <span className="text-[10px] text-emerald-400">
                  {side === 'BUY' ? '> Entry' : '< Entry'}
                </span>
              </div>
              <input
                type="number"
                step="0.05"
                value={target}
                onChange={(e) => setTarget(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <div className="text-[10px] text-slate-400 mt-1">
                Reward/share: ₹{rewardPerShare.toFixed(2)} (RR: {rrRatio}x)
              </div>
            </div>
          </div>

          {/* Sizing & Quantity Calculator */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Position Sizing ({settings.sizing_mode.toUpperCase()} MODE)
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Leverage: <span className="text-slate-200 font-mono">{settings.leverage}x</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Order Quantity (Shares)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={qty || ''}
                    onChange={(e) => {
                      setManualQtyOverride(true);
                      setQty(Math.max(1, parseInt(e.target.value) || 0));
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setManualQtyOverride(false);
                      setQty(sizeCalc.qty);
                    }}
                    title="Reset to recommended formula size"
                    className="px-2.5 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors shrink-0"
                  >
                    Auto-Fit
                  </button>
                </div>
              </div>

              {/* Margin & Risk Preview */}
              <div className="text-xs space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                <div className="flex justify-between">
                  <span className="text-slate-400">Margin Blocked:</span>
                  <span
                    className={`font-mono font-semibold ${
                      marginAlloc > freeMargin ? 'text-rose-400' : 'text-slate-200'
                    }`}
                  >
                    ₹{marginAlloc.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Available Free Margin:</span>
                  <span className="font-mono text-emerald-400">
                    ₹{freeMargin.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Risk vs Reward:</span>
                  <span className="font-mono text-slate-200">
                    -₹{totalRiskAmt.toLocaleString('en-IN')} / +₹{totalRewardAmt.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Warnings / Gate Rejections */}
          {validationError && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Order Gate Rejection</div>
                <div>{validationError}</div>
              </div>
            </div>
          )}

          {hasExistingOpen && (
            <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                You already hold an OPEN position on {activeSymbol}. To expand it, navigate to Portfolio and click &quot;Add Qty&quot; (Section 4.6 true netting).
              </span>
            </div>
          )}

          {!istCheck.isOpen && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>
                  NSE Market is currently {istCheck.reason} ({istCheck.istTimeStr}).
                </span>
              </div>
              <span className="text-[11px] text-indigo-400">
                (You can bypass in Settings for testing!)
              </span>
            </div>
          )}

          {/* Primary Submit Button */}
          <button
            onClick={handlePlaceOrder}
            disabled={!isSymbolInWatchlist || hasExistingOpen}
            className={`w-full py-3.5 rounded-xl text-base font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
              side === 'BUY'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/60'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/60'
            }`}
          >
            <Zap className="w-5 h-5" />
            PLACE {orderType} {side} ({qty} Shares @ ₹{entryPrice.toFixed(2)})
          </button>
        </div>
      </div>
    </div>
  );
};
