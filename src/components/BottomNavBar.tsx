/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Briefcase,
  Home,
  Layers,
  ListOrdered,
  Settings as SettingsIcon,
  Zap
} from 'lucide-react';
import { ActiveScreen } from '../types/desk';

interface BottomNavBarProps {
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  pendingCount: number;
  openCount: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeScreen,
  onNavigate,
  pendingCount,
  openCount
}) => {
  const navItems = [
    { id: 'home' as ActiveScreen, label: 'Home', icon: Home },
    { id: 'scanner' as ActiveScreen, label: 'Scanner', icon: Layers },
    { id: 'watchlist' as ActiveScreen, label: 'Watchlist', icon: ListOrdered },
    { id: 'trade' as ActiveScreen, label: 'Trade', icon: Zap },
    {
      id: 'portfolio' as ActiveScreen,
      label: 'Portfolio',
      icon: Briefcase,
      badge: pendingCount + openCount > 0 ? pendingCount + openCount : undefined
    },
    { id: 'settings' as ActiveScreen, label: 'Settings', icon: SettingsIcon }
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 border-t border-slate-800 backdrop-blur-md pb-safe select-none">
      <div className="max-w-md mx-auto grid grid-cols-6 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center relative py-1 transition-colors ${
                isActive ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-bold text-[9px] flex items-center justify-center font-mono">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-full px-1">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
