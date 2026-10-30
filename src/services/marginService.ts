/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PaperOrder, PaperTrade, SizingMode } from '../types/desk';

export class MarginService {
  /**
   * 4.1 Margin
   * used_margin = sum(margin_alloc of OPEN trades) + sum(margin_alloc of PENDING orders)
   */
  static calculateUsedMargin(openTrades: PaperTrade[], pendingOrders: PaperOrder[]): number {
    const openMargin = openTrades
      .filter((t) => t.status === 'OPEN')
      .reduce((sum, t) => sum + (t.margin_alloc || 0), 0);

    const pendingMargin = pendingOrders
      .filter((o) => o.status === 'PENDING')
      .reduce((sum, o) => sum + (o.margin_alloc || 0), 0);

    return Math.round((openMargin + pendingMargin) * 100) / 100;
  }

  /**
   * free_margin = capital - used_margin
   */
  static calculateFreeMargin(
    capital: number,
    openTrades: PaperTrade[],
    pendingOrders: PaperOrder[]
  ): number {
    const used = this.calculateUsedMargin(openTrades, pendingOrders);
    const free = capital - used;
    return Math.round(free * 100) / 100;
  }

  /**
   * 4.2 Position size _size(price, sl)
   */
  static calculateSize(params: {
    price: number;
    sl: number;
    sizing_mode: SizingMode;
    capital: number;
    free_margin: number;
    leverage: number;
    margin_per_trade: number;
    risk_pct: number;
    fallback_sl_pct: number;
  }): { qty: number; margin_alloc: number; risk_amt: number; max_affordable_qty: number } {
    const {
      price,
      sl,
      sizing_mode,
      capital,
      free_margin,
      leverage,
      margin_per_trade,
      risk_pct,
      fallback_sl_pct
    } = params;

    if (price <= 0) {
      return { qty: 0, margin_alloc: 0, risk_amt: 0, max_affordable_qty: 0 };
    }

    const free = Math.max(0, free_margin);
    const max_affordable_qty = Math.floor((free * leverage) / price);

    let qty = 0;
    let risk_amt = 0;

    if (sizing_mode === 'margin') {
      const allowedMargin = Math.min(margin_per_trade, free);
      qty = Math.floor((allowedMargin * leverage) / price);
      risk_amt = Math.abs(price - sl) * qty;
    } else {
      // risk mode
      const slDiff = Math.abs(price - sl);
      const risk_per_share = slDiff > 0 ? slDiff : (price * fallback_sl_pct) / 100;
      risk_amt = (capital * risk_pct) / 100;
      const targetQtyFromRisk = risk_per_share > 0 ? Math.floor(risk_amt / risk_per_share) : 0;
      const marginCapQty = Math.floor((free * leverage) / price);
      qty = Math.floor(Math.min(targetQtyFromRisk, marginCapQty));
    }

    qty = Math.max(0, qty);
    const margin_alloc = qty > 0 ? Math.round(((qty * price) / leverage) * 100) / 100 : 0;

    return {
      qty,
      margin_alloc,
      risk_amt: Math.round(risk_amt * 100) / 100,
      max_affordable_qty
    };
  }

  /**
   * 4.6 Add qty (same position — true netting)
   * extra_margin = add_qty * fill_price / leverage
   * require extra_margin <= free_margin
   * new_qty = old_qty + add_qty
   * new_entry = (old_qty * old_entry + add_qty * fill_price) / new_qty
   * new_margin = old_margin_alloc + extra_margin
   * // SL and Target MUST NOT change
   */
  static computeAddQty(params: {
    old_qty: number;
    old_entry: number;
    old_margin_alloc: number;
    add_qty: number;
    fill_price: number;
    leverage: number;
    free_margin: number;
  }): {
    success: boolean;
    reason?: string;
    extra_margin: number;
    new_qty: number;
    new_entry: number;
    new_margin: number;
  } {
    const {
      old_qty,
      old_entry,
      old_margin_alloc,
      add_qty,
      fill_price,
      leverage,
      free_margin
    } = params;

    if (add_qty <= 0) {
      return {
        success: false,
        reason: 'Quantity to add must be greater than 0',
        extra_margin: 0,
        new_qty: old_qty,
        new_entry: old_entry,
        new_margin: old_margin_alloc
      };
    }

    const extra_margin = Math.round(((add_qty * fill_price) / leverage) * 100) / 100;

    if (extra_margin > free_margin) {
      return {
        success: false,
        reason: `Insufficient free margin: requires ₹${extra_margin.toLocaleString('en-IN', {
          minimumFractionDigits: 2
        })}, but available free margin is ₹${free_margin.toLocaleString('en-IN', {
          minimumFractionDigits: 2
        })}`,
        extra_margin,
        new_qty: old_qty,
        new_entry: old_entry,
        new_margin: old_margin_alloc
      };
    }

    const new_qty = old_qty + add_qty;
    const new_entry = Math.round(((old_qty * old_entry + add_qty * fill_price) / new_qty) * 100) / 100;
    const new_margin = Math.round((old_margin_alloc + extra_margin) * 100) / 100;

    return {
      success: true,
      extra_margin,
      new_qty,
      new_entry,
      new_margin
    };
  }

  /**
   * Recalculate margin for limit order update or EMA track
   */
  static calcMarginAlloc(qty: number, price: number, leverage: number): number {
    return Math.round(((qty * price) / leverage) * 100) / 100;
  }
}
