# NSE Paper Desk — AI Studio APK Spec Pack
# Replicate THIS logic in Flutter (or React Native) Android APK.
# Do NOT use Streamlit. Do NOT use Chartink. Paper trading only. Upstox API for market data.

---

## 1. Mission

Build an Android APK that behaves like the desktop NSE paper-trading desk:
- Sector scanner (built-in sector→stock map)
- Watchlist
- Order ticket: MARKET / LIMIT + optional 5/9 EMA on 5m/15m
- Pending limits that can TRACK EMA (limit follows EMA each tick)
- Open positions with live P&L, edit SL/TP, ADD QTY (same row, weighted avg entry)
- Broker-style margin: pending limits BLOCK margin
- Risk locks, IST market hours 09:15–15:30

Tech: Flutter preferred. Local SQLite. Upstox v2 REST for LTP + candles. Secure token storage.

---

## 2. Settings (defaults)

```
capital / equity     = 500000
leverage             = 5.0
sizing_mode          = "margin"   // or "risk"
margin_per_trade     = 30000
risk_pct             = 1.0        // when sizing_mode == risk
rr_mult              = 2.0
fallback_sl_pct      = 0.5        // % of price if no SL
daily_loss_limit_pct = 3.0
max_drawdown_pct     = 6.0
max_trades_day       = (user setting)
auto_refresh_sec     = 2–3
timezone             = Asia/Kolkata
```

---

## 3. Database schema (SQLite)

```sql
watchlist(symbol TEXT PRIMARY KEY, key TEXT, sector TEXT, added_at TEXT);

paper_orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT, symbol TEXT, key TEXT, side TEXT,
  qty INTEGER, limit_price REAL, sl REAL, target REAL,
  margin_alloc REAL, status TEXT,  -- PENDING | FILLED | CANCELLED
  created_at TEXT, filled_at TEXT,
  note TEXT  -- "EMA|9|15" when tracking EMA
);

paper_trades(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT, symbol TEXT, key TEXT, side TEXT,
  qty INTEGER, entry REAL, sl REAL, target REAL,
  margin_alloc REAL, exit_price REAL,
  status TEXT,  -- OPEN | CLOSED
  opened_at TEXT, closed_at TEXT, pnl REAL,
  risk_amt REAL, exit_reason TEXT
);

settings(key TEXT PRIMARY KEY, value TEXT);
alerts(id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, kind TEXT, symbol TEXT, msg TEXT, shown INTEGER DEFAULT 0);
```

---

## 4. Core formulas (replicate exactly)

### 4.1 Margin

```
used_margin = sum(margin_alloc of OPEN trades) + sum(margin_alloc of PENDING orders)
free_margin = capital - used_margin   // capital = equity including realized P&L adjustments you store
```

### 4.2 Position size `_size(price, sl)`

```
free = free_margin
if sizing_mode == "margin":
  qty = floor(min(margin_per_trade, free) * leverage / price)
else:  // risk
  risk_per_share = abs(price - sl) or price * fallback_sl_pct / 100
  risk_amt = capital * risk_pct / 100
  qty = floor(min(risk_amt / risk_per_share, free * leverage / price))
margin_alloc = qty * price / leverage   // if qty > 0 else 0
return (qty, margin_alloc)
```

### 4.3 EMA (TradingView-compatible)

```
// Standard EMA: ewm(span=N, adjust=False) on close
// Prefer multi-day Upstox historical 5minute or 15minute (days≈12)
// Fallback: resample today's 1m bars to TF with NSE session origin 09:15 IST
// Resample: origin = day_start + 09:15, label=left, closed=left
ema_entry(symbol, span=5|9, tf_min=5|15) -> rounded 2 decimals or null
```

### 4.4 RR target

```
dirn = +1 for BUY/LONG, -1 for SELL/SHORT
target = entry + dirn * rr_mult * abs(entry - sl)
```

### 4.5 Live P&L

```
// OPEN position
pnl = (ltp - entry) * qty * (side == BUY ? 1 : -1)
```

### 4.6 Add qty (same position — true netting)

```
extra_margin = add_qty * fill_price / leverage
require extra_margin <= free_margin
new_qty   = old_qty + add_qty
new_entry = (old_qty * old_entry + add_qty * fill_price) / new_qty
new_margin = old_margin_alloc + extra_margin
// SL and Target MUST NOT change
```

---

## 5. Paper trading operations (reference behaviour)

### 5.1 Market order
- Gate: market open IST; risk locks not triggered; symbol on watchlist; no existing OPEN on symbol
- Fill at LTP; qty/margin from `_size`; status OPEN
- SL required on correct side; default target from rr_mult if missing

### 5.2 Limit order `paper_limit(sym, side, price, sl, target, track_ema?)`
- Same gates; qty/margin from `_size(limit_price, sl)`
- Insert PENDING; **margin blocked immediately**
- If `track_ema = (span, tf)` store `note = "EMA|{span}|{tf}"` e.g. `EMA|9|15`

