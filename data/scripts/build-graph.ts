/**
 * グラフビルドスクリプト
 *
 * stations.json と connections-with-times.json からグラフを構築し、
 * JSONファイルとして保存する
 */

import * as fs from 'fs';
import * as path from 'path';

// 型定義
interface Station {
  code: string;
  name: string;
  lat: number;
  lon: number;
  lines: { code: string; name: string; company: string }[];
}

interface ConnectionWithTime {
  from: string;
  to: string;
  line: string;
  time: number;
}

interface GraphEdge {
  station: string;
  time: number;
  line: string;
}

interface GraphJson {
  generated_at: string;
  node_count: number;
  edge_count: number;
  graph: { [stationCode: string]: GraphEdge[] };
}

// パス設定
const ROOT_DIR = path.resolve(__dirname, '../..');
const STATIONS_PATH = path.join(ROOT_DIR, 'public/data/stations.json');
const CONNECTIONS_PATH = path.join(
  ROOT_DIR,
  'data/travel-times/generated/connections-with-times.json'
);
const OUTPUT_PATH = path.join(
  ROOT_DIR,
  'data/travel-times/generated/graph.json'
);

async function main() {
  console.log('=== グラフビルド ===\n');

  // データ読み込み
  console.log('データを読み込み中...');

  if (!fs.existsSync(STATIONS_PATH)) {
    console.error(`エラー: ${STATIONS_PATH} が見つかりません`);
    process.exit(1);
  }

  if (!fs.existsSync(CONNECTIONS_PATH)) {
    console.error(`エラー: ${CONNECTIONS_PATH} が見つかりません`);
    console.error('先に npm run build:connections を実行してください');
    process.exit(1);
  }

  const stationsData = JSON.parse(fs.readFileSync(STATIONS_PATH, 'utf-8'));
  const connectionsData = JSON.parse(
    fs.readFileSync(CONNECTIONS_PATH, 'utf-8')
  );

  const stations: Station[] = stationsData.stations;
  const connections: ConnectionWithTime[] = connectionsData.connections;

  console.log(`  駅数: ${stations.length}`);
  console.log(`  接続数: ${connections.length}`);

  // 駅コードのセットを作成
  const stationCodes = new Set(stations.map((s) => s.code));

  // グラフを構築
  console.log('\nグラフを構築中...');
  const graph: { [stationCode: string]: GraphEdge[] } = {};

  // すべての駅をグラフに追加（孤立した駅も含む）
  for (const station of stations) {
    graph[station.code] = [];
  }

  let edgeCount = 0;
  let skippedCount = 0;

  // 接続情報をグラフに追加（双方向）
  for (const conn of connections) {
    // 存在しない駅はスキップ
    if (!stationCodes.has(conn.from) || !stationCodes.has(conn.to)) {
      skippedCount++;
      continue;
    }

    // from -> to
    const edges1 = graph[conn.from];
    if (!edges1.some((e) => e.station === conn.to && e.line === conn.line)) {
      edges1.push({
        station: conn.to,
        time: conn.time,
        line: conn.line,
      });
      edgeCount++;
    }

    // to -> from（双方向）
    const edges2 = graph[conn.to];
    if (!edges2.some((e) => e.station === conn.from && e.line === conn.line)) {
      edges2.push({
        station: conn.from,
        time: conn.time,
        line: conn.line,
      });
      edgeCount++;
    }
  }

  console.log(`  エッジ数: ${edgeCount}`);
  if (skippedCount > 0) {
    console.log(`  スキップ: ${skippedCount}`);
  }

  // 統計情報
  const degrees = Object.values(graph).map((edges) => edges.length);
  const avgDegree = degrees.reduce((a, b) => a + b, 0) / degrees.length;
  const maxDegree = Math.max(...degrees);
  const isolatedNodes = degrees.filter((d) => d === 0).length;

  console.log(`\n統計情報:`);
  console.log(`  平均次数: ${avgDegree.toFixed(2)}`);
  console.log(`  最大次数: ${maxDegree}`);
  console.log(`  孤立ノード: ${isolatedNodes}`);

  // JSON出力
  const output: GraphJson = {
    generated_at: new Date().toISOString(),
    node_count: stations.length,
    edge_count: edgeCount,
    graph,
  };

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output), 'utf-8');

  const fileSizeKB = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
  console.log(`\n出力先: ${OUTPUT_PATH}`);
  console.log(`ファイルサイズ: ${fileSizeKB} KB`);

  console.log('\n=== 完了 ===');
}

main().catch(console.error);
