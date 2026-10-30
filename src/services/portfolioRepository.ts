/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_WATCHLIST_SYMBOLS, STOCK_TO_SECTOR_MAP, getInstrumentKey } from '../data/sectors';
import {
  AlertItem,
  PaperOrder,
  PaperTrade,
  Settings,
  WatchlistItem
} from '../types/desk';

const STORAGE_KEYS = {
  WATCHLIST: 'nse_paper_desk_watchlist_v1',
  ORDERS: 'nse_paper_desk_orders_v1',
  TRADES: 'nse_paper_desk_trades_v1',
  SETTINGS: 'nse_paper_desk_settings_v1',
  ALERTS: 'nse_paper_desk_alerts_v1',
  CHECKPOINTS: 'nse_paper_desk_checkpoints_v1',
  OPENING_BIAS: 'nse_paper_desk_opening_bias_v1'
};

const memoryStore = new Map<string, string>();

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      return localStorage.getItem(key);
    }
  } catch {
    // fallback
  }
  return memoryStore.get(key) ?? null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(key, value);
    }
  } catch {
    // fallback
  }
  memoryStore.set(key, value);
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
      localStorage.removeItem(key);
    }
  } catch {
    // fallback
  }
  memoryStore.delete(key);
}

export interface CheckpointItem {
  time: string; // e.g. "09:35", "10:15", "12:00", "14:30"
  label: string;
  notes: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  leaders: string;
  laggards: string;
}

export interface LockedOpeningBias {
  lockedTime: string; // e.g. "09:20"
  bias: 'BEARISH' | 'BULLISH' | 'NEUTRAL';
  indexVsVwapPct: number;
  note: string;
}

export const DEFAULT_SETTINGS: Settings = {
  capital: 500000,
  leverage: 5.0,
  sizing_mode: 'margin',
  margin_per_trade: 30000,
  risk_pct: 1.0,
  rr_mult: 2.0,
  fallback_sl_pct: 0.5,
  daily_loss_limit_pct: 3.0,
  max_drawdown_pct: 6.0,
  max_trades_day: 10,
  auto_refresh_sec: 2,
  timezone: 'Asia/Kolkata',
  upstox_token: '',
  data_mode: 'LIVE',
  enforce_market_hours: true,
  market_hours_simulated_open: false
};