### 5.3 Pending tick (every refresh / background poll)
For each PENDING order:
1. If `note` starts with `EMA|`: parse span, tf → `ema_entry` → update `limit_price` and recalc `margin_alloc = qty * ema / leverage`
2. If LTP breaches SL → cancel pending (optional safety)
3. Fill when: BUY and LTP <= limit_price, or SELL and LTP >= limit_price
4. On fill: status FILLED; insert OPEN trade at **limit_price** (or LTP for market-from-limit); margin moves pending→open

### 5.4 Fill market (from pending)
- User force-entry at current LTP
- Same qty/SL/target; mark order FILLED note=`market fill`; open position at LTP
- Reject if market closed, no LTP, or OPEN already exists on symbol, or LTP past SL

### 5.5 Cancel pending
- Status CANCELLED → margin released (no longer in used_margin)

### 5.6 Close position
- P&L at LTP (minus optional charges); status CLOSED; release margin; update capital by realized P&L

### 5.7 Update pending
- Allow edit limit/SL/target/qty
- If margin increases, require free_margin >= delta

---

## 6. Order ticket UI rules

```
Entry from:
  Manual | 5 EMA · 5 min | 5 EMA · 15 min | 9 EMA · 5 min | 9 EMA · 15 min

If EMA selected:
  - Compute ema_entry
  - Prefill Limit price
  - Auto-refresh ON  → live-update limit to EMA each poll
  - Auto-refresh OFF → freeze until Refresh EMA
On Place LIMIT with EMA selected → pass track_ema so pending follows EMA
```

BUY: SL below price, Target above.  
SELL: SL above price, Target below.

---

## 7. Screens (bottom navigation)

1. **Home** — equity, free margin, net P&L, bias, top sectors  
2. **Scanner** — sector list → stocks (LTP, RS, RVOL, score/grade) → add watchlist  
3. **Watchlist** — symbols, LTP, trade button  
4. **Trade** — full order ticket  
5. **Portfolio** — Pending | Open | Closed today  
6. **Settings** — token, capital, leverage, sizing, risk locks, auto-refresh  

Pending row actions: Save | Fill mkt | Cancel | Track 9EMA 15m | Track 5EMA 5m  
Open row actions: Edit SL/TP | Add qty | Close  

---

## 8. Sector → stock map (JSON asset)

Use this map for Scanner (expand later as needed):

```json
{
  "Nifty Private Bank": ["HDFCBANK","ICICIBANK","AXISBANK","KOTAKBANK","INDUSINDBK","FEDERALBNK","IDFCFIRSTB","BANDHANBNK","RBLBANK","AUBANK"],
  "Nifty PSU Bank": ["SBIN","BANKBARODA","PNB","CANBK","UNIONBANK","INDIANB","BANKINDIA","MAHABANK","IOB","UCOBANK","CENTRALBK","PSB"],
  "Nifty IT": ["TCS","INFY","HCLTECH","WIPRO","TECHM","LTIM","PERSISTENT","COFORGE","MPHASIS","OFSS","LTTS","TATAELXSI","TATATECH","BSOFT","CYIENT","KPITTECH","SONATSOFTW"],
  "Nifty Auto": ["MARUTI","M&M","BAJAJ-AUTO","EICHERMOT","HEROMOTOCO","TVSMOTOR","ASHOKLEY","BOSCHLTD","MRF","BALKRISIND","TIINDIA","MOTHERSON","EXIDEIND","TATAMOTORS","APOLLOTYRE","BHARATFORG","SONACOMS","HYUNDAI","UNOMINDA"],
  "Nifty Pharma": ["SUNPHARMA","CIPLA","DRREDDY","DIVISLAB","LUPIN","AUROPHARMA","TORNTPHARM","ZYDUSLIFE","ALKEM","GLENMARK","MANKIND","ABBOTINDIA","IPCALAB","GLAND","NATCOPHARM","BIOCON","AJANTPHARM","LAURUSLABS","WOCKPHARMA","PPLPHARMA"],
  "Nifty Metal": ["TATASTEEL","JSWSTEEL","HINDALCO","VEDL","JINDALSTEL","SAIL","NMDC","NATIONALUM","APLAPOLLO","HINDCOPPER","WELCORP","RATNAMANI","JSL","HINDZINC","LLOYDSME"],
  "Nifty FMCG": ["HINDUNILVR","ITC","NESTLEIND","BRITANNIA","TATACONSUM","DABUR","GODREJCP","MARICO","COLPAL","VBL","EMAMILTD","RADICO","UBL","UNITDSPR","PATANJALI","GODFRYPHLP"],
  "Nifty Realty": ["DLF","GODREJPROP","LODHA","OBEROIRLTY","PRESTIGE","PHOENIXLTD","BRIGADE","SOBHA","MAHLIFE","ANANTRAJ","ABREL"],
  "Nifty Consumer Durables": ["TITAN","DIXON","VOLTAS","HAVELLS","BLUESTARCO","CROMPTON","KALYANKJIL","WHIRLPOOL","AMBER","PGEL","KAJARIACER","THANGAMAYL","BATAINDIA","LGEINDIA"],
  "Nifty Oil & Gas": ["RELIANCE","ONGC","IOC","BPCL","GAIL","HINDPETRO","OIL","PETRONET","IGL","MGL","GUJGAS"],
  "Nifty Energy": ["NTPC","POWERGRID","TATAPOWER","ADANIGREEN","ADANIPOWER","NHPC","COALINDIA","JSWENERGY","TORNTPOWER","SUZLON","IREDA"],
  "Nifty Infrastructure": ["LT","ADANIPORTS","BHARTIARTL","ULTRACEMCO","GRASIM","SIEMENS","ABB","CUMMINSIND","SHREECEM","AMBUJACEM","ACC","DALBHARAT","RAMCOCEM","JKCEMENT","POLYCAB","KEI","CGPOWER"],
  "Nifty Financial Services": ["BAJFINANCE","BAJAJFINSV","SHRIRAMFIN","CHOLAFIN","MUTHOOTFIN","PFC","RECLTD","JIOFIN","ANGELONE","CAMS","IEX","IRFC","LICHSGFIN","MANAPPURAM","LTF","SBICARD","HDFCAMC","POONAWALLA","IIFL","BSE","CDSL","MCX"],
  "Nifty Bank": ["HDFCBANK","ICICIBANK","AXISBANK","KOTAKBANK","SBIN","INDUSINDBK","BANKBARODA","FEDERALBNK","IDFCFIRSTB","PNB","AUBANK"],
  "Nifty Insurance": ["SBILIFE","HDFCLIFE","LICI","ICICIGI","ICICIPRULI","MFSL","GICRE","STARHEALTH","NIACL","GODIGIT","NIVABUPA","CANHLIFE"],
  "Nifty Ind Defence": ["HAL","BEL","BDL","MAZDOCK","GRSE","COCHINSHIP","BEML","SOLARINDS","DATAPATTNS","ZENTEC","PARAS","KAYNES","MTARTECH","ASTRAMICRO","MIDHANI","AXISCADES","DYNAMATECH","CENTUM","APOLLO"],
  "Nifty PSE": ["NTPC","POWERGRID","COALINDIA","ONGC","SAIL","NMDC","BEL","HAL","BHEL","CONCOR","IRFC"],
  "Nifty CPSE": ["ONGC","COALINDIA","NTPC","POWERGRID","BEL","HAL","SAIL","NMDC","BPCL","IOC"]
}
```

