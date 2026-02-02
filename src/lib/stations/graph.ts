import type { Station, Connection, StationGraph, GraphEdge } from '@/types/station';

// グラフのキャッシュ
let graphCache: StationGraph | null = null;

/**
 * 2点間の距離を計算（ハバースイン公式）
 * @returns 距離（km）
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球の半径（km）
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * 駅間の所要時間を計算
 * 距離に基づいて計算（平均時速 30km/h = 0.5km/分 として計算）
 * 最小2分、最大10分
 */
function calculateTravelTime(station1: Station, station2: Station): number {
  const distance = calculateDistance(station1.lat, station1.lon, station2.lat, station2.lon);
  // 平均時速 30km/h（都市部の電車）
  const time = distance / 0.5;
  // 最小2分、最大10分に制限
  return Math.max(2, Math.min(10, Math.round(time)));
}

/**
 * 接続情報からグラフを構築
 * @param stations 駅リスト
 * @param connections 接続情報リスト
 * @returns グラフ構造
 */
export function buildGraph(stations: Station[], connections: Connection[]): StationGraph {
  if (graphCache) {
    return graphCache;
  }

  // 駅コード -> 駅情報のマップを作成
  const stationMap = new Map<string, Station>(stations.map(s => [s.code, s]));

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

    const travelTime = calculateTravelTime(station1, station2);

    // station1 -> station2
    const edges1 = graph.get(conn.from) || [];
    // 重複チェック
    if (!edges1.some(e => e.station === conn.to && e.line === conn.line)) {
      edges1.push({
        station: conn.to,
        time: travelTime,
        line: conn.line,
      });
      graph.set(conn.from, edges1);
    }

    // station2 -> station1（双方向）
    const edges2 = graph.get(conn.to) || [];
    if (!edges2.some(e => e.station === conn.from && e.line === conn.line)) {
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
    avgDegree: edgeCount * 2 / nodeCount,
    isolatedNodes,
  };
}
