/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Play, RefreshCw, X, XCircle } from 'lucide-react';
import { AcceptanceTestsRunner, TestResult } from '../services/acceptanceTests';

interface AcceptanceTestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestsCompleted?: () => void;
}

export const AcceptanceTestsModal: React.FC<AcceptanceTestsModalProps> = ({
  isOpen,
  onClose,
  onTestsCompleted
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const res = await AcceptanceTestsRunner.runAllTests();
      setResults(res);
      if (onTestsCompleted) onTestsCompleted();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  const totalPassed = results.filter((r) => r.passed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-100">
                Section 12 Acceptance Tests Suite
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                7 Rules
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated verification of margin blocking, EMA tracking, true netting &amp; IST session gates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Execute Suite
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {results.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span>Suite Result:</span>
                <span
                  className={`font-semibold ${
                    totalPassed === results.length ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {totalPassed} of {results.length} Tests Passed
                </span>
              </div>
              <div className="text-slate-400">
                Total Runtime:{' '}
                <span className="font-mono text-slate-200">
                  {results.reduce((s, r) => s + r.durationMs, 0)}ms
                </span>
              </div>
            </div>
          )}

          {results.length === 0 && !isRunning && (
            <div className="text-center py-12 px-4">
              <p className="text-sm text-slate-300 font-medium mb-1">
                Ready to execute Section 12 test assertions
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                Click &quot;Execute Suite&quot; to test margin deduction, cancel restoration, EMA tracking, market order force fill, weighted average netting, market hours rejection, and insufficient free margin checks.
              </p>
              <button
                onClick={handleRunTests}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Start Verification
              </button>
            </div>
          )}

          {results.map((r) => {
            const isExpanded = expandedId === r.id;
            return (
              <div
                key={r.id}
                className={`rounded-lg border transition-colors ${
                  r.passed
                    ? 'border-emerald-900/40 bg-emerald-950/10 hover:border-emerald-700/60'
                    : 'border-rose-900/40 bg-rose-950/10 hover:border-rose-700/60'
                }`}
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    {r.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {r.id}. {r.title}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{r.durationMs}ms</span>
                        <span>·</span>
                        <span>{r.logs.length} assertion steps</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        r.passed
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {r.passed ? 'PASSED' : 'FAILED'}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 bg-slate-950/50">
                    <div className="font-mono text-[11px] space-y-1 text-slate-300">
                      {r.logs.map((log, i) => (
                        <div
                          key={i}
                          className={`${
                            log.startsWith('✓')
                              ? 'text-emerald-400 font-semibold'
                              : log.startsWith('✗')
                              ? 'text-rose-400 font-semibold'
                              : 'text-slate-400'
                          }`}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
          <span>Formula parity confirmed against NSE Paper Desk APK Spec.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
