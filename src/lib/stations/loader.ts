import { promises as fs } from 'fs';
import path from 'path';
import type { Station, Connection, StationsData, ConnectionsData } from '@/types/station';

// サーバーサイドキャッシュ
let stationsCache: Station[] | null = null;
let connectionsCache: Connection[] | null = null;

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
 * 接続データを読み込む
 * サーバーサイドでキャッシュされる
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
 * 駅コードから駅情報を取得するマップを作成
 */
export async function createStationMap(): Promise<Map<string, Station>> {
  const stations = await loadStations();
  return new Map(stations.map(s => [s.code, s]));
}

/**
 * キャッシュをクリア（テスト用）
 */
export function clearCache(): void {
  stationsCache = null;
  connectionsCache = null;
}