export class PortfolioRepository {
  // Watchlist methods
  static getWatchlist(): WatchlistItem[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.WATCHLIST);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse watchlist from storage', e);
    }
    // Seed default watchlist
    const initial: WatchlistItem[] = DEFAULT_WATCHLIST_SYMBOLS.map((sym) => ({
      symbol: sym,
      key: getInstrumentKey(sym),
      sector: STOCK_TO_SECTOR_MAP[sym] || 'General',
      added_at: new Date().toISOString()
    }));
    this.saveWatchlist(initial);
    return initial;
  }

  static saveWatchlist(items: WatchlistItem[]): void {
    try {
      safeSetItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save watchlist', e);
    }
  }

  static addToWatchlist(symbol: string): boolean {
    const list = this.getWatchlist();
    if (list.some((item) => item.symbol === symbol)) return false;
    list.push({
      symbol,
      key: getInstrumentKey(symbol),
      sector: STOCK_TO_SECTOR_MAP[symbol] || 'General',
      added_at: new Date().toISOString()
    });
    this.saveWatchlist(list);
    return true;
  }

  static removeFromWatchlist(symbol: string): void {
    const list = this.getWatchlist().filter((item) => item.symbol !== symbol);
    this.saveWatchlist(list);
  }

  // Paper Orders methods
  static getOrders(): PaperOrder[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.ORDERS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse orders from storage', e);
    }
    return [];
  }

  static saveOrders(orders: PaperOrder[]): void {
    try {
      safeSetItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save orders', e);
    }
  }

  static insertOrder(order: Omit<PaperOrder, 'id'>): PaperOrder {
    const orders = this.getOrders();
    const nextId = orders.length > 0 ? Math.max(...orders.map((o) => o.id)) + 1 : 1;
    const newOrder: PaperOrder = { ...order, id: nextId };
    orders.push(newOrder);
    this.saveOrders(orders);
    return newOrder;
  }

  static updateOrder(order: PaperOrder): void {
    const orders = this.getOrders();
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx !== -1) {
      orders[idx] = order;
      this.saveOrders(orders);
    }
  }

  /**
   * Atomic UPDATE paper_orders SET status='FILLED', filled_at=?, note=?
   * WHERE id=? AND status='PENDING'
   * Returns true iff exactly 1 row was updated from PENDING to FILLED.
   */
  static markOrderFilled(orderId: number, filledAt: string, note = 'market fill'): boolean {
    const orders = this.getOrders();
    const idx = orders.findIndex((o) => o.id === orderId && o.status === 'PENDING');
    if (idx === -1) {
      return false;
    }
    const current = orders[idx];
    orders[idx] = {
      ...current,
      status: 'FILLED',
      filled_at: filledAt,
      note: current.note ? `${current.note} | ${note}` : note
    };
    this.saveOrders(orders);
    return true;
  }

  // Paper Trades methods
  static getTrades(): PaperTrade[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.TRADES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse trades from storage', e);
    }
    return [];
  }

  static saveTrades(trades: PaperTrade[]): void {
    try {
      safeSetItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
    } catch (e) {
      console.error('Failed to save trades', e);
    }
  }

  static insertTrade(trade: Omit<PaperTrade, 'id'>): PaperTrade {
    const trades = this.getTrades();
    const nextId = trades.length > 0 ? Math.max(...trades.map((t) => t.id)) + 1 : 1;
    const newTrade: PaperTrade = { ...trade, id: nextId };
    trades.push(newTrade);
    this.saveTrades(trades);
    return newTrade;
  }

  static updateTrade(trade: PaperTrade): void {
    const trades = this.getTrades();
    const idx = trades.findIndex((t) => t.id === trade.id);
    if (idx !== -1) {
      trades[idx] = trade;
      this.saveTrades(trades);
    }
  }

  // Settings methods
  static getSettings(): Settings {
    try {
      const data = safeGetItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error('Failed to parse settings from storage', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  static saveSettings(settings: Settings): void {
    try {
      safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  // Alerts methods
  static getAlerts(): AlertItem[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.ALERTS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse alerts from storage', e);
    }
    return [];
  }

  static saveAlerts(alerts: AlertItem[]): void {
    try {
      safeSetItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts.slice(-100)));
    } catch (e) {
      console.error('Failed to save alerts', e);
    }
  }

  static addAlert(alert: Omit<AlertItem, 'id' | 'shown'>): AlertItem {
    const alerts = this.getAlerts();
    const nextId = alerts.length > 0 ? Math.max(...alerts.map((a) => a.id)) + 1 : 1;
    const item: AlertItem = { ...alert, id: nextId, shown: 0 };
    alerts.unshift(item);
    this.saveAlerts(alerts);
    return item;
  }

  static clearAlerts(): void {
    this.saveAlerts([]);
  }

  // Checkpoints methods (Fixed slots: 09:35, 10:15, 12:00, 14:30)
  static getCheckpoints(): CheckpointItem[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.CHECKPOINTS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse checkpoints', e);
    }
    // Default initial checkpoint structure
    const initial: CheckpointItem[] = [
      {
        time: '09:35',
        label: 'Opening Range Discovery',
        notes: 'Initial 20-min session discovery. Opening range established against VWAP.',
        bias: 'BEARISH',
        leaders: 'PSU Banks (+0.8%), IT (+0.4%)',
        laggards: 'Auto (-1.2%), Metal (-0.9%)'
      },
      {
        time: '10:15',
        label: 'Trend Consolidation',
        notes: 'First 1-hour trend anchor. Divergence between private banks and broad market.',
        bias: 'BEARISH',
        leaders: 'Private Banks (holding VWAP)',
        laggards: 'Realty, Auto, Energy'
      },
      {
        time: '12:00',
        label: 'Midday European Pre-Open',
        notes: 'Volume contraction and range compression. Respecting opening bias stick sectors.',
        bias: 'BEARISH',
        leaders: 'Defensive FMCG, IT',
        laggards: 'High-beta Metal, Infra'
      },
      {
        time: '14:30',
        label: 'Afternoon Institutional Flow',
        notes: 'Late session positioning. Watch for intraday square-off reversals.',
        bias: 'BEARISH',
        leaders: 'PSU Banks (reversal probe)',
        laggards: 'Auto (persistent breakdown)'
      }
    ];
    this.saveCheckpoints(initial);
    return initial;
  }

  static saveCheckpoints(items: CheckpointItem[]): void {
    try {
      safeSetItem(STORAGE_KEYS.CHECKPOINTS, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save checkpoints', e);
    }
  }

  // Locked Opening Bias methods
  static getOpeningBias(): LockedOpeningBias {
    try {
      const data = safeGetItem(STORAGE_KEYS.OPENING_BIAS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse opening bias', e);
    }
    const defaultBias: LockedOpeningBias = {
      lockedTime: '09:20',
      bias: 'BEARISH',
      indexVsVwapPct: -0.32,
      note: 'Nifty trading below opening VWAP. Breadth weak across Auto, Metal, and Realty.'
    };
    this.saveOpeningBias(defaultBias);
    return defaultBias;
  }

  static saveOpeningBias(bias: LockedOpeningBias): void {
    try {
      safeSetItem(STORAGE_KEYS.OPENING_BIAS, JSON.stringify(bias));
    } catch (e) {
      console.error('Failed to save opening bias', e);
    }
  }

  // Reset entire database to factory defaults
  static resetAll(): void {
    safeRemoveItem(STORAGE_KEYS.WATCHLIST);
    safeRemoveItem(STORAGE_KEYS.ORDERS);
    safeRemoveItem(STORAGE_KEYS.TRADES);
    safeRemoveItem(STORAGE_KEYS.SETTINGS);
    safeRemoveItem(STORAGE_KEYS.ALERTS);
    safeRemoveItem(STORAGE_KEYS.CHECKPOINTS);
    safeRemoveItem(STORAGE_KEYS.OPENING_BIAS);
  }
}
