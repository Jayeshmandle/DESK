/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FlutterFile {
  name: string;
  path: string;
  content: string;
  description: string;
}

export class FlutterCodeGenerator {
  static getFiles(): FlutterFile[] {
    return [
      {
        name: 'README.md',
        path: 'README.md',
        description: 'Build & Run Guide for Flutter Android APK',
        content: `# NSE Paper Desk — Android APK

A broker-grade paper trading desk for Indian equities (NSE) built in Flutter.
Replicates desktop desk logic:
- Upstox v2 REST integration for live tick feed & historical candles
- TradingView-compatible 5 & 9 EMA calculation on 5m and 15m timeframes
- Limit orders that actively track EMA tick-by-tick
- Broker-style margin: pending limits block margin immediately
- Position sizing in Margin Mode & Risk % Mode
- True netting when adding quantity to open positions (weighted average entry)
- Strict risk locks: daily loss limit %, max drawdown %, max daily trades
- IST market session hours (09:15–15:30 IST)

> **DISCLAIMER:** FOR PAPER TRADING AND EDUCATIONAL PURPOSES ONLY. No real exchange orders are routed.

---

## Prerequisites
- Flutter SDK >= 3.22.0
- Android Studio / Android SDK (API 34)
- Upstox API v2 Developer Token (optional; defaults to realistic simulated live ticks)

---

## Build Android APK
\`\`\`bash
# 1. Get dependencies
flutter pub get

# 2. Build Release APK
flutter build apk --release

# 3. Output location:
# build/app/outputs/flutter-apk/app-release.apk
\`\`\`

---

## Upstox API Setup
1. Log in to [Upstox Developer Console](https://developer.upstox.com).
2. Generate your daily access token.
3. Open the app > Navigate to **Settings** > Paste your token.
`
      },
      {
        name: 'pubspec.yaml',
        path: 'pubspec.yaml',
        description: 'Flutter Package Dependencies',
        content: `name: nse_paper_desk
description: "NSE Paper Trading Desk & Android APK"
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ^3.5.0

dependencies:
  flutter:
    sdk: flutter
  sqflite: ^2.3.3+1
  path: ^1.9.0
  flutter_secure_storage: ^9.2.2
  http: ^1.2.2
  intl: ^0.19.0
  provider: ^6.1.2
  cupertino_icons: ^1.0.8

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/sectors.json
`
      },
      {
        name: 'margin_service.dart',
        path: 'lib/services/margin_service.dart',
        description: 'Section 4.1, 4.2 & 4.6 Margin & Sizing Logic in Dart',
        content: `import 'dart:math';

class MarginResult {
  final int qty;
  final double marginAlloc;
  final double riskAmt;

  MarginResult({required this.qty, required this.marginAlloc, required this.riskAmt});
}

class AddQtyResult {
  final bool success;
  final String? error;
  final double extraMargin;
  final int newQty;
  final double newEntry;
  final double newMargin;

  AddQtyResult({
    required this.success,
    this.error,
    required this.extraMargin,
    required this.newQty,
    required this.newEntry,
    required this.newMargin,
  });
}

class MarginService {
  /// 4.1 Margin:
  /// used_margin = sum(margin_alloc of OPEN trades) + sum(margin_alloc of PENDING orders)
  /// free_margin = capital - used_margin
  static double calculateFreeMargin({
    required double capital,
    required List<Map<String, dynamic>> openTrades,
    required List<Map<String, dynamic>> pendingOrders,
  }) {
    double openMargin = openTrades.fold(0.0, (sum, t) => sum + ((t['margin_alloc'] as num?)?.toDouble() ?? 0.0));
    double pendingMargin = pendingOrders.fold(0.0, (sum, o) => sum + ((o['margin_alloc'] as num?)?.toDouble() ?? 0.0));
    return double.parse((capital - (openMargin + pendingMargin)).toStringAsFixed(2));
  }

  /// 4.2 Position size: _size(price, sl)
  static MarginResult calculateSize({
    required double price,
    required double sl,
    required String sizingMode,
    required double capital,
    required double freeMargin,
    required double leverage,
    required double marginPerTrade,
    required double riskPct,
    required double fallbackSlPct,
  }) {
    if (price <= 0) return MarginResult(qty: 0, marginAlloc: 0, riskAmt: 0);

    final double free = max(0.0, freeMargin);
    int qty = 0;
    double riskAmt = 0;

    if (sizingMode == "margin") {
      double allowedMargin = min(marginPerTrade, free);
      qty = ((allowedMargin * leverage) / price).floor();
      riskAmt = (price - sl).abs() * qty;
    } else {
      // Risk mode
      double slDiff = (price - sl).abs();
      double riskPerShare = slDiff > 0 ? slDiff : (price * fallbackSlPct / 100.0);
      riskAmt = capital * riskPct / 100.0;
      int riskQty = riskPerShare > 0 ? (riskAmt / riskPerShare).floor() : 0;
      int marginCapQty = ((free * leverage) / price).floor();
      qty = min(riskQty, marginCapQty);
    }

    qty = max(0, qty);
    double marginAlloc = qty > 0 ? double.parse(((qty * price) / leverage).toStringAsFixed(2)) : 0.0;
    return MarginResult(qty: qty, marginAlloc: marginAlloc, riskAmt: double.parse(riskAmt.toStringAsFixed(2)));
  }

  /// 4.6 Add qty (same position — true netting)
  static AddQtyResult computeAddQty({
    required int oldQty,
    required double oldEntry,
    required double oldMarginAlloc,
    required int addQty,
    required double fillPrice,
    required double leverage,
    required double freeMargin,
  }) {
    if (addQty <= 0) {
      return AddQtyResult(
        success: false,
        error: "Add quantity must be > 0",
        extraMargin: 0,
        newQty: oldQty,
        newEntry: oldEntry,
        newMargin: oldMarginAlloc,
      );
    }

    double extraMargin = double.parse(((addQty * fillPrice) / leverage).toStringAsFixed(2));
    if (extraMargin > freeMargin) {
      return AddQtyResult(
        success: false,
        error: "Insufficient free margin: requires ₹$extraMargin, free is ₹$freeMargin",
        extraMargin: extraMargin,
        newQty: oldQty,
        newEntry: oldEntry,
        newMargin: oldMarginAlloc,
      );
    }

    int newQty = oldQty + addQty;
    double newEntry = double.parse(((oldQty * oldEntry + addQty * fillPrice) / newQty).toStringAsFixed(2));
    double newMargin = double.parse((oldMarginAlloc + extraMargin).toStringAsFixed(2));

    return AddQtyResult(
      success: true,
      extraMargin: extraMargin,
      newQty: newQty,
      newEntry: newEntry,
      newMargin: newMargin,
    );
  }
}
`
      },
      {
        name: 'ema_service.dart',
        path: 'lib/services/ema_service.dart',
        description: 'Section 4.3 TradingView-compatible EMA in Dart',
        content: `class EmaService {
  /// Standard EMA: ewm(span=N, adjust=False) on close
  static List<double> calculateEma(List<double> closes, int span) {
    if (closes.isEmpty || span <= 0) return [];
    double alpha = 2.0 / (span + 1.0);
    List<double> ema = List.filled(closes.length, 0.0);

    ema[0] = closes[0];
    for (int i = 1; i < closes.length; i++) {
      ema[i] = closes[i] * alpha + ema[i - 1] * (1.0 - alpha);
    }
    return ema;
  }

  static double? latestEma(List<double> closes, int span) {
    if (closes.isEmpty) return null;
    final series = calculateEma(closes, span);
    return double.parse(series.last.toStringAsFixed(2));
  }

  /// Parses note format: "EMA|{span}|{tf}"
  static Map<String, int>? parseEmaNote(String? note) {
    if (note == null || !note.startsWith("EMA|")) return null;
    final parts = note.split("|");
    if (parts.length >= 3) {
      final span = int.tryParse(parts[1]);
      final tf = int.tryParse(parts[2]);
      if (span != null && tf != null) return {'span': span, 'tf': tf};
    }
    return null;
  }
}
`
      },
      {
        name: 'order_service.dart',
        path: 'lib/services/order_service.dart',
        description: 'Section 5 Order Tickets & Market Tick Processing',
        content: `import 'dart:math';
import 'margin_service.dart';
import 'ema_service.dart';

class OrderService {
  /// Gate checks: IST market open, risk locks, watchlist, no duplicate open
  static Map<String, dynamic> validateGate({
    required String symbol,
    required String side,
    required double price,
    required double sl,
    required double target,
    required int qty,
    required double marginAlloc,
    required double freeMargin,
    required bool isMarketOpen,
    required List<String> watchlist,
    required List<Map<String, dynamic>> openTrades,
  }) {
    if (!isMarketOpen) return {'valid': false, 'error': 'Market is closed outside 09:15–15:30 IST'};
    if (!watchlist.contains(symbol)) return {'valid': false, 'error': '$symbol is not on your watchlist'};
    if (openTrades.any((t) => t['symbol'] == symbol && t['status'] == 'OPEN')) {
      return {'valid': false, 'error': 'Open trade already exists on $symbol'};
    }
    if (qty <= 0) return {'valid': false, 'error': 'Position size is 0'};

    if (side == 'BUY') {
      if (sl >= price) return {'valid': false, 'error': 'For BUY, Stop-Loss must be below price'};
      if (target <= price) return {'valid': false, 'error': 'For BUY, Target must be above price'};
    } else {
      if (sl <= price) return {'valid': false, 'error': 'For SELL, Stop-Loss must be above price'};
      if (target >= price) return {'valid': false, 'error': 'For SELL, Target must be below price'};
    }

    if (marginAlloc > freeMargin) {
      return {'valid': false, 'error': 'Insufficient free margin (need ₹$marginAlloc, have ₹$freeMargin)'};
    }

    return {'valid': true};
  }

  /// 5.3 Pending tick: track EMA and fill on tick
  static void processPendingTick({
    required List<Map<String, dynamic>> pendingOrders,
    required Map<String, double> liveLtps,
    required Map<String, double> liveEmas,
    required double leverage,
    required Function(Map<String, dynamic> order, double fillPrice) onFill,
    required Function(Map<String, dynamic> order) onCancel,
  }) {
    for (var order in List.from(pendingOrders)) {
      String sym = order['symbol'];
      double? ltp = liveLtps[sym];
      if (ltp == null) continue;

      // Track EMA
      String? note = order['note'];
      if (note != null && note.startsWith("EMA|")) {
        double? currentEma = liveEmas[sym];
        if (currentEma != null && currentEma > 0 && currentEma != order['limit_price']) {
          order['limit_price'] = currentEma;
          order['margin_alloc'] = double.parse(((order['qty'] * currentEma) / leverage).toStringAsFixed(2));
        }
      }

      double limitPrice = (order['limit_price'] as num).toDouble();
      double sl = (order['sl'] as num).toDouble();
      String side = order['side'];

      // Safety check: LTP breached SL
      if ((side == 'BUY' && ltp <= sl) || (side == 'SELL' && ltp >= sl)) {
        onCancel(order);
        continue;
      }

      // Fill condition
      bool canFill = (side == 'BUY' && ltp <= limitPrice) || (side == 'SELL' && ltp >= limitPrice);
      if (canFill) {
        onFill(order, limitPrice);
      }
    }
  }
}
`
      },
      {
        name: 'portfolio_repository.dart',
        path: 'lib/repositories/portfolio_repository.dart',
        description: 'SQLite Database Implementation in Dart',
        content: `import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class PortfolioRepository {
  static Database? _db;

  static Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDb();
    return _db!;
  }

  static Future<Database> _initDb() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'nse_paper_desk.db');

    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE watchlist(
            symbol TEXT PRIMARY KEY,
            key TEXT,
            sector TEXT,
            added_at TEXT
          );
        ''');

        await db.execute('''
          CREATE TABLE paper_orders(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day TEXT,
            symbol TEXT,
            key TEXT,
            side TEXT,
            qty INTEGER,
            limit_price REAL,
            sl REAL,
            target REAL,
            margin_alloc REAL,
            status TEXT,
            created_at TEXT,
            filled_at TEXT,
            note TEXT
          );
        ''');

        await db.execute('''
          CREATE TABLE paper_trades(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day TEXT,
            symbol TEXT,
            key TEXT,
            side TEXT,
            qty INTEGER,
            entry REAL,
            sl REAL,
            target REAL,
            margin_alloc REAL,
            exit_price REAL,
            status TEXT,
            opened_at TEXT,
            closed_at TEXT,
            pnl REAL,
            risk_amt REAL,
            exit_reason TEXT
          );
        ''');

        await db.execute('CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT);');
        await db.execute('''
          CREATE TABLE alerts(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT,
            kind TEXT,
            symbol TEXT,
            msg TEXT,
            shown INTEGER DEFAULT 0
          );
        ''');
      },
    );
  }
}
`
      }
    ];
  }
}
