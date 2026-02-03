import type { Station, ConnectionWithTime, StationGraph } from '@/types/station';

// グラフのキャッシュ
let graphCache: StationGraph | null = null;

/**
 * 所要時間付き接続情報からグラフを構築
 * @param stations 駅リスト
 * @param connections 所要時間付き接続情報リスト
 * @returns グラフ構造
 */
export function buildGraph(
  stations: Station[],
  connections: ConnectionWithTime[]
): StationGraph {
  if (graphCache) {
    return graphCache;
  }

  // 駅コード -> 駅情報のマップを作成
  const stationMap = new Map<string, Station>(stations.map((s) => [s.code, s]));

  // グラフを初期化
  const graph: StationGraph = new Map();

  // すべての駅をグラフに追加（孤立した駅も含む）
  for (const station of stations) {
    graph.set(station.code, []);
  }

  // 接続情報をグラフに追加（双方向）
  for (const conn of connections) {
    const station1 = stationMap.get(conn.from);
    const station2 = stationMap.get(conn.to);

    if (!station1 || !station2) {
      continue;
    }

    // YAMLから生成された所要時間を使用
    const travelTime = conn.time;

    // station1 -> station2
    const edges1 = graph.get(conn.from) || [];
    // 重複チェック
    if (!edges1.some((e) => e.station === conn.to && e.line === conn.line)) {
      edges1.push({
        station: conn.to,
        time: travelTime,
        line: conn.line,
      });
      graph.set(conn.from, edges1);
    }

    // station2 -> station1（双方向）
    const edges2 = graph.get(conn.to) || [];
    if (!edges2.some((e) => e.station === conn.from && e.line === conn.line)) {
      edges2.push({
        station: conn.from,
        time: travelTime,
        line: conn.line,
      });
      graph.set(conn.to, edges2);
    }
  }

  graphCache = graph;
  return graph;
}

/**
 * グラフキャッシュをクリア（テスト用）
 */
export function clearGraphCache(): void {
  graphCache = null;
}

/**
 * グラフの統計情報を取得（デバッグ用）
 */
export function getGraphStats(graph: StationGraph): {
  nodeCount: number;
  edgeCount: number;
  avgDegree: number;
  isolatedNodes: number;
} {
  let edgeCount = 0;
  let isolatedNodes = 0;

  for (const edges of graph.values()) {
    edgeCount += edges.length;
    if (edges.length === 0) {
      isolatedNodes++;
    }
  }

  const nodeCount = graph.size;
  // 双方向なので2で割る
  edgeCount = edgeCount / 2;

  return {
    nodeCount,
    edgeCount,
    avgDegree: (edgeCount * 2) / nodeCount,
    isolatedNodes,
  };
}
