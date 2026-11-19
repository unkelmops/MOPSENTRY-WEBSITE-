# MOPSENTRY EA strategy integration contract

This document records the agreed behaviour the MT5 EA must implement. The web app can display and send settings, but it does not execute trades. Do not treat these requirements as implemented in MQL5 until the EA source is updated and tested.

## Existing integration to preserve

- Keep the existing EA check-in endpoint and its connection-key authentication.
- Keep the current settings response fields: `is_running` (as `running`), `strategy`, `lot_size`, `risk_percent`, `max_trades`, `pairs`, and `alerts_enabled`.
- Keep existing START/STOP behaviour and current database command contract unless the EA and app are deliberately migrated together.
- Do not put Supabase service-role credentials or other private secrets in the mobile/web client.
- App settings are delivered on the EA's next check-in; do not promise a fixed update time unless the EA's polling interval is confirmed.

## Strategy requirements

### Trend

- Retain the existing Fibonacci retracement framework.
- Keep the trend-direction filter and price-action requirements.
- Require the signal candle to close in the intended trade direction before submitting an entry.
- Use order comment: `MOPSENTRY - TREND`.

### Scalper

- Retain the faster, more aggressive version of the existing Fibonacci-based entry framework.
- Do not add the Trend strategy's extra candle-close confirmation.
- Still enforce the shared trade cap and duplicate-entry protection.
- Use order comment: `MOPSENTRY - SCALPER`.

### Grid

- Detect a sweep below a prior swing low followed by a reclaim for a buy setup; consider a pending buy around the reclaimed prior-low level.
- Detect a sweep above a prior swing high followed by a move back below that level for a sell setup; consider a pending sell around the prior-high level.
- Validate that the selected pending-order type is valid for the current price and broker's stop-distance rules before sending it.
- Prevent repeated duplicate pending orders for the same setup.
- Use order comment: `MOPSENTRY - GRID`.

## Shared order safety rules

## Timeframe and scalper-frequency settings

- The check-in response adds `settings.timeframe`: one of `M1`, `M5`, `M15`, `M30`, `H1`, `H4`, `D1`; existing accounts default to `M5`.
- Map these values to the matching MQL timeframe constants. Use the selected timeframe for indicator handles, candles and setup evaluation rather than only changing a chart label.
- The response adds `settings.scalper_frequency`: `standard` (backward-compatible default) or `aggressive`. Apply this preference only to the `scalper` strategy.
- Aggressive requests more frequent valid entry opportunities. It must not raise `lot_size`, `risk_percent`, `max_trades`, disable duplicate protection, remove stop losses, or bypass broker validation.
- No numerical cooldown or signal thresholds have been supplied. Those must be implemented and reviewed in the EA source, then compared in Strategy Tester and on a demo account. The app cannot change MQL trading logic by itself.
- Older EAs may ignore both fields. Saving them is not confirmation that the EA has applied them.

## Shared order safety rules (continued)

- Check the cap before placing any market or pending order.
- Count the EA's own open positions plus its own pending orders for the relevant symbol; do not count unrelated manual trades or other EAs unless explicitly designed to do so.
- Treat `max_trades` as the overall cap, not as additional entries allowed on top of current trades.
- For multi-order setups, re-check remaining capacity before each order so the setup cannot exceed the cap.
- Keep strategy comments consistent on both market and pending orders.
- Preserve current stop-loss/take-profit, broker validation, remote-control, and status-reporting behaviour unless a separately reviewed change is required.

## Required verification before live use

1. Compile the EA in MetaEditor with no errors.
2. In Strategy Tester, verify Trend waits for candle close and Scalper does not require the extra close.
3. Verify both Grid sweep directions create the intended pending order and do not duplicate it on subsequent ticks.
4. Verify the cap counts open positions and pending orders and is never exceeded by multi-order setups.
5. Verify each strategy's order comment exactly matches the labels above.
6. Verify app settings reach the EA through check-in and START/STOP still behave as before.
7. Repeat on a demo account before considering any live deployment.