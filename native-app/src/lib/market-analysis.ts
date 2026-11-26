export type AnalysisCandle = { candle_open_at: string; open: number; high: number; low: number; close: number };
export type MarketAnalysis = {
 trend:"bullish"|"bearish"|"mixed"|"unavailable";trendNote:string;swingHigh:number|null;swingLow:number|null;
 structure:"bullish BOS"|"bearish BOS"|"no confirmed break"|"unavailable";
 rangeHigh:number|null;rangeLow:number|null;rangeMid:number|null;rangeState:"above range"|"below range"|"inside range"|"unavailable";
 liquidity:"buy-side sweep"|"sell-side sweep"|"no confirmed sweep"|"unavailable";liquidityLevel:number|null;
};
const average=(values:number[])=>values.reduce((sum,value)=>sum+value,0)/values.length;
export function analyseMarketCandles(candles:AnalysisCandle[]):MarketAnalysis{
 const valid=candles.filter(c=>Number.isFinite(c.open)&&Number.isFinite(c.high)&&Number.isFinite(c.low)&&Number.isFinite(c.close)&&c.high>=Math.max(c.open,c.close)&&c.low<=Math.min(c.open,c.close));
 const unavailable:MarketAnalysis={trend:"unavailable",trendNote:"Not enough validated candle history.",swingHigh:null,swingLow:null,structure:"unavailable",rangeHigh:null,rangeLow:null,rangeMid:null,rangeState:"unavailable",liquidity:"unavailable",liquidityLevel:null};
 if(valid.length<25)return unavailable;
 const closes=valid.map(c=>c.close),last=valid[valid.length-1]!,sma20=average(closes.slice(-20)),sma50=valid.length>=50?average(closes.slice(-50)):null;
 const trend:MarketAnalysis["trend"]=sma50===null?"mixed":last.close>sma20&&sma20>sma50?"bullish":last.close<sma20&&sma20<sma50?"bearish":"mixed";
 const trendNote=sma50===null?"20-candle average available; 50-candle confirmation needs more history.":trend==="bullish"?"Price is above the 20-candle average, which is above the 50-candle average.":trend==="bearish"?"Price is below the 20-candle average, which is below the 50-candle average.":"Price and moving averages do not show a confirmed aligned trend.";
 const highs:number[]=[],lows:number[]=[];
 for(let i=2;i<valid.length-2;i++){const window=valid.slice(i-2,i+3),c=valid[i]!;if(window.every((x,j)=>j===2||c.high>x.high))highs.push(c.high);if(window.every((x,j)=>j===2||c.low<x.low))lows.push(c.low);}
 const swingHigh=highs.at(-1)??null,swingLow=lows.at(-1)??null;
 const structure:MarketAnalysis["structure"]=swingHigh===null||swingLow===null?"unavailable":last.close>swingHigh?"bullish BOS":last.close<swingLow?"bearish BOS":"no confirmed break";
 const range=valid.slice(-21,-1),rangeHigh=range.length===20?Math.max(...range.map(c=>c.high)):null,rangeLow=range.length===20?Math.min(...range.map(c=>c.low)):null,rangeMid=rangeHigh!==null&&rangeLow!==null?(rangeHigh+rangeLow)/2:null;
 const rangeState:MarketAnalysis["rangeState"]=rangeHigh===null||rangeLow===null?"unavailable":last.close>rangeHigh?"above range":last.close<rangeLow?"below range":"inside range";
 const liquidity:MarketAnalysis["liquidity"]=swingHigh===null||swingLow===null?"unavailable":last.high>swingHigh&&last.close<swingHigh?"buy-side sweep":last.low<swingLow&&last.close>swingLow?"sell-side sweep":"no confirmed sweep";
 const liquidityLevel=liquidity==="buy-side sweep"?swingHigh:liquidity==="sell-side sweep"?swingLow:null;
 return {trend,trendNote,swingHigh,swingLow,structure,rangeHigh,rangeLow,rangeMid,rangeState,liquidity,liquidityLevel};
}