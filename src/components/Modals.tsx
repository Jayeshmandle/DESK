/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { PaperOrder, PaperTrade } from '../types/desk';
import { MarginService } from '../services/marginService';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        </div>
        <p className="text-sm text-slate-300 mb-6 leading-relaxed">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors rounded-lg bg-slate-800/80 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors ${
              confirmVariant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500'
                : confirmVariant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

interface AddQtyModalProps {
  isOpen: boolean;
  trade: PaperTrade | null;
  currentLtp: number;
  leverage: number;
  freeMargin: number;
  onClose: () => void;
  onAdd: (addQty: number, fillPrice: number) => void;
}

export const AddQtyModal: React.FC<AddQtyModalProps> = ({
  isOpen,
  trade,
  currentLtp,
  leverage,
  freeMargin,
  onClose,
  onAdd
}) => {
  const [qtyToAdd, setQtyToAdd] = useState<number>(10);
  const [customPrice, setCustomPrice] = useState<number>(currentLtp || 0);

  if (!isOpen || !trade) return null;

  const fillPrice = customPrice > 0 ? customPrice : currentLtp || trade.entry;
  const addCalculation = MarginService.computeAddQty({
    old_qty: trade.qty,
    old_entry: trade.entry,
    old_margin_alloc: trade.margin_alloc,
    add_qty: qtyToAdd,
    fill_price: fillPrice,
    leverage,
    free_margin: freeMargin
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Add Quantity (True Netting)
            </h3>
            <p className="text-xs text-slate-400">
              {trade.symbol} · Current Position: {trade.qty} shares @ ₹{trade.entry}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Quantity to Add (shares)
            </label>
            <input
              type="number"
              min="1"
              value={qtyToAdd || ''}
              onChange={(e) => setQtyToAdd(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Fill Price (₹) (Current LTP: ₹{currentLtp})
            </label>
            <input
              type="number"
              step="0.05"
              value={fillPrice}
              onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Netting Preview Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
            <div className="flex justify-between text-slate-400">
              <span>Required Extra Margin</span>
              <span className="font-mono text-slate-200">
                ₹{addCalculation.extra_margin.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Available Free Margin</span>
              <span className="font-mono text-slate-200">
                ₹{freeMargin.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between font-medium">
              <span className="text-slate-300">New Weighted Avg Entry</span>
              <span className="font-mono text-emerald-400 font-semibold">
                ₹{addCalculation.new_entry.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">New Combined Quantity</span>
              <span className="font-mono text-slate-200">{addCalculation.new_qty} shares</span>
            </div>
            <div className="text-[11px] text-slate-400 italic">
              Note: Stop-Loss (₹{trade.sl}) and Target (₹{trade.target}) remain strictly preserved per spec.
            </div>
          </div>

          {!addCalculation.success && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300">
              {addCalculation.reason}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!addCalculation.success}
            onClick={() => {
              onAdd(qtyToAdd, fillPrice);
              onClose();
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Confirm Add Qty
          </button>
        </div>
      </div>
    </div>
  );
};

interface EditSlTpModalProps {
  isOpen: boolean;
  trade: PaperTrade | null;
  onClose: () => void;
  onSave: (newSl: number, newTarget: number) => void;
}

export const EditSlTpModal: React.FC<EditSlTpModalProps> = ({
  isOpen,
  trade,
  onClose,
  onSave
}) => {
  const [sl, setSl] = useState<number>(trade?.sl || 0);
  const [target, setTarget] = useState<number>(trade?.target || 0);
  const [error, setError] = useState<string>('');

  if (!isOpen || !trade) return null;

  const handleSave = () => {
    if (trade.side === 'BUY') {
      if (sl >= trade.entry) {
        setError(`For BUY, Stop-Loss must be below entry price (₹${trade.entry})`);
        return;
      }
      if (target <= trade.entry) {
        setError(`For BUY, Target must be above entry price (₹${trade.entry})`);
        return;
      }
    } else {
      if (sl <= trade.entry) {
        setError(`For SELL, Stop-Loss must be above entry price (₹${trade.entry})`);
        return;
      }
      if (target >= trade.entry) {
        setError(`For SELL, Target must be below entry price (₹${trade.entry})`);
        return;
      }
    }
    setError('');
    onSave(sl, target);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Edit Stop-Loss & Target</h3>
            <p className="text-xs text-slate-400">
              {trade.symbol} · {trade.side} @ ₹{trade.entry}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Stop-Loss (₹)
            </label>
            <input
              type="number"
              step="0.05"
              value={sl}
              onChange={(e) => setSl(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Target (₹)
            </label>
            <input
              type="number"
              step="0.05"
              value={target}
              onChange={(e) => setTarget(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

interface EditPendingOrderModalProps {
  isOpen: boolean;
  order: PaperOrder | null;
  leverage: number;
  freeMargin: number;
  onClose: () => void;
  onSave: (newLimit: number, newSl: number, newTarget: number, newQty: number) => void;
}

export const EditPendingOrderModal: React.FC<EditPendingOrderModalProps> = ({
  isOpen,
  order,
  leverage,
  freeMargin,
  onClose,
  onSave
}) => {
  const [limit, setLimit] = useState<number>(order?.limit_price || 0);
  const [sl, setSl] = useState<number>(order?.sl || 0);
  const [target, setTarget] = useState<number>(order?.target || 0);
  const [qty, setQty] = useState<number>(order?.qty || 1);
  const [error, setError] = useState<string>('');

  if (!isOpen || !order) return null;

  const currentAlloc = order.margin_alloc;
  const newAlloc = MarginService.calcMarginAlloc(qty, limit, leverage);
  const deltaMargin = newAlloc - currentAlloc;

  const handleSave = () => {
    if (order.side === 'BUY') {
      if (sl >= limit) {
        setError(`For BUY, Stop-Loss must be below limit price (₹${limit})`);
        return;
      }
      if (target <= limit) {
        setError(`For BUY, Target must be above limit price (₹${limit})`);
        return;
      }
    } else {
      if (sl <= limit) {
        setError(`For SELL, Stop-Loss must be above limit price (₹${limit})`);
        return;
      }
      if (target >= limit) {
        setError(`For SELL, Target must be below limit price (₹${limit})`);
        return;
      }
    }

    if (deltaMargin > 0 && deltaMargin > freeMargin) {
      setError(
        `Insufficient free margin: requires ₹${deltaMargin.toLocaleString('en-IN')} extra, free margin is ₹${freeMargin.toLocaleString(
          'en-IN'
        )}`
      );
      return;
    }

    setError('');
    onSave(limit, sl, target, qty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Update Pending Order</h3>
            <p className="text-xs text-slate-400">
              #{order.id} · {order.symbol} · {order.side}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Limit Price (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={limit}
                onChange={(e) => setLimit(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Stop-Loss (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={sl}
                onChange={(e) => setSl(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={target}
                onChange={(e) => setTarget(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>New Margin Required</span>
              <span className="font-mono text-slate-200">
                ₹{newAlloc.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Margin Delta</span>
              <span className={`font-mono ${deltaMargin > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {deltaMargin > 0 ? '+' : ''}₹{deltaMargin.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            Save Order
          </button>
        </div>
      </div>
    </div>
  );
};
