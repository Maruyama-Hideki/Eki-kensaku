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
        // 経路情報をマージ
        if (result.routesFromOrigins) {
          existing.routesFromOrigins = {
            ...existing.routesFromOrigins,
            ...result.routesFromOrigins,
          };
        }
        // 最短時間を更新
        if (result.totalTime < existing.totalTime) {
          existing.totalTime = result.totalTime;
        }
      } else {
        // 新規追加
        mergedResults.set(stationCode, {
          station: result.station,
          totalTime: result.totalTime,
          timesFromOrigins: { [originCode]: result.totalTime },
          routesFromOrigins: result.routesFromOrigins,
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
 * グループ検索パラメータ
 */
interface OriginGroup {
  origins: string[];
  timeMinutes: number;
}

/**
 * グループ検索
 * 各グループ内はOR検索、グループ間はAND検索
 *
 * @param graph グラフ構造
 * @param stationMap 駅コード -> 駅情報のマップ
 * @param groups グループごとの検索条件
 * @returns 検索結果（全グループの条件を満たす駅）
 */
export async function searchWithGroups(
  graph: StationGraph,
  stationMap: Map<string, Station>,
  groups: OriginGroup[]
): Promise<SearchResult[]> {
  if (groups.length === 0) {
    return [];
  }

  // 各グループでOR検索を実行
  const groupResults: SearchResult[][] = [];

  for (const group of groups) {
    const results = await searchMultipleOriginsParallel(graph, stationMap, {
      origins: group.origins,
      maxTime: group.timeMinutes,
      mode: 'or',
    });
    groupResults.push(results);
  }

  // グループが1つだけの場合はそのまま返す
  if (groupResults.length === 1) {
    return groupResults[0];
  }

  // 複数グループの結果を交差（AND）
  // 最初のグループの結果をベースにする
  const baseResults = groupResults[0];
  const baseStationCodes = new Set(baseResults.map((r) => r.station.code));

  // 全グループに存在する駅コードを抽出
  let commonStationCodes = baseStationCodes;
  for (let i = 1; i < groupResults.length; i++) {
    const groupStationCodes = new Set(groupResults[i].map((r) => r.station.code));
    commonStationCodes = new Set(
      [...commonStationCodes].filter((code) => groupStationCodes.has(code))
    );
  }

  // 共通の駅に対して結果をマージ
  const mergedResults: SearchResult[] = [];

  for (const stationCode of commonStationCodes) {
    // 各グループからこの駅の結果を取得
    const resultsForStation: SearchResult[] = [];
    for (const results of groupResults) {
      const result = results.find((r) => r.station.code === stationCode);
      if (result) {
        resultsForStation.push(result);
      }
    }

    if (resultsForStation.length === groupResults.length) {
      // 全グループから到達可能な駅のみ
      const station = resultsForStation[0].station;

      // 全グループの時間情報と経路をマージ
      const mergedTimesFromOrigins: Record<string, number> = {};
      const mergedRoutesFromOrigins: Record<string, import('@/types/station').RouteStep[]> = {};

      for (const result of resultsForStation) {
        Object.assign(mergedTimesFromOrigins, result.timesFromOrigins);
        if (result.routesFromOrigins) {
          for (const [key, value] of Object.entries(result.routesFromOrigins)) {
            mergedRoutesFromOrigins[key] = value;
          }
        }
      }

      // 最大時間（全グループの条件を満たすのに必要な時間）
      const maxTime = Math.max(...resultsForStation.map((r) => r.totalTime));

      mergedResults.push({
        station,
        totalTime: maxTime,
        timesFromOrigins: mergedTimesFromOrigins,
        routesFromOrigins: Object.keys(mergedRoutesFromOrigins).length > 0
          ? mergedRoutesFromOrigins
          : undefined,
      });
    }
  }

  // 全グループの起点駅を除外
  const allOrigins = new Set(groups.flatMap((g) => g.origins));
  const filteredResults = mergedResults.filter(
    (result) => !allOrigins.has(result.station.code)
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
