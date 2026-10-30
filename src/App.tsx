/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActiveScreen,
  AlertItem,
  PaperOrder,
  PaperTrade,
  SectorSummary,
  Settings,
  StockQuote,
  WatchlistItem
} from './types/desk';
import { DEFAULT_SETTINGS, PortfolioRepository } from './services/portfolioRepository';
import { MarketDataService } from './services/marketDataService';
import { MarginService } from './services/marginService';
import { OrderService } from './services/orderService';
import { HeaderBar } from './components/HeaderBar';
import { BottomNavBar } from './components/BottomNavBar';
import { HomeScreen } from './components/HomeScreen';
import { ScannerScreen } from './components/ScannerScreen';
import { WatchlistScreen } from './components/WatchlistScreen';
import { TradeScreen } from './components/TradeScreen';
import { PortfolioScreen } from './components/PortfolioScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ConnectUpstoxScreen } from './components/ConnectUpstoxScreen';
import { AcceptanceTestsModal } from './components/AcceptanceTestsModal';
import { FlutterExportModal } from './components/FlutterExportModal';
import { AlertCircle, Battery, ShieldCheck, Wifi } from 'lucide-react';

export default function App() {
  // Navigation
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [selectedTradeSymbol, setSelectedTradeSymbol] = useState<string>('RELIANCE');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);

  // Modals
  const [isTestsModalOpen, setIsTestsModalOpen] = useState<boolean>(false);
  const [isFlutterModalOpen, setIsFlutterModalOpen] = useState<boolean>(false);

  // Application Data Store
  const [settings, setSettings] = useState<Settings>(() => PortfolioRepository.getSettings());
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() =>
    PortfolioRepository.getWatchlist()
  );
  const [orders, setOrders] = useState<PaperOrder[]>(() => PortfolioRepository.getOrders());
  const [trades, setTrades] = useState<PaperTrade[]>(() => PortfolioRepository.getTrades());
  const [alerts, setAlerts] = useState<AlertItem[]>(() => PortfolioRepository.getAlerts());

  // Market Data Quotes (empty by default in LIVE mode unless Upstox token is present)
  const [quotes, setQuotes] = useState<Map<string, StockQuote>>(new Map());
  const [sectorSummaries, setSectorSummaries] = useState<SectorSummary[]>([]);

  const isMountedRef = useRef(true);

  const hasUpstoxToken = useMemo(
    () => !!settings.upstox_token && settings.upstox_token.trim().length >= 8,
    [settings.upstox_token]
  );
  const isLiveWithoutToken = settings.data_mode === 'LIVE' && !hasUpstoxToken;

  // Data reload helper
  const reloadDbState = () => {
    setOrders(PortfolioRepository.getOrders());
    setTrades(PortfolioRepository.getTrades());
    setSettings(PortfolioRepository.getSettings());
    setAlerts(PortfolioRepository.getAlerts());
    setWatchlist(PortfolioRepository.getWatchlist());
  };

  // Main Market Tick & EMA Engine Loop
  useEffect(() => {
    isMountedRef.current = true;
    let isProcessing = false;

    const runMarketTick = async () => {
      if (isProcessing) return;
      isProcessing = true;

      try {
        // If in LIVE mode and no token, do NOT fetch or generate mock prices!
        if (settings.data_mode === 'LIVE' && (!settings.upstox_token || settings.upstox_token.trim().length < 8)) {
          MarketDataService.loadCachedQuotes();
          if (isMountedRef.current) {
            setQuotes(new Map(MarketDataService.getAllQuotes().map((q) => [q.symbol, q])));
            setSectorSummaries(MarketDataService.getSectorSummaries());
          }
          return;
        }

        // 1. Refresh quotes (Upstox API in LIVE mode, or sample offline snapshot in DEMO mode)
        const newQuotes = await MarketDataService.refreshQuotes(settings);
        if (!isMountedRef.current) return;
        setQuotes(newQuotes);
        setSectorSummaries(MarketDataService.getSectorSummaries());

        // 2. Process pending orders & update open trades live P&L (respecting market closed gate)
        const currentOrders = PortfolioRepository.getOrders();
        const currentTrades = PortfolioRepository.getTrades();
        const currentSettings = PortfolioRepository.getSettings();

        OrderService.onMarketTick({
          quotes: newQuotes,
          settings: currentSettings,
          openTrades: currentTrades,
          pendingOrders: currentOrders
        });

        // 3. Update state
        setOrders(PortfolioRepository.getOrders());
        setTrades(PortfolioRepository.getTrades());
        setSettings(PortfolioRepository.getSettings());
        setAlerts(PortfolioRepository.getAlerts());
      } catch (err) {
        console.error('Tick processing error:', err);
      } finally {
        isProcessing = false;
      }
    };

    // Run first tick immediately
    runMarketTick();

    const intervalMs = Math.max(1, settings.auto_refresh_sec || 2) * 1000;
    const timer = setInterval(runMarketTick, intervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
    };
  }, [settings.auto_refresh_sec, settings.upstox_token, settings.data_mode]);

  // Derived margin calculations
  const openTrades = useMemo(() => trades.filter((t) => t.status === 'OPEN'), [trades]);
  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'PENDING'), [orders]);
  const closedTrades = useMemo(() => trades.filter((t) => t.status === 'CLOSED'), [trades]);

  const usedMargin = useMemo(
    () => MarginService.calculateUsedMargin(openTrades, pendingOrders),
    [openTrades, pendingOrders]
  );
  const freeMargin = useMemo(
    () => MarginService.calculateFreeMargin(settings.capital, openTrades, pendingOrders),
    [settings.capital, openTrades, pendingOrders]
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const netPnlToday = useMemo(() => {
    const realized = closedTrades
      .filter((t) => t.day === todayStr)
      .reduce((s, t) => s + (t.pnl || 0), 0);
    const unrealized = openTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    return realized + unrealized;
  }, [closedTrades, openTrades, todayStr]);

  // Actions
  const handleAddToWatchlist = (symbol: string) => {
    PortfolioRepository.addToWatchlist(symbol);
    setWatchlist(PortfolioRepository.getWatchlist());
  };

  const handleRemoveFromWatchlist = (symbol: string) => {
    PortfolioRepository.removeFromWatchlist(symbol);
    setWatchlist(PortfolioRepository.getWatchlist());
  };

  const handleTradeSymbol = (symbol: string) => {
    setSelectedTradeSymbol(symbol);
    setActiveScreen('trade');
  };

  const handleResetDb = () => {
    PortfolioRepository.resetAll();
    MarketDataService.clearCache();
    reloadDbState();
    setActiveScreen('home');
  };

  const handleConnectToken = (token: string) => {
    const updated = { ...settings, upstox_token: token, data_mode: 'LIVE' as const };
    PortfolioRepository.saveSettings(updated);
    setSettings(updated);
    setActiveScreen('home');
  };

  const handleEnableDemoMode = () => {
    const updated = { ...settings, data_mode: 'DEMO' as const };
    PortfolioRepository.saveSettings(updated);
    setSettings(updated);
    setActiveScreen('home');
  };

  const handleToggleDataMode = () => {
    const nextMode = settings.data_mode === 'LIVE' ? 'DEMO' : 'LIVE';
    const updated = { ...settings, data_mode: nextMode as 'LIVE' | 'DEMO' };
    PortfolioRepository.saveSettings(updated);
    setSettings(updated);
  };

  // Screen Content Renderer
  const renderScreenContent = () => {
    // Rule 1: On launch, if Settings has no token → show Connect Upstox screen only. No mock prices.
    if (isLiveWithoutToken && activeScreen !== 'settings') {
      return (
        <ConnectUpstoxScreen
          settings={settings}
          onConnectToken={handleConnectToken}
          onEnableDemoMode={handleEnableDemoMode}
          onOpenTests={() => setIsTestsModalOpen(true)}
        />
      );
    }

    switch (activeScreen) {
      case 'home':
        return (
          <HomeScreen
            settings={settings}
            freeMargin={freeMargin}
            usedMargin={usedMargin}
            openTrades={openTrades}
            pendingOrders={pendingOrders}
            closedTrades={closedTrades}
            quotes={quotes}
            sectorSummaries={sectorSummaries}
            alerts={alerts}
            onNavigate={setActiveScreen}
            onTradeSymbol={handleTradeSymbol}
          />
        );
      case 'scanner':
        return (
          <ScannerScreen
            quotes={quotes}
            watchlist={watchlist}
            onAddToWatchlist={handleAddToWatchlist}
            onTradeSymbol={handleTradeSymbol}
          />
        );
      case 'watchlist':
        return (
          <WatchlistScreen
            watchlist={watchlist}
            quotes={quotes}
            onRemoveFromWatchlist={handleRemoveFromWatchlist}
            onAddToWatchlist={handleAddToWatchlist}
            onTradeSymbol={handleTradeSymbol}
          />
        );
      case 'trade':
        return (
          <TradeScreen
            selectedSymbol={selectedTradeSymbol}
            onSelectSymbol={setSelectedTradeSymbol}
            quotes={quotes}
            watchlist={watchlist}
            settings={settings}
            freeMargin={freeMargin}
            openTrades={openTrades}
            pendingOrders={pendingOrders}
            closedTrades={closedTrades}
            onOrderPlaced={() => {
              reloadDbState();
              setActiveScreen('portfolio');
            }}
            onAddToWatchlist={handleAddToWatchlist}
          />
        );
      case 'portfolio':
        return (
          <PortfolioScreen
            pendingOrders={pendingOrders}
            openTrades={openTrades}
            closedTrades={closedTrades}
            quotes={quotes}
            settings={settings}
            freeMargin={freeMargin}
            onRefresh={reloadDbState}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={(newSettings) => {
              setSettings(newSettings);
              reloadDbState();
            }}
            onResetDb={handleResetDb}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-indigo-900 selection:text-white">
      {/* Top Header */}
      <HeaderBar
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        dataMode={settings.data_mode}
        hasUpstoxToken={hasUpstoxToken}
        onToggleDataMode={handleToggleDataMode}
        isMobileFrame={isMobileFrame}
        onToggleMobileFrame={() => setIsMobileFrame(!isMobileFrame)}
        onOpenTests={() => setIsTestsModalOpen(true)}
        onOpenFlutterCode={() => setIsFlutterModalOpen(true)}
        freeMargin={freeMargin}
        netPnl={netPnlToday}
      />

      {/* Mode Banner */}
      {settings.data_mode === 'DEMO' ? (
        <div className="bg-amber-950/40 border-b border-amber-800/60 px-6 py-2 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>DEMO MODE ACTIVE:</strong> Offline sample snapshot data. To stream official live NSE ticks, switch to LIVE mode with your Upstox v2 token.
            </span>
          </div>
          <button
            onClick={() => handleToggleDataMode()}
            className="text-[11px] underline font-semibold hover:text-white shrink-0 ml-4"
          >
            Switch to LIVE Mode →
          </button>
        </div>
      ) : (
        <div className="bg-slate-950/80 border-b border-slate-900 px-6 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">
              <strong className="text-slate-300">LIVE MODE:</strong> Upstox v2 REST feed. Paper orders are user-initiated only — zero auto-placed orders.
            </span>
          </div>
          <div className="font-mono text-slate-400 hidden sm:block shrink-0 pl-4">
            IST 09:15–15:30 Session
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isMobileFrame ? (
        /* Android Phone Simulation Frame */
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-slate-950">
          <div className="w-full max-w-[420px] h-[850px] bg-slate-900 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 flex flex-col relative overflow-hidden ring-1 ring-slate-700/50">
            {/* Phone Top Notch / Speaker & Camera */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-950 rounded-full z-50 flex items-center justify-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-800" />
              <div className="w-8 h-1 rounded-full bg-slate-800" />
            </div>

            {/* Android Status Bar */}
            <div className="pt-3 px-6 pb-2 flex items-center justify-between text-[11px] font-mono text-slate-400 z-40 bg-slate-900 select-none">
              <span>09:45</span>
              <div className="flex items-center gap-2">
                <Wifi className="w-3 h-3 text-slate-400" />
                <span className="text-[10px]">5G</span>
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>

            {/* Inner App Container with Mobile Scroll */}
            <div className="flex-1 overflow-y-auto px-3 pt-2 pb-20 no-scrollbar bg-[#0b0f17] rounded-[28px]">
              {renderScreenContent()}
            </div>

            {/* Fixed Bottom APK Navigation Bar inside Phone */}
            {!isLiveWithoutToken && (
              <BottomNavBar
                activeScreen={activeScreen}
                onNavigate={setActiveScreen}
                pendingCount={pendingOrders.length}
                openCount={openTrades.length}
              />
            )}
          </div>
        </div>
      ) : (
        /* Full Desktop / Responsive Terminal Desk View */
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
          {renderScreenContent()}
        </main>
      )}

      {/* Bottom Nav Bar on Mobile Screens (when not in simulated frame) */}
      {!isMobileFrame && !isLiveWithoutToken && (
        <div className="lg:hidden">
          <BottomNavBar
            activeScreen={activeScreen}
            onNavigate={setActiveScreen}
            pendingCount={pendingOrders.length}
            openCount={openTrades.length}
          />
        </div>
      )}

      {/* Interactive Acceptance Tests Modal */}
      <AcceptanceTestsModal
        isOpen={isTestsModalOpen}
        onClose={() => setIsTestsModalOpen(false)}
        onTestsCompleted={reloadDbState}
      />

      {/* Flutter Source Code & APK Export Modal */}
      <FlutterExportModal
        isOpen={isFlutterModalOpen}
        onClose={() => setIsFlutterModalOpen(false)}
      />
    </div>
  );
}
