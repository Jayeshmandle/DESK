/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertItem,
  OrderSide,
  PaperOrder,
  PaperTrade,
  Settings,
  StockQuote
} from '../types/desk';
import { EmaService } from './emaService';
import { MarginService } from './marginService';
import { MarketDataService } from './marketDataService';
import { PortfolioRepository } from './portfolioRepository';

export interface OrderValidationResult {
  valid: boolean;
  error?: string;
}

export class OrderService {
  /**
   * Check risk locks and rules
   */
  static checkRiskLocks(
    settings: Settings,
    openTrades: PaperTrade[],
    closedTrades: PaperTrade[]
  ): { locked: boolean; reason?: string } {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayClosed = closedTrades.filter((t) => t.day === todayStr);

    const realizedPnlToday = todayClosed.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const unrealizedPnl = openTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const netPnlToday = realizedPnlToday + unrealizedPnl;

    // Daily loss limit check
    const maxDailyLoss = (settings.capital * settings.daily_loss_limit_pct) / 100;
    if (netPnlToday <= -maxDailyLoss) {
      return {
        locked: true,
        reason: `Risk Lock: Daily loss limit of -₹${maxDailyLoss.toLocaleString('en-IN')} (${
          settings.daily_loss_limit_pct
        }%) reached. Current Net P&L: -₹${Math.abs(netPnlToday).toLocaleString('en-IN')}. Trading paused.`
      };
    }

    // Max trades per day check
    const totalTradesToday = todayClosed.length + openTrades.filter((t) => t.day === todayStr).length;
    if (settings.max_trades_day > 0 && totalTradesToday >= settings.max_trades_day) {
      return {
        locked: true,
        reason: `Risk Lock: Maximum allowed trades per day (${settings.max_trades_day}) reached for today.`
      };
    }

    return { locked: false };
  }

  /**
   * Validate order gates before placing Market or Limit order
   */
  static validateOrderGates(params: {
    symbol: string;
    side: OrderSide;
    price: number;
    sl: number;
    target: number;
    qty: number;
    margin_alloc: number;
    settings: Settings;
    openTrades: PaperTrade[];
    pendingOrders: PaperOrder[];
    closedTrades: PaperTrade[];
    watchlistSymbols: string[];
    isMarketOrder?: boolean;
  }): OrderValidationResult {
    const {
      symbol,
      side,
      price,
      sl,
      target,
      qty,
      margin_alloc,
      settings,
      openTrades,
      pendingOrders,
      closedTrades,
      watchlistSymbols,
      isMarketOrder
    } = params;

    // 1. Market Open Check (09:15 - 15:30 IST)
    const marketStatus = MarketDataService.isMarketOpenIST(settings);
    if (!marketStatus.isOpen) {
      return {
        valid: false,
        error: `Order rejected: ${marketStatus.reason || 'Market is closed outside 09:15–15:30 IST'}`
      };
    }

    // 2. Risk Locks Check
    const riskLock = this.checkRiskLocks(settings, openTrades, closedTrades);
    if (riskLock.locked) {
      return {
        valid: false,
        error: riskLock.reason
      };
    }

    // 3. Symbol on Watchlist Check
    if (!watchlistSymbols.includes(symbol)) {
      return {
        valid: false,
        error: `Order rejected: ${symbol} must be added to your Watchlist before trading`
      };
    }

    // 4. No existing OPEN position on this symbol
    const existingOpen = openTrades.some((t) => t.symbol === symbol && t.status === 'OPEN');
    if (existingOpen) {
      return {
        valid: false,
        error: `Order rejected: An OPEN position already exists on ${symbol}. Use 'Add Qty' to add to it.`
      };
    }

    // 5. Quantity Check
    if (qty <= 0) {
      return {
        valid: false,
        error: 'Order rejected: Calculated position size is 0 shares. Check margin or price.'
      };
    }

    // 6. Stop-Loss Validation on correct side
    if (side === 'BUY') {
      if (sl >= price) {
        return {
          valid: false,
          error: `Order rejected: For BUY order, Stop-Loss (₹${sl}) must be BELOW entry price (₹${price})`
        };
      }
      if (target <= price) {
        return {
          valid: false,
          error: `Order rejected: For BUY order, Target (₹${target}) must be ABOVE entry price (₹${price})`
        };
      }
    } else {
      // SELL (SHORT)
      if (sl <= price) {
        return {
          valid: false,
          error: `Order rejected: For SELL order, Stop-Loss (₹${sl}) must be ABOVE entry price (₹${price})`
        };
      }
      if (target >= price) {
        return {
          valid: false,
          error: `Order rejected: For SELL order, Target (₹${target}) must be BELOW entry price (₹${price})`
        };
      }
    }

    // 7. Free Margin Check
    const freeMargin = MarginService.calculateFreeMargin(settings.capital, openTrades, pendingOrders);
    if (margin_alloc > freeMargin) {
      return {
        valid: false,
        error: `Insufficient free margin: Order requires ₹${margin_alloc.toLocaleString('en-IN', {
          minimumFractionDigits: 2
        })}, but available free margin is only ₹${freeMargin.toLocaleString('en-IN', {
          minimumFractionDigits: 2
        })}`
      };
    }

    return { valid: true };
  }

