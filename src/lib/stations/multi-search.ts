import type { Station, StationGraph, SearchResult, SearchParams } from '@/types/station';
import { searchReachableStations } from './search';

/**
 * 複数起点からの並列検索
 *
 * @param graph グラフ構造
 * @param stationMap 駅コード -> 駅情報のマップ
 * @param params 検索パラメータ
 * @returns 検索結果
 */
export async function searchMultipleOriginsParallel(
  graph: StationGraph,
  stationMap: Map<string, Station>,
  params: SearchParams
): Promise<SearchResult[]> {
  const { origins, maxTime, mode } = params;

  if (origins.length === 0) {
    return [];
  }

  // 各起点から並列で検索
  const searchPromises = origins.map((originCode) =>
    Promise.resolve(searchReachableStations(graph, stationMap, originCode, maxTime))
  );

  const allResults = await Promise.all(searchPromises);

  // 駅コードごとに結果をマージ
  const mergedResults = new Map<string, SearchResult>();

  for (let i = 0; i < origins.length; i++) {
    const originCode = origins[i];
    const results = allResults[i];

    for (const result of results) {
      const stationCode = result.station.code;
      const existing = mergedResults.get(stationCode);

      if (existing) {
        // 既存の結果に時間情報を追加
        existing.timesFromOrigins[originCode] = result.totalTime;
        // 最短時間を更新
        existing.totalTime = Math.min(existing.totalTime, result.totalTime);
      } else {
        // 新規追加
        mergedResults.set(stationCode, {
          station: result.station,
          totalTime: result.totalTime,
          timesFromOrigins: { [originCode]: result.totalTime },
        });
      }
    }
  }

  // モードに応じてフィルタリング
  let filteredResults: SearchResult[];

  if (mode === 'and') {
    // AND検索: すべての起点から到達可能な駅のみ
    filteredResults = Array.from(mergedResults.values()).filter((result) => {
      // すべての起点からの時間情報があるかチェック
      return origins.every((originCode) => originCode in result.timesFromOrigins);
    });

    // AND検索の場合は、最大時間を「最長の所要時間」として使用
    filteredResults = filteredResults.map((result) => {
      const maxTimeFromOrigins = Math.max(...Object.values(result.timesFromOrigins));
      return {
        ...result,
        totalTime: maxTimeFromOrigins,
      };
    });
  } else {
    // OR検索: いずれかの起点から到達可能な駅
    filteredResults = Array.from(mergedResults.values());
  }

  // 起点駅を除外
  const originSet = new Set(origins);
  filteredResults = filteredResults.filter(
    (result) => !originSet.has(result.station.code)
  );

  // 所要時間でソート
  filteredResults.sort((a, b) => a.totalTime - b.totalTime);

  return filteredResults;
}

/**
 * 検索結果のサマリーを取得
 */
export function getSearchSummary(results: SearchResult[]): {
  totalCount: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
} {
  if (results.length === 0) {
    return {
      totalCount: 0,
      averageTime: 0,
      minTime: 0,
      maxTime: 0,
    };
  }

  const times = results.map((r) => r.totalTime);
  const sum = times.reduce((a, b) => a + b, 0);

  return {
    totalCount: results.length,
    averageTime: Math.round(sum / results.length),
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
  };
}
