// Shared display types and supported EA symbol options.
// No sample balances, positions, signals, or fabricated market data are stored here.
export type Trade = { id: string; pair: string; side: "BUY" | "SELL"; lots: number; open: number; current: number; pnl: number; };
export const ALL_PAIRS = ["XAUUSD", "US30", "NAS100", "EURUSD", "GBPUSD", "USDJPY", "GBPJPY", "AUDUSD", "USDCAD"];
