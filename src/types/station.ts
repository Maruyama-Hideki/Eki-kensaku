/**
 * 路線情報
 */
export interface Line {
  code: string;
  name: string;
  company: string;
}

/**
 * 駅情報
 */
export interface Station {
  code: string;
  name: string;
  lat: number;
  lon: number;
  lines: Line[];
}

/**
 * 駅間接続情報
 */
export interface Connection {
  from: string;
  to: string;
  line: string;
}

/**
 * グラフのエッジ（隣接駅への接続）
 */
export interface GraphEdge {
  station: string;
  time: number;  // 所要時間（分）
  line: string;
}

/**
 * グラフ構造: 駅コード -> 隣接駅リスト
 */
export type StationGraph = Map<string, GraphEdge[]>;

/**
 * 検索結果の駅情報
 */
export interface SearchResult {
  station: Station;
  totalTime: number;  // 起点からの最短時間（分）
  timesFromOrigins: Record<string, number>;  // 各起点からの時間
  path?: string[];  // 経路（駅コードの配列）
}

/**
 * 検索パラメータ
 */
export interface SearchParams {
  origins: string[];
  maxTime: number;
  mode: 'or' | 'and';
}

/**
 * API レスポンス
 */
export interface RangeSearchResponse {
  stations: SearchResult[];
  count: number;
}

/**
 * stations.json のスキーマ
 */
export interface StationsData {
  stations: Station[];
}

/**
 * connections.json のスキーマ
 */
export interface ConnectionsData {
  connections: Connection[];
}
