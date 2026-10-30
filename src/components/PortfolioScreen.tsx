/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle,
  Clock,
  Edit2,
  Lock,
  PlusCircle,
  RefreshCw,
  Trash2,
  X,
  Zap
} from 'lucide-react';
import {
  ConfirmDialog,
  AddQtyModal,
  EditPendingOrderModal,
  EditSlTpModal
} from './Modals';
import { OrderService } from '../services/orderService';
import { PaperOrder, PaperTrade, Settings, StockQuote } from '../types/desk';

interface PortfolioScreenProps {
  pendingOrders: PaperOrder[];
  openTrades: PaperTrade[];
  closedTrades: PaperTrade[];
  quotes: Map<string, StockQuote>;
  settings: Settings;
  freeMargin: number;
  onRefresh: () => void;
}

export const PortfolioScreen: React.FC<PortfolioScreenProps> = ({
  pendingOrders,
  openTrades,
  closedTrades,
  quotes,
  settings,
  freeMargin,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'open' | 'closed'>('open');

  // Modals state
  const [fillMarketOrder, setFillMarketOrder] = useState<PaperOrder | null>(null);
  const [closeTrade, setCloseTrade] = useState<PaperTrade | null>(null);
  const [squareOffConfirm, setSquareOffConfirm] = useState<boolean>(false);
  const [addQtyTrade, setAddQtyTrade] = useState<PaperTrade | null>(null);
  const [editSlTpTrade, setEditSlTpTrade] = useState<PaperTrade | null>(null);
  const [editPendingOrder, setEditPendingOrder] = useState<PaperOrder | null>(null);

  // Active items
  const activePending = pendingOrders.filter((o) => o.status === 'PENDING');
  const activeOpen = openTrades.filter((t) => t.status === 'OPEN');
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayClosed = closedTrades.filter((t) => t.day === todayStr);

  // Stats
  const totalOpenPnl = activeOpen.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalOpenMargin = activeOpen.reduce((sum, t) => sum + (t.margin_alloc || 0), 0);
  const totalPendingMargin = activePending.reduce((sum, o) => sum + (o.margin_alloc || 0), 0);
  const totalRealizedToday = todayClosed.reduce((sum, t) => sum + (t.pnl || 0), 0);

  // Handlers
  const handleConfirmFillMarket = () => {
    if (!fillMarketOrder) return;
    const quote = quotes.get(fillMarketOrder.symbol);
    const ltp = quote ? quote.ltp : fillMarketOrder.limit_price;
    const res = OrderService.fillMarketFromPending({
      orderId: fillMarketOrder.id,
      currentLtp: ltp,
      settings,
      openTrades,
      pendingOrders
    });
    if (!res.success) {
      alert(`Fill Market failed: ${res.error}`);
    }
    setFillMarketOrder(null);
    onRefresh();
  };

  const handleConfirmCloseTrade = () => {
    if (!closeTrade) return;
    const quote = quotes.get(closeTrade.symbol);
    const ltp = quote ? quote.ltp : closeTrade.entry;
    OrderService.closePosition(closeTrade.id, ltp, 'MANUAL_CLOSE');
    setCloseTrade(null);
    onRefresh();
  };

  const handleConfirmSquareOffAll = () => {
    OrderService.squareOffAll(quotes);
    setSquareOffConfirm(false);
    onRefresh();
  };

  const handleTrackEma = (orderId: number, span: number, tf: number) => {
    OrderService.setOrderTrackEma(orderId, span, tf);
    onRefresh();
  };

  const handleCancelOrder = (orderId: number) => {
    OrderService.cancelPendingOrder(orderId);
    onRefresh();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Tab Navigation & Summary */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Sub-tab pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('open')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
              activeTab === 'open'
                ? 'bg-slate-800 text-emerald-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Open Positions</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
              {activeOpen.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-slate-800 text-amber-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Pending Orders</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-mono">
              {activePending.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('closed')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
              activeTab === 'closed'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Closed Today</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300 text-[10px] font-mono">
              {todayClosed.length}
            </span>
          </button>
        </div>

        {/* Global Summary & Action */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <div className="text-slate-400 text-[11px] font-sans">Open P&amp;L:</div>
            <div
              className={`text-sm font-bold ${
                totalOpenPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totalOpenPnl >= 0 ? '+' : ''}₹{totalOpenPnl.toFixed(2)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-slate-400 text-[11px] font-sans">Margin Blocked:</div>
            <div className="text-slate-200 text-sm font-bold">
              ₹{(totalOpenMargin + totalPendingMargin).toLocaleString('en-IN')}
            </div>
          </div>

          {activeOpen.length > 0 && (
            <button
              onClick={() => setSquareOffConfirm(true)}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-sans font-bold rounded-lg transition-colors shadow-xs shrink-0"
            >
              Square-Off All ({activeOpen.length})
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: PENDING ORDERS */}
      {activeTab === 'pending' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider select-none">
                  <th className="py-3 px-4">Order ID / Symbol</th>
                  <th className="py-3 px-3">Side &amp; Qty</th>
                  <th className="py-3 px-3 text-right">Limit Price</th>
                  <th className="py-3 px-3 text-right">Current LTP</th>
                  <th className="py-3 px-3 text-right">SL / Target</th>
                  <th className="py-3 px-3 text-right">Margin Blocked</th>
                  <th className="py-3 px-3">EMA Tracking Note</th>
                  <th className="py-3 px-4 text-center">Row Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {activePending.map((order) => {
                  const quote = quotes.get(order.symbol);
                  const ltp = quote ? quote.ltp : order.limit_price;
                  const isEmaTracking = order.note && order.note.startsWith('EMA|');

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-sans font-bold text-slate-100">
                          #{order.id} · {order.symbol}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(order.created_at).toLocaleTimeString('en-IN')}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                            order.side === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {order.side}
                        </span>{' '}
                        <span className="font-bold text-slate-200">{order.qty} sh</span>
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-slate-100 text-sm">
                        ₹{order.limit_price.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right text-slate-300">
                        ₹{ltp.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right text-[11px]">
                        <div className="text-amber-400">SL: ₹{order.sl}</div>
                        <div className="text-emerald-400">TP: ₹{order.target}</div>
                      </td>

                      <td className="py-3 px-3 text-right font-semibold text-amber-400">
                        ₹{order.margin_alloc.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-3">
                        {isEmaTracking ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 text-[11px] font-semibold">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            {order.note}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Static Limit</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Force Fill Market */}
                          <button
                            onClick={() => setFillMarketOrder(order)}
                            className="px-2 py-1 bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded text-[11px] font-bold transition-colors"
                            title="Force Market Entry at current LTP"
                          >
                            Fill Mkt
                          </button>

                          {/* Quick Track 9EMA 15m */}
                          <button
                            onClick={() => handleTrackEma(order.id, 9, 15)}
                            className="px-2 py-1 bg-cyan-950/60 border border-cyan-800 hover:bg-cyan-900 text-cyan-300 rounded text-[11px] font-medium transition-colors"
                            title="Track 9 EMA (15m)"
                          >
                            9EMA 15m
                          </button>

                          {/* Quick Track 5EMA 5m */}
                          <button
                            onClick={() => handleTrackEma(order.id, 5, 5)}
                            className="px-2 py-1 bg-cyan-950/60 border border-cyan-800 hover:bg-cyan-900 text-cyan-300 rounded text-[11px] font-medium transition-colors"
                            title="Track 5 EMA (5m)"
                          >
                            5EMA 5m
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => setEditPendingOrder(order)}
                            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                            title="Edit Limit, SL, TP, or Qty"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Cancel */}
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                            title="Cancel Order (Release Margin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {activePending.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                      No pending limit orders. Placed limits with EMA tracking will appear here and block margin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: OPEN POSITIONS */}
      {activeTab === 'open' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider select-none">
                  <th className="py-3 px-4">Trade ID / Symbol</th>
                  <th className="py-3 px-3">Side &amp; Qty</th>
                  <th className="py-3 px-3 text-right">Avg Entry (₹)</th>
                  <th className="py-3 px-3 text-right">Current LTP (₹)</th>
                  <th className="py-3 px-3 text-right">Live P&amp;L (₹)</th>
                  <th className="py-3 px-3 text-right">SL / Target</th>
                  <th className="py-3 px-3 text-right">Margin Blocked</th>
                  <th className="py-3 px-4 text-center">Row Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {activeOpen.map((trade) => {
                  const quote = quotes.get(trade.symbol);
                  const ltp = quote ? quote.ltp : trade.entry;
                  const pnl = trade.pnl || 0;
                  const pnlPct = ((ltp - trade.entry) / trade.entry) * 100 * (trade.side === 'BUY' ? 1 : -1);

                  return (
                    <tr
                      key={trade.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-sans font-bold text-slate-100">
                          #{trade.id} · {trade.symbol}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(trade.opened_at).toLocaleTimeString('en-IN')}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                            trade.side === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {trade.side}
                        </span>{' '}
                        <span className="font-bold text-slate-200">{trade.qty} sh</span>
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-slate-100">
                        ₹{trade.entry.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right text-slate-200 font-semibold">
                        ₹{ltp.toFixed(2)}
                      </td>

                      <td
                        className={`py-3 px-3 text-right font-bold text-sm ${
                          pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        <div>
                          {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                        </div>
                        <div className="text-[11px]">
                          ({pnlPct >= 0 ? '+' : ''}
                          {pnlPct.toFixed(2)}%)
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right text-[11px]">
                        <div className="text-amber-400">SL: ₹{trade.sl}</div>
                        <div className="text-emerald-400">TP: ₹{trade.target}</div>
                      </td>

                      <td className="py-3 px-3 text-right text-slate-300 font-semibold">
                        ₹{trade.margin_alloc.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Add Qty (True Netting) */}
                          <button
                            onClick={() => setAddQtyTrade(trade)}
                            className="px-2.5 py-1 bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded text-xs font-bold transition-colors flex items-center gap-1"
                            title="Add Quantity (Section 4.6 True Netting)"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Add Qty
                          </button>

                          {/* Edit SL/TP */}
                          <button
                            onClick={() => setEditSlTpTrade(trade)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                            title="Edit Stop-Loss & Target"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Close Position */}
                          <button
                            onClick={() => setCloseTrade(trade)}
                            className="px-2.5 py-1 bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600 text-rose-300 hover:text-white rounded text-xs font-bold transition-colors"
                            title="Close Position at LTP"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {activeOpen.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                      No open positions active. Place a Market order or wait for Limit order to fill.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CLOSED TRADES TODAY */}
      {activeTab === 'closed' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">
              Today&apos;s Trading Journal ({todayClosed.length} Trades)
            </span>
            <div className="flex items-center gap-4 font-mono">
              <span>
                Realized Net:{' '}
                <span
                  className={`font-bold ${
                    totalRealizedToday >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {totalRealizedToday >= 0 ? '+' : ''}₹{totalRealizedToday.toFixed(2)}
                </span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider select-none">
                  <th className="py-3 px-4">Trade # / Symbol</th>
                  <th className="py-3 px-3">Side &amp; Qty</th>
                  <th className="py-3 px-3 text-right">Entry Price</th>
                  <th className="py-3 px-3 text-right">Exit Price</th>
                  <th className="py-3 px-3 text-right">Realized P&amp;L</th>
                  <th className="py-3 px-3">Exit Reason</th>
                  <th className="py-3 px-3 text-right">Opened At</th>
                  <th className="py-3 px-4 text-right">Closed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {todayClosed.map((trade) => {
                  const pnl = trade.pnl || 0;
                  return (
                    <tr key={trade.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <span className="font-sans font-bold text-slate-200">
                          #{trade.id} · {trade.symbol}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                            trade.side === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {trade.side}
                        </span>{' '}
                        <span>{trade.qty} sh</span>
                      </td>

                      <td className="py-3 px-3 text-right text-slate-300">
                        ₹{trade.entry.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-semibold text-slate-200">
                        ₹{trade.exit_price ? trade.exit_price.toFixed(2) : '-'}
                      </td>

                      <td
                        className={`py-3 px-3 text-right font-bold text-sm ${
                          pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-sans uppercase ${
                            trade.exit_reason === 'TARGET_HIT'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : trade.exit_reason === 'SL_HIT'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {trade.exit_reason || 'CLOSED'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                        {new Date(trade.opened_at).toLocaleTimeString('en-IN')}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                        {trade.closed_at ? new Date(trade.closed_at).toLocaleTimeString('en-IN') : '-'}
                      </td>
                    </tr>
                  );
                })}

                {todayClosed.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                      No trades closed today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOGS & ACTION MODALS */}
      {/* Fill Market Confirm */}
      <ConfirmDialog
        isOpen={!!fillMarketOrder}
        title="Execute Force Market Fill?"
        message={`This will immediately fill Order #${fillMarketOrder?.id} for ${fillMarketOrder?.symbol} (${fillMarketOrder?.side} ${fillMarketOrder?.qty} shares) at the current LTP. An OPEN position will be created and margin will transfer from pending to open.`}
        confirmLabel="Force Fill Market"
        confirmVariant="primary"
        onConfirm={handleConfirmFillMarket}
        onCancel={() => setFillMarketOrder(null)}
      />

      {/* Close Trade Confirm */}
      <ConfirmDialog
        isOpen={!!closeTrade}
        title={`Close Position on ${closeTrade?.symbol}?`}
        message={`Are you sure you want to exit ${closeTrade?.qty} shares of ${closeTrade?.symbol} at current market price? Realized P&L will be credited/debited to your capital and blocked margin will be returned to free margin.`}
        confirmLabel="Confirm Close"
        confirmVariant="danger"
        onConfirm={handleConfirmCloseTrade}
        onCancel={() => setCloseTrade(null)}
      />

      {/* Square-Off All Confirm */}
      <ConfirmDialog
        isOpen={squareOffConfirm}
        title="Square-off All Open Positions?"
        message={`EMERGENCY FLATTEN: Are you sure you want to immediately exit all ${activeOpen.length} active open positions at current market prices?`}
        confirmLabel="Square-Off All"
        confirmVariant="danger"
        onConfirm={handleConfirmSquareOffAll}
        onCancel={() => setSquareOffConfirm(false)}
      />

      {/* Add Quantity Modal */}
      <AddQtyModal
        isOpen={!!addQtyTrade}
        trade={addQtyTrade}
        currentLtp={addQtyTrade ? quotes.get(addQtyTrade.symbol)?.ltp || addQtyTrade.entry : 0}
        leverage={settings.leverage}
        freeMargin={freeMargin}
        onClose={() => setAddQtyTrade(null)}
        onAdd={(addQty, fillPrice) => {
          if (!addQtyTrade) return;
          OrderService.addQtyToOpenPosition({
            tradeId: addQtyTrade.id,
            addQty,
            fillPrice,
            settings,
            openTrades,
            pendingOrders
          });
          onRefresh();
        }}
      />

      {/* Edit SL / TP Modal */}
      <EditSlTpModal
        isOpen={!!editSlTpTrade}
        trade={editSlTpTrade}
        onClose={() => setEditSlTpTrade(null)}
        onSave={(newSl, newTarget) => {
          if (!editSlTpTrade) return;
          editSlTpTrade.sl = newSl;
          editSlTpTrade.target = newTarget;
          onRefresh();
        }}
      />

      {/* Edit Pending Order Modal */}
      <EditPendingOrderModal
        isOpen={!!editPendingOrder}
        order={editPendingOrder}
        leverage={settings.leverage}
        freeMargin={freeMargin}
        onClose={() => setEditPendingOrder(null)}
        onSave={(newLimit, newSl, newTarget, newQty) => {
          if (!editPendingOrder) return;
          OrderService.updatePendingOrder({
            orderId: editPendingOrder.id,
            newLimit,
            newSl,
            newTarget,
            newQty,
            settings,
            openTrades,
            pendingOrders
          });
          onRefresh();
        }}
      />
    </div>
  );
};
