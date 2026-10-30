/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SECTOR_STOCKS_MAP: Record<string, string[]> = {
  "Nifty Private Bank": [
    "HDFCBANK", "ICICIBANK", "AXISBANK", "KOTAKBANK", "INDUSINDBK",
    "FEDERALBNK", "IDFCFIRSTB", "BANDHANBNK", "RBLBANK", "AUBANK"
  ],
  "Nifty PSU Bank": [
    "SBIN", "BANKBARODA", "PNB", "CANBK", "UNIONBANK",
    "INDIANB", "BANKINDIA", "MAHABANK", "IOB", "UCOBANK", "CENTRALBK", "PSB"
  ],
  "Nifty IT": [
    "TCS", "INFY", "HCLTECH", "WIPRO", "TECHM", "LTIM",
    "PERSISTENT", "COFORGE", "MPHASIS", "OFSS", "LTTS",
    "TATAELXSI", "TATATECH", "BSOFT", "CYIENT", "KPITTECH", "SONATSOFTW"
  ],
  "Nifty Auto": [
    "MARUTI", "M&M", "BAJAJ-AUTO", "EICHERMOT", "HEROMOTOCO",
    "TVSMOTOR", "ASHOKLEY", "BOSCHLTD", "MRF", "BALKRISIND",
    "TIINDIA", "MOTHERSON", "EXIDEIND", "TATAMOTORS", "APOLLOTYRE",
    "BHARATFORG", "SONACOMS", "HYUNDAI", "UNOMINDA"
  ],
  "Nifty Pharma": [
    "SUNPHARMA", "CIPLA", "DRREDDY", "DIVISLAB", "LUPIN",
    "AUROPHARMA", "TORNTPHARM", "ZYDUSLIFE", "ALKEM", "GLENMARK",
    "MANKIND", "ABBOTINDIA", "IPCALAB", "GLAND", "NATCOPHARM",
    "BIOCON", "AJANTPHARM", "LAURUSLABS", "WOCKPHARMA", "PPLPHARMA"
  ],
  "Nifty Healthcare": [
    "APOLLOHOSP", "MAXHEALTH", "FORTIS", "LAURUSLABS", "SYNGENE", "METROPOLIS", "LALPATHLAB"
  ],
  "Nifty Metal": [
    "TATASTEEL", "JSWSTEEL", "HINDALCO", "VEDL", "JINDALSTEL",
    "SAIL", "NMDC", "NATIONALUM", "APLAPOLLO", "HINDCOPPER",
    "WELCORP", "RATNAMANI", "JSL", "HINDZINC", "LLOYDSME"
  ],
  "Nifty FMCG": [
    "HINDUNILVR", "ITC", "NESTLEIND", "BRITANNIA", "TATACONSUM",
    "DABUR", "GODREJCP", "MARICO", "COLPAL", "VBL",
    "EMAMILTD", "RADICO", "UBL", "UNITDSPR", "PATANJALI", "GODFRYPHLP"
  ],
  "Nifty Realty": [
    "DLF", "GODREJPROP", "LODHA", "OBEROIRLTY", "PRESTIGE",
    "PHOENIXLTD", "BRIGADE", "SOBHA", "MAHLIFE", "ANANTRAJ", "ABREL"
  ],
  "Nifty Media": [
    "SUNTV", "ZEEL", "PVRINOX", "NETWORK18", "TV18BRDCST"
  ],
  "Nifty Consumer Durables": [
    "TITAN", "DIXON", "VOLTAS", "HAVELLS", "BLUESTARCO",
    "CROMPTON", "KALYANKJIL", "WHIRLPOOL", "AMBER", "PGEL",
    "KAJARIACER", "THANGAMAYL", "BATAINDIA", "LGEINDIA"
  ],
  "Nifty Chemicals": [
    "PIDILITIND", "SRF", "UPL", "DEEPAKNTR", "TATACHEM",
    "NAVINFLUOR", "AARTIIND", "PIIND", "ATUL", "COROMANDEL",
    "GNFC", "FLUOROCHEM", "CLEAN"
  ],
  "Nifty Oil & Gas": [
    "RELIANCE", "ONGC", "IOC", "BPCL", "GAIL",
    "HINDPETRO", "OIL", "PETRONET", "IGL", "MGL", "GUJGAS"
  ],
  "Nifty Energy": [
    "NTPC", "POWERGRID", "TATAPOWER", "ADANIGREEN", "ADANIPOWER",
    "NHPC", "COALINDIA", "JSWENERGY", "TORNTPOWER", "SUZLON", "IREDA"
  ],
  "Nifty Infrastructure": [
    "LT", "ADANIPORTS", "BHARTIARTL", "ULTRACEMCO", "GRASIM",
    "SIEMENS", "ABB", "CUMMINSIND", "SHREECEM", "AMBUJACEM",
    "ACC", "DALBHARAT", "RAMCOCEM", "JKCEMENT", "POLYCAB", "KEI", "CGPOWER"
  ],
  "Nifty Financial Services": [
    "BAJFINANCE", "BAJAJFINSV", "SHRIRAMFIN", "CHOLAFIN", "MUTHOOTFIN",
    "PFC", "RECLTD", "JIOFIN", "ANGELONE", "CAMS", "IEX",
    "IRFC", "LICHSGFIN", "MANAPPURAM", "LTF", "SBICARD",
    "HDFCAMC", "POONAWALLA", "IIFL", "BSE", "CDSL", "MCX"
  ],
  "Nifty Bank": [
    "HDFCBANK", "ICICIBANK", "AXISBANK", "KOTAKBANK", "SBIN",
    "INDUSINDBK", "BANKBARODA", "FEDERALBNK", "IDFCFIRSTB", "PNB", "AUBANK"
  ],
  "Nifty Insurance": [
    "SBILIFE", "HDFCLIFE", "LICI", "ICICIGI", "ICICIPRULI",
    "MFSL", "GICRE", "STARHEALTH", "NIACL", "GODIGIT", "NIVABUPA", "CANHLIFE"
  ],
  "Nifty Ind Defence": [
    "HAL", "BEL", "BDL", "MAZDOCK", "GRSE", "COCHINSHIP",
    "BEML", "SOLARINDS", "DATAPATTNS", "ZENTEC", "PARAS",
    "KAYNES", "MTARTECH", "ASTRAMICRO", "MIDHANI", "AXISCADES",
    "DYNAMATECH", "CENTUM", "APOLLO"
  ],
  "Nifty PSE": [
    "NTPC", "POWERGRID", "COALINDIA", "ONGC", "SAIL",
    "NMDC", "BEL", "HAL", "BHEL", "CONCOR", "IRFC"
  ],
  "Nifty CPSE": [
    "ONGC", "COALINDIA", "NTPC", "POWERGRID", "BEL",
    "HAL", "SAIL", "NMDC", "BPCL", "IOC"
  ]
};

// Reverse lookup: symbol -> primary sector (first sector wins if duplicate)
export const STOCK_TO_SECTOR_MAP: Record<string, string> = {};
for (const [sector, symbols] of Object.entries(SECTOR_STOCKS_MAP)) {
  for (const sym of symbols) {
    if (!STOCK_TO_SECTOR_MAP[sym]) {
      STOCK_TO_SECTOR_MAP[sym] = sector;
    }
  }
}

// Generate an Upstox instrument key format helper
export function getInstrumentKey(symbol: string): string {
  return `NSE_EQ|${symbol}`;
}

export const DEFAULT_WATCHLIST_SYMBOLS = [
  'RELIANCE',
  'HDFCBANK',
  'ICICIBANK',
  'INFY',
  'TCS',
  'SBIN',
  'TATAMOTORS',
  'BHARTIARTL',
  'LT',
  'ITC'
];
