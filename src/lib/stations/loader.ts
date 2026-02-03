import { promises as fs } from 'fs';
import path from 'path';
import type {
  Station,
  Connection,
  ConnectionWithTime,
  StationsData,
  ConnectionsData,
  ConnectionsWithTimesData,
  StationGraph,
  GraphEdge,
} from '@/types/station';

// グラフJSONのスキーマ
interface GraphJsonData {
  generated_at: string;
  node_count: number;
  edge_count: number;
  graph: { [stationCode: string]: GraphEdge[] };
}

// サーバーサイドキャッシュ
let stationsCache: Station[] | null = null;
let connectionsCache: Connection[] | null = null;
let connectionsWithTimesCache: ConnectionWithTime[] | null = null;
let graphCache: StationGraph | null = null;
let stationMapCache: Map<string, Station> | null = null;

/**
 * 駅データを読み込む
 * サーバーサイドでキャッシュされる
 */
export async function loadStations(): Promise<Station[]> {
  if (stationsCache) {
    return stationsCache;
  }

  const filePath = path.join(process.cwd(), 'public/data/stations.json');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const data: StationsData = JSON.parse(fileContent);

  stationsCache = data.stations;
  return stationsCache;
}

/**
 * 接続データを読み込む（旧形式、所要時間なし）
 * サーバーサイドでキャッシュされる
 * @deprecated loadConnectionsWithTimes を使用してください
 */
export async function loadConnections(): Promise<Connection[]> {
  if (connectionsCache) {
    return connectionsCache;
  }

  const filePath = path.join(process.cwd(), 'public/data/connections.json');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const data: ConnectionsData = JSON.parse(fileContent);

  connectionsCache = data.connections;
  return connectionsCache;
}

/**
 * 所要時間付き接続データを読み込む
 * data/travel-times/generated/connections-with-times.json から読み込む
 * サーバーサイドでキャッシュされる
 */
export async function loadConnectionsWithTimes(): Promise<ConnectionWithTime[]> {
  if (connectionsWithTimesCache) {
    return connectionsWithTimesCache;
  }

  const filePath = path.join(
    process.cwd(),
    'data/travel-times/generated/connections-with-times.json'
  );

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data: ConnectionsWithTimesData = JSON.parse(fileContent);
    connectionsWithTimesCache = data.connections;
    return connectionsWithTimesCache;
  } catch (error) {
    // ファイルが存在しない場合は旧形式から変換
    console.warn(
      'connections-with-times.json not found, falling back to connections.json'
    );
    const connections = await loadConnections();
    // 旧形式の接続データにデフォルト時間を付与
    connectionsWithTimesCache = connections.map((conn) => ({
      ...conn,
      time: 3, // デフォルト3分
    }));
    return connectionsWithTimesCache;
  }
}

/**
 * 駅コードから駅情報を取得するマップを作成
 */
export async function createStationMap(): Promise<Map<string, Station>> {
  if (stationMapCache) {
    return stationMapCache;
  }
  const stations = await loadStations();
  stationMapCache = new Map(stations.map((s) => [s.code, s]));
  return stationMapCache;
}

/**
 * ビルド済みグラフを読み込む
 * data/travel-times/generated/graph.json から読み込む
 * サーバーサイドでキャッシュされる
 */
export async function loadGraph(): Promise<StationGraph> {
  if (graphCache) {
    return graphCache;
  }

  const filePath = path.join(
    process.cwd(),
    'data/travel-times/generated/graph.json'
  );

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data: GraphJsonData = JSON.parse(fileContent);

    // ObjectからMapに変換
    graphCache = new Map(
      Object.entries(data.graph).map(([key, value]) => [key, value])
    );

    console.log(
      `Graph loaded: ${data.node_count} nodes, ${data.edge_count} edges`
    );
    return graphCache;
  } catch (error) {
    console.error('Failed to load graph.json:', error);
    throw new Error(
      'graph.json not found. Run "npm run build:graph" first.'
    );
  }
}

/**
 * グラフと駅マップを一括で取得
 * APIで使用する
 */
export async function loadGraphAndStationMap(): Promise<{
  graph: StationGraph;
  stationMap: Map<string, Station>;
}> {
  const [graph, stationMap] = await Promise.all([
    loadGraph(),
    createStationMap(),
  ]);
  return { graph, stationMap };
}

/**
 * キャッシュをクリア（テスト用）
 */
export function clearCache(): void {
  stationsCache = null;
  connectionsCache = null;
  connectionsWithTimesCache = null;
  graphCache = null;
  stationMapCache = null;
}