  /**
   * 5.1 Place Market Order
   */
  static placeMarketOrder(params: {
    symbol: string;
    key: string;
    side: OrderSide;
    price: number;
    sl: number;
    target: number;
    qty: number;
    margin_alloc: number;
    settings: Settings;
    openTrades: PaperTrade[];
    pendingOrders: PaperOrder[];
    closedTrades: PaperTrade[];
    watchlistSymbols: string[];
  }): { success: boolean; error?: string; trade?: PaperTrade } {
    const validation = this.validateOrderGates({
      ...params,
      isMarketOrder: true
    });

    if (!validation.valid) {
      PortfolioRepository.addAlert({
        ts: new Date().toLocaleTimeString('en-IN'),
        kind: 'ERROR',
        symbol: params.symbol,
        msg: validation.error || 'Market order rejected'
      });
      return { success: false, error: validation.error };
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    const riskAmt = Math.round(Math.abs(params.price - params.sl) * params.qty * 100) / 100;

    const newTrade = PortfolioRepository.insertTrade({
      day: todayStr,
      symbol: params.symbol,
      key: params.key,
      side: params.side,
      qty: params.qty,
      entry: params.price,
      sl: params.sl,
      target: params.target,
      margin_alloc: params.margin_alloc,
      status: 'OPEN',
      opened_at: nowIso,
      risk_amt: riskAmt,
      pnl: 0
    });

    PortfolioRepository.addAlert({
      ts: new Date().toLocaleTimeString('en-IN'),
      kind: 'FILL',
      symbol: params.symbol,
      msg: `MARKET FILLED: ${params.side} ${params.qty} shares @ ₹${params.price}. Margin blocked: ₹${params.margin_alloc.toLocaleString(
        'en-IN'
      )}`
    });

    return { success: true, trade: newTrade };
  }

  /**
   * 5.2 Place Limit Order
   */
  static placeLimitOrder(params: {
    symbol: string;
    key: string;
    side: OrderSide;
    limit_price: number;
    sl: number;
    target: number;
    qty: number;
    margin_alloc: number;
    track_ema?: { span: number; tf: number };
    settings: Settings;
    openTrades: PaperTrade[];
    pendingOrders: PaperOrder[];
    closedTrades: PaperTrade[];
    watchlistSymbols: string[];
  }): { success: boolean; error?: string; order?: PaperOrder } {
    const validation = this.validateOrderGates({
      ...params,
      price: params.limit_price,
      isMarketOrder: false
    });

    if (!validation.valid) {
      PortfolioRepository.addAlert({
        ts: new Date().toLocaleTimeString('en-IN'),
        kind: 'ERROR',
        symbol: params.symbol,
        msg: validation.error || 'Limit order rejected'
      });
      return { success: false, error: validation.error };
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    let note: string | undefined = undefined;
    if (params.track_ema) {
      note = EmaService.formatEmaNote(params.track_ema.span, params.track_ema.tf);
    }

    const newOrder = PortfolioRepository.insertOrder({
      day: todayStr,
      symbol: params.symbol,
      key: params.key,
      side: params.side,
      qty: params.qty,
      limit_price: params.limit_price,
      sl: params.sl,
      target: params.target,
      margin_alloc: params.margin_alloc,
      status: 'PENDING',
      created_at: nowIso,
      note
    });

    PortfolioRepository.addAlert({
      ts: new Date().toLocaleTimeString('en-IN'),
      kind: 'INFO',
      symbol: params.symbol,
      msg: `LIMIT PLACED: ${params.side} ${params.qty} shares @ ₹${params.limit_price}${
        note ? ` [Tracking ${note}]` : ''
      }. Margin blocked: ₹${params.margin_alloc.toLocaleString('en-IN')}`
    });

    return { success: true, order: newOrder };
  }

  /**
   * 5.3 Pending tick: execute every poll/refresh
   */
  static onMarketTick(params: {
    quotes: Map<string, StockQuote>;
    settings: Settings;
    openTrades: PaperTrade[];
    pendingOrders: PaperOrder[];
  }): {
    updatedPending: PaperOrder[];
    updatedOpen: PaperTrade[];
    alertsGenerated: AlertItem[];
  } {
    const { quotes, settings, openTrades, pendingOrders } = params;
    const alertsGenerated: AlertItem[] = [];

    // Clone arrays for mutation
    let pending = [...pendingOrders.filter((o) => o.status === 'PENDING')];
    let open = [...openTrades.filter((t) => t.status === 'OPEN')];

    // 1. Process PENDING orders
    const remainingPending: PaperOrder[] = [];

    for (const order of pending) {
      const quote = quotes.get(order.symbol);
      if (!quote) {
        remainingPending.push(order);
        continue;
      }

      let currentLimit = order.limit_price;
      let currentMargin = order.margin_alloc;

      // 1.1 EMA Tracking
      if (order.note && order.note.startsWith('EMA|')) {
        const emaInfo = EmaService.parseEmaNote(order.note);
        if (emaInfo) {
          let liveEma: number | null = null;
          if (emaInfo.span === 5 && emaInfo.tf === 5) liveEma = quote.ema5_5m;
          else if (emaInfo.span === 5 && emaInfo.tf === 15) liveEma = quote.ema5_15m;
          else if (emaInfo.span === 9 && emaInfo.tf === 5) liveEma = quote.ema9_5m;
          else if (emaInfo.span === 9 && emaInfo.tf === 15) liveEma = quote.ema9_15m;

          if (liveEma !== null && liveEma > 0 && liveEma !== currentLimit) {
            currentLimit = liveEma;
            currentMargin = MarginService.calcMarginAlloc(order.qty, currentLimit, settings.leverage);
            order.limit_price = currentLimit;
            order.margin_alloc = currentMargin;
            PortfolioRepository.updateOrder(order);
          }
        }
      }

      // 1.2 Safety check: if LTP has already breached SL, cancel pending
      const ltp = quote.ltp;
      const breachedSl =
        (order.side === 'BUY' && ltp <= order.sl) || (order.side === 'SELL' && ltp >= order.sl);

      if (breachedSl) {
        order.status = 'CANCELLED';
        order.note = `${order.note ? order.note + ' | ' : ''}Auto-cancelled: price past SL (LTP: ${ltp})`;
        PortfolioRepository.updateOrder(order);
        const alert = PortfolioRepository.addAlert({
          ts: new Date().toLocaleTimeString('en-IN'),
          kind: 'CANCEL',
          symbol: order.symbol,
          msg: `Pending order ${order.id} auto-cancelled: LTP ₹${ltp} breached SL ₹${order.sl}`
        });
        alertsGenerated.push(alert);
        continue;
      }

      // 1.3 Fill condition:
      // BUY and LTP <= limit_price, or SELL and LTP >= limit_price
      // Rule 6: When market is closed, allow viewing cached data but block new fills
      const isMarketOpen = MarketDataService.isMarketOpenIST(settings).isOpen;
      const canFill =
        isMarketOpen &&
        ((order.side === 'BUY' && ltp <= currentLimit) ||
          (order.side === 'SELL' && ltp >= currentLimit));

      if (canFill) {
        // Mark FILLED
        order.status = 'FILLED';
        order.filled_at = new Date().toISOString();
        PortfolioRepository.updateOrder(order);

        // Open trade at limit_price (as specified in 5.3)
        const fillPrice = currentLimit;
        const riskAmt = Math.round(Math.abs(fillPrice - order.sl) * order.qty * 100) / 100;

        const newTrade = PortfolioRepository.insertTrade({
          day: order.day,
          symbol: order.symbol,
          key: order.key,
          side: order.side,
          qty: order.qty,
          entry: fillPrice,
          sl: order.sl,
          target: order.target,
          margin_alloc: currentMargin,
          status: 'OPEN',
          opened_at: new Date().toISOString(),
          risk_amt: riskAmt,
          pnl: 0
        });

        open.push(newTrade);

        const alert = PortfolioRepository.addAlert({
          ts: new Date().toLocaleTimeString('en-IN'),
          kind: 'FILL',
          symbol: order.symbol,
          msg: `LIMIT FILLED: ${order.side} ${order.qty} ${order.symbol} @ ₹${fillPrice}. Margin transferred from pending to open.`
        });
        alertsGenerated.push(alert);
      } else {
        remainingPending.push(order);
      }
    }

    // 2. Process OPEN positions: update live P&L and check TP/SL
    const activeOpenTrades: PaperTrade[] = [];

    for (const trade of open) {
      const quote = quotes.get(trade.symbol);
      if (!quote) {
        activeOpenTrades.push(trade);
        continue;
      }

      const ltp = quote.ltp;
      // 4.5 Live P&L: pnl = (ltp - entry) * qty * (side == BUY ? 1 : -1)
      const dirn = trade.side === 'BUY' ? 1 : -1;
      const livePnl = Math.round((ltp - trade.entry) * trade.qty * dirn * 100) / 100;
      trade.pnl = livePnl;

      // Check Target Hit
      const targetHit =
        (trade.side === 'BUY' && ltp >= trade.target) ||
        (trade.side === 'SELL' && ltp <= trade.target);

      if (targetHit) {
        trade.status = 'CLOSED';
        trade.closed_at = new Date().toISOString();
        trade.exit_price = ltp;
        trade.exit_reason = 'TARGET_HIT';
        trade.pnl = livePnl;
        PortfolioRepository.updateTrade(trade);

        // Realized P&L added to capital
        settings.capital = Math.round((settings.capital + livePnl) * 100) / 100;
        PortfolioRepository.saveSettings(settings);

        const alert = PortfolioRepository.addAlert({
          ts: new Date().toLocaleTimeString('en-IN'),
          kind: 'TARGET_HIT',
          symbol: trade.symbol,
          msg: `TARGET HIT: ${trade.symbol} exited @ ₹${ltp}! Realized P&L: +₹${livePnl.toLocaleString('en-IN')}`
        });
        alertsGenerated.push(alert);
        continue;
      }

      // Check Stop-Loss Hit
      const slHit =
        (trade.side === 'BUY' && ltp <= trade.sl) ||
        (trade.side === 'SELL' && ltp >= trade.sl);

      if (slHit) {
        trade.status = 'CLOSED';
        trade.closed_at = new Date().toISOString();
        trade.exit_price = ltp;
        trade.exit_reason = 'SL_HIT';
        trade.pnl = livePnl;
        PortfolioRepository.updateTrade(trade);

        settings.capital = Math.round((settings.capital + livePnl) * 100) / 100;
        PortfolioRepository.saveSettings(settings);

        const alert = PortfolioRepository.addAlert({
          ts: new Date().toLocaleTimeString('en-IN'),
          kind: 'SL_HIT',
          symbol: trade.symbol,
          msg: `STOP-LOSS HIT: ${trade.symbol} exited @ ₹${ltp}. Realized P&L: -₹${Math.abs(livePnl).toLocaleString('en-IN')}`
        });
        alertsGenerated.push(alert);
        continue;
      }

      // Still open
      PortfolioRepository.updateTrade(trade);
      activeOpenTrades.push(trade);
    }

    return {
      updatedPending: remainingPending,
      updatedOpen: activeOpenTrades,
      alertsGenerated
    };
  }

  /**
   * 5.4 Fill Market (from pending)
   * Required behaviour (atomic):
   * 1. Load order where status == PENDING
   * 2. Get LTP; reject if no LTP or market closed or OPEN already exists on same symbol
   * 3. UPDATE paper_orders SET status='FILLED', filled_at=now, note='market fill' WHERE id=? AND status='PENDING'
   * 4. Only if that update succeeds (1 row): INSERT paper_trades OPEN at LTP with same qty, sl, target, margin_alloc
   * 5. Pending list must no longer show that order
   * 6. free_margin unchanged except margin is now on OPEN not PENDING (used_margin still counts it)
   */
  static fillMarketFromPending(params: {
    orderId: number;
    currentLtp: number;
    settings: Settings;
    openTrades?: PaperTrade[];
    pendingOrders?: PaperOrder[];
  }): { success: boolean; error?: string; trade?: PaperTrade } {
    const { orderId, currentLtp, settings } = params;

    // 1. Get LTP; reject if missing or non-positive
    if (!currentLtp || isNaN(currentLtp) || currentLtp <= 0) {
      return { success: false, error: 'Reject fill: Valid market LTP is required.' };
    }

    // 2. Reject if market closed (unless bypass enabled)
    const marketCheck = MarketDataService.isMarketOpenIST(settings);
    if (!marketCheck.isOpen) {
      return { success: false, error: `Reject fill: Market is closed (${marketCheck.reason})` };
    }

    // Load order where status == PENDING
    const dbOrders = PortfolioRepository.getOrders();
    let order = dbOrders.find((o) => o.id === orderId && o.status === 'PENDING');
    if (!order && params.pendingOrders) {
      order = params.pendingOrders.find((o) => o.id === orderId && o.status === 'PENDING');
      if (order) {
        PortfolioRepository.saveOrders([...dbOrders.filter((o) => o.id !== orderId), order]);
      }
    }

    if (!order) {
      return { success: false, error: `Reject fill: Pending order #${orderId} not found in PENDING state.` };
    }

    // Reject if OPEN already exists on same symbol (no multiple OPEN rows for same symbol)
    const dbTrades = PortfolioRepository.getTrades();
    const existingOpen = dbTrades.some((t) => t.symbol === order.symbol && t.status === 'OPEN') ||
      (params.openTrades && params.openTrades.some((t) => t.symbol === order.symbol && t.status === 'OPEN'));

    if (existingOpen) {
      return {
        success: false,
        error: `Reject fill: An OPEN position already exists for ${order.symbol}. Multiple OPEN rows prohibited.`
      };
    }

    // Reject if LTP past SL
    if (
      (order.side === 'BUY' && currentLtp <= order.sl) ||
      (order.side === 'SELL' && currentLtp >= order.sl)
    ) {
      return { success: false, error: `Reject fill: Current price ₹${currentLtp} has breached Stop-Loss ₹${order.sl}` };
    }

    // 3. Atomic UPDATE paper_orders SET status='FILLED', filled_at=now, note='market fill' WHERE id=? AND status='PENDING'
    const nowIso = new Date().toISOString();
    const updateSuccess = PortfolioRepository.markOrderFilled(orderId, nowIso, 'market fill');

    if (!updateSuccess) {
      return { success: false, error: 'Reject fill: Atomic update failed; order is not PENDING.' };
    }

    // Update in-memory array if supplied
    if (params.pendingOrders) {
      const idx = params.pendingOrders.findIndex((o) => o.id === orderId);
      if (idx !== -1) {
        params.pendingOrders[idx].status = 'FILLED';
        params.pendingOrders[idx].filled_at = nowIso;
        params.pendingOrders[idx].note = params.pendingOrders[idx].note
          ? `${params.pendingOrders[idx].note} | market fill`
          : 'market fill';
      }
    }

    // 4. Only if that update succeeds (1 row): INSERT paper_trades OPEN at LTP
    // with same qty, sl, target, margin_alloc
    const newMargin = MarginService.calcMarginAlloc(order.qty, currentLtp, settings.leverage);
    const riskAmt = Math.round(Math.abs(currentLtp - order.sl) * order.qty * 100) / 100;

    const newTrade = PortfolioRepository.insertTrade({
      day: order.day,
      symbol: order.symbol,
      key: order.key,
      side: order.side,
      qty: order.qty,
      entry: currentLtp,
      sl: order.sl,
      target: order.target,
      margin_alloc: newMargin,
      status: 'OPEN',
      opened_at: nowIso,
      risk_amt: riskAmt,
      pnl: 0
    });

    if (params.openTrades) {
      params.openTrades.push(newTrade);
    }

    PortfolioRepository.addAlert({
      ts: new Date().toLocaleTimeString('en-IN'),
      kind: 'FILL',
      symbol: order.symbol,
      msg: `FORCE MARKET FILL: Order #${order.id} filled for ${order.symbol} (${order.side} ${order.qty} @ ₹${currentLtp}). Margin on OPEN position.`
    });

    return { success: true, trade: newTrade };
  }

  /**
   * 5.5 Cancel pending order
   */
  static cancelPendingOrder(orderId: number): boolean {
    const orders = PortfolioRepository.getOrders();
    const order = orders.find((o) => o.id === orderId && o.status === 'PENDING');
    if (!order) return false;

    order.status = 'CANCELLED';
    PortfolioRepository.updateOrder(order);

    PortfolioRepository.addAlert({
      ts: new Date().toLocaleTimeString('en-IN'),
      kind: 'CANCEL',
      symbol: order.symbol,
      msg: `Order #${order.id} cancelled. Margin ₹${order.margin_alloc.toLocaleString('en-IN')} released.`
    });

    return true;
  }

  /**
   * 5.6 Close position manually
   */
  static closePosition(tradeId: number, currentLtp: number, reason = 'MANUAL'): {
    success: boolean;
    error?: string;
    pnl?: number;
  } {
    const trades = PortfolioRepository.getTrades();
    const trade = trades.find((t) => t.id === tradeId && t.status === 'OPEN');
    if (!trade) return { success: false, error: 'Position not found' };

    const dirn = trade.side === 'BUY' ? 1 : -1;
    const realizedPnl = Math.round((currentLtp - trade.entry) * trade.qty * dirn * 100) / 100;

    trade.status = 'CLOSED';
    trade.closed_at = new Date().toISOString();
    trade.exit_price = currentLtp;
    trade.exit_reason = reason;
    trade.pnl = realizedPnl;
    PortfolioRepository.updateTrade(trade);

    // Update capital
    const settings = PortfolioRepository.getSettings();
    settings.capital = Math.round((settings.capital + realizedPnl) * 100) / 100;
    PortfolioRepository.saveSettings(settings);

    PortfolioRepository.addAlert({
      ts: new Date().toLocaleTimeString('en-IN'),
      kind: 'INFO',
      symbol: trade.symbol,
      msg: `Position #${trade.id} closed @ ₹${currentLtp}. P&L: ${realizedPnl >= 0 ? '+' : ''}₹${realizedPnl.toLocaleString(
        'en-IN'
      )}. Margin released.`
    });

    return { success: true, pnl: realizedPnl };
  }

  /**
   * Square off all open positions
   */
  static squareOffAll(quotes: Map<string, StockQuote>): number {
    const openTrades = PortfolioRepository.getTrades().filter((t) => t.status === 'OPEN');
    let totalPnl = 0;

    for (const trade of openTrades) {
      const quote = quotes.get(trade.symbol);
      const exitPrice = quote ? quote.ltp : trade.entry;
      const res = this.closePosition(trade.id, exitPrice, 'SQUARE_OFF_ALL');
      if (res.pnl) totalPnl += res.pnl;
    }

    return totalPnl;
  }

  /**
   * 4.6 & 5 Add Quantity to Open Position (True Netting)
   */
  static addQtyToOpenPosition(params: {
    tradeId: number;
    addQty: number;
    fillPrice: number;
    settings: Settings;
    openTrades: PaperTrade[];
    pendingOrders: PaperOrder[];
  }): { success: boolean; error?: string } {
    const { tradeId, addQty, fillPrice, settings, openTrades, pendingOrders } = params;

    const trade = openTrades.find((t) => t.id === tradeId && t.status === 'OPEN');
    if (!trade) {
      return { success: false, error: 'Open position not found' };
    }

    const freeMargin = MarginService.calculateFreeMargin(settings.capital, openTrades, pendingOrders);

    const result = MarginService.computeAddQty({
      old_qty: trade.qty,
      old_entry: trade.entry,
      old_margin_alloc: trade.margin_alloc,
      add_qty: addQty,
      fill_price: fillPrice,
      leverage: settings.leverage,
      free_margin: freeMargin
    });

    if (!result.success) {
      return { success: false, error: result.reason };
    }

    trade.qty = result.new_qty;
    trade.entry = result.new_entry;
    trade.margin_alloc = result.new_margin;
    // SL and Target MUST NOT change!
    PortfolioRepository.updateTrade(trade);

    PortfolioRepository.addAlert({
      ts: new Date().toLocaleTimeString('en-IN'),
      kind: 'INFO',
      symbol: trade.symbol,
      msg: `Added ${addQty} shares to ${trade.symbol} @ ₹${fillPrice}. New qty: ${trade.qty}, new avg entry: ₹${trade.entry}. Extra margin blocked: ₹${result.extra_margin}`
    });

    return { success: true };
  }

  /**
   * 5.7 Update Pending Order
   */
  static updatePendingOrder(params: {
    orderId: number;
    newLimit: number;
    newSl: number;
    newTarget: number;
    newQty: number;
    settings: Settings;
    openTrades: PaperTrade[];
    pendingOrders: PaperOrder[];
  }): { success: boolean; error?: string } {
    const { orderId, newLimit, newSl, newTarget, newQty, settings, openTrades, pendingOrders } = params;

    const order = pendingOrders.find((o) => o.id === orderId && o.status === 'PENDING');
    if (!order) return { success: false, error: 'Order not found' };

    const newMargin = MarginService.calcMarginAlloc(newQty, newLimit, settings.leverage);
    const delta = newMargin - order.margin_alloc;

    const currentFree = MarginService.calculateFreeMargin(settings.capital, openTrades, pendingOrders);
    if (delta > 0 && delta > currentFree) {
      return {
        success: false,
        error: `Insufficient margin to increase order: requires ₹${delta.toLocaleString(
          'en-IN'
        )} extra, free margin is ₹${currentFree.toLocaleString('en-IN')}`
      };
    }

    order.limit_price = newLimit;
    order.sl = newSl;
    order.target = newTarget;
    order.qty = newQty;
    order.margin_alloc = newMargin;
    PortfolioRepository.updateOrder(order);

    PortfolioRepository.addAlert({
      ts: new Date().toLocaleTimeString('en-IN'),
      kind: 'INFO',
      symbol: order.symbol,
      msg: `Pending order #${order.id} updated: Limit ₹${newLimit}, SL ₹${newSl}, Qty ${newQty}`
    });

    return { success: true };
  }

  /**
   * Set Track EMA on existing pending order
   */
  static setOrderTrackEma(orderId: number, span: number, tf: number): boolean {
    const orders = PortfolioRepository.getOrders();
    const order = orders.find((o) => o.id === orderId && o.status === 'PENDING');
    if (!order) return false;

    order.note = EmaService.formatEmaNote(span, tf);
    PortfolioRepository.updateOrder(order);

    PortfolioRepository.addAlert({
      ts: new Date().toLocaleTimeString('en-IN'),
      kind: 'INFO',
      symbol: order.symbol,
      msg: `Order #${order.id} set to track ${span} EMA (${tf}m)`
    });

    return true;
  }
}
