import type { Station } from '@/types/station';

/**
 * 駅の乗り換え時間を路線数から推定（分）
 *
 * @param station 駅情報
 * @returns 乗り換え時間（分）
 */
export function estimateTransferTime(station: Station): number {
  const lineCount = station.lines.length;

  if (lineCount <= 2) {
    return 3; // 小規模駅: 3分
  }
  if (lineCount <= 4) {
    return 5; // 中規模駅: 5分
  }
  if (lineCount <= 6) {
    return 7; // 大規模駅: 7分
  }
  return 10; // ターミナル駅: 10分
}

/**
 * 駅コードから乗り換え時間を取得するマップを作成
 */
export function createTransferTimeMap(
  stations: Station[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const station of stations) {
    map.set(station.code, estimateTransferTime(station));
  }
  return map;
}
