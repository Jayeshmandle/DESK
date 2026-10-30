/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED';
export type TradeStatus = 'OPEN' | 'CLOSED';
export type SizingMode = 'margin' | 'risk';
export type Grade = 'A' | 'B' | 'C';
export type DataMode = 'LIVE' | 'DEMO';

export interface WatchlistItem {
  symbol: string;
  key: string;
  sector: string;
  added_at: string;
}

export interface PaperOrder {
  id: number;
  day: string;
  symbol: string;
  key: string;
  side: OrderSide;
  qty: number;
  limit_price: number;
  sl: number;
  target: number;
  margin_alloc: number;
  status: OrderStatus;
  created_at: string;
  filled_at?: string;
  note?: string; // e.g. "EMA|9|15" or "EMA|5|5" or "market fill"
}

export interface PaperTrade {
  id: number;
  day: string;
  symbol: string;
  key: string;
  side: OrderSide;
  qty: number;
  entry: number;
  sl: number;
  target: number;
  margin_alloc: number;
  exit_price?: number;
  status: TradeStatus;
  opened_at: string;
  closed_at?: string;
  pnl?: number;
  risk_amt?: number;
  exit_reason?: string;
}

export interface Settings {
  capital: number;
  leverage: number;
  sizing_mode: SizingMode;
  margin_per_trade: number;
  risk_pct: number;
  rr_mult: number;
  fallback_sl_pct: number;
  daily_loss_limit_pct: number;
  max_drawdown_pct: number;
  max_trades_day: number;
  auto_refresh_sec: number;
  timezone: string;
  upstox_token: string;
  data_mode: DataMode; // 'LIVE' (default, requires Upstox token) | 'DEMO' (sample offline data)
  enforce_market_hours: boolean;
  market_hours_simulated_open?: boolean;
}

export interface AlertItem {
  id: number;
  ts: string;
  kind: 'INFO' | 'FILL' | 'SL_HIT' | 'TARGET_HIT' | 'RISK_LOCK' | 'ERROR' | 'CANCEL';
  symbol?: string;
  msg: string;
  shown: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockQuote {
  symbol: string;
  instrument_key: string;
  sector: string;
  ltp: number;
  prev_close: number;
  change: number;
  change_pct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  avg_volume: number;
  vwap: number;
  rvol: number;
  rs: number;
  score: number;
  grade: Grade;
  sparkline: number[];
  candles5m: Candle[];
  candles15m: Candle[];
  ema5_5m: number | null;
  ema5_15m: number | null;
  ema9_5m: number | null;
  ema9_15m: number | null;
}

export interface SectorSummary {
  name: string;
  stocksCount: number;
  avgChangePct: number;
  topGainer: { symbol: string; change_pct: number };
  topLoser: { symbol: string; change_pct: number };
}

export type ActiveScreen = 'home' | 'scanner' | 'watchlist' | 'trade' | 'portfolio' | 'settings';
