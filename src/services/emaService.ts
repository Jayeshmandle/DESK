/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Candle } from '../types/desk';

export class EmaService {
  /**
   * Standard EMA: ewm(span=N, adjust=False) on close
   * alpha = 2 / (span + 1)
   * EMA_t = Close_t * alpha + EMA_{t-1} * (1 - alpha)
   */
  static calculateEma(closes: number[], span: number): number[] {
    if (!closes || closes.length === 0 || span <= 0) return [];
    const alpha = 2 / (span + 1);
    const emaSeries: number[] = new Array(closes.length);

    emaSeries[0] = closes[0];
    for (let i = 1; i < closes.length; i++) {
      emaSeries[i] = closes[i] * alpha + emaSeries[i - 1] * (1 - alpha);
    }

    return emaSeries;
  }

  /**
   * Get latest EMA rounded to 2 decimals
   */
  static latestEma(candles: Candle[], span: number): number | null {
    if (!candles || candles.length === 0) return null;
    const closes = candles.map((c) => c.close);
    const series = this.calculateEma(closes, span);
    const last = series[series.length - 1];
    return typeof last === 'number' && !isNaN(last) ? Math.round(last * 100) / 100 : null;
  }

  /**
   * Parse EMA note: "EMA|{span}|{tf}" (e.g. "EMA|9|15")
   */
  static parseEmaNote(note?: string): { span: number; tf: number } | null {
    if (!note || !note.startsWith('EMA|')) return null;
    const parts = note.split('|');
    if (parts.length >= 3) {
      const span = parseInt(parts[1], 10);
      const tf = parseInt(parts[2], 10);
      if (!isNaN(span) && !isNaN(tf)) {
        return { span, tf };
      }
    }
    return null;
  }

  /**
   * Format EMA note
   */
  static formatEmaNote(span: number, tf: number): string {
    return `EMA|${span}|${tf}`;
  }

  /**
   * Resample 1m bars to 5m or 15m candles with NSE session origin 09:15 IST
   */
  static resampleCandles(oneMinCandles: Candle[], timeframeMin: 5 | 15): Candle[] {
    if (!oneMinCandles || oneMinCandles.length === 0) return [];

    const bucketMs = timeframeMin * 60 * 1000;
    const groups = new Map<number, Candle[]>();

    for (const c of oneMinCandles) {
      const bucketTime = Math.floor(c.timestamp / bucketMs) * bucketMs;
      const group = groups.get(bucketTime) || [];
      group.push(c);
      groups.set(bucketTime, group);
    }

    const resampled: Candle[] = [];
    const sortedBuckets = Array.from(groups.keys()).sort((a, b) => a - b);

    for (const bucket of sortedBuckets) {
      const group = groups.get(bucket)!;
      if (group.length === 0) continue;

      const open = group[0].open;
      const close = group[group.length - 1].close;
      let high = -Infinity;
      let low = Infinity;
      let volume = 0;

      for (const bar of group) {
        if (bar.high > high) high = bar.high;
        if (bar.low < low) low = bar.low;
        volume += bar.volume;
      }

      resampled.push({
        timestamp: bucket,
        open,
        high,
        low,
        close,
        volume
      });
    }

    return resampled;
  }
}