Also map symbol→sector for reverse lookup (first sector wins if duplicates).

---

## 9. Scoring (scanner board — simplified portable version)

```
rs = stock_day_change_pct - sector_day_change_pct
vwap_dist_pct = (ltp - vwap) / vwap * 100
rvol = today_volume / expected_volume_so_far
score ≈ 0.40*rs_component + 0.25*vwap_component + 0.20*pattern_component + 0.15*rvol_component
grade = A if score >= a_cut and rvol >= rvol_min else B if score >= b_cut else C
```
Exact desktop weights can be approximated; margin/EMA/fills matter more than perfect score parity.

---

## 10. Upstox data (v2)

- LTP: market-quote/ltp  
- Intraday 1m: historical-candle/intraday/{instrument_key}/1minute  
- Historical TF: historical-candle/{instrument_key}/5minute|15minute/{to}/{from}  
- Instrument keys: resolve NSE equity symbols to `NSE_EQ|...` keys (maintain local map or instruments dump)

Auth: user pastes access token in Settings; store in secure storage; Authorization: Bearer {token}

---

## 11. Out of scope (v1)

- Chartink / any web scraper  
- Real exchange order routing  
- Options / F&O  
- Desktop-only quant engines / coach bots  
- Sharing DB with desktop (phone has its own SQLite)

---

## 12. Acceptance tests (must pass)

1. Place LIMIT → free_margin decreases by margin_alloc immediately  
2. Cancel PENDING → free_margin restored  
3. Place LIMIT with 9 EMA 15m → note=EMA|9|15 → after poll, limit_price updates toward live 9 EMA  
4. Fill mkt on pending → OPEN at LTP; pending gone; margin still used on open  
5. Add qty → weighted avg entry; SL/TP unchanged; free_margin decreases  
6. MARKET order outside 09:15–15:30 IST → rejected  
7. Insufficient free margin → order rejected with clear message  

---

## 13. Implementation instruction to the model

Replicate the **behaviour and formulas in sections 4–5** in Flutter/Dart (or RN).  
Treat this document as the source of truth — not Streamlit widgets.  
Prefer clear services: `MarginService`, `OrderService`, `EmaService`, `MarketDataService`, `PortfolioRepository`.  
Dark theme, large BUY/SELL, confirm dialogs on Fill mkt / Square-off all.  
Ship README: set token, `flutter build apk`, paper-only disclaimer.

END OF SPEC
