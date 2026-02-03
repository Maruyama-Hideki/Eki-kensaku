/**
 * 初期所要時間データ生成スクリプト
 *
 * connections.json と stations.json から、距離ベースの所要時間を計算し、
 * 路線ごとのYAMLファイルを生成する
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// 型定義
interface Station {
  code: string;
  name: string;
  lat: number;
  lon: number;
  lines: { code: string; name: string; company: string }[];
}

interface Connection {
  from: string;
  to: string;
  line: string;
}

interface LineInfo {
  code: string;
  name: string;
  company: string;
}

interface Segment {
  from: string;
  from_name: string;
  to: string;
  to_name: string;
  time: number;
  distance: number;
}

interface LineYaml {
  line_code: string;
  line_name: string;
  company: string;
  type: string;
  default_speed: number;
  segments: Segment[];
}

// パス設定
const ROOT_DIR = path.resolve(__dirname, '../..');
const STATIONS_PATH = path.join(ROOT_DIR, 'public/data/stations.json');
const CONNECTIONS_PATH = path.join(ROOT_DIR, 'public/data/connections.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'data/travel-times/lines');

/**
 * Haversine公式で2点間の距離を計算
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
 * 路線種別を判定
 */
function detectLineType(lineName: string, company: string): { type: string; speed: number } {
  const name = lineName.toLowerCase();
  const comp = company.toLowerCase();

  // 新幹線
  if (name.includes('新幹線')) {
    return { type: '新幹線', speed: 200 };
  }

  // 特急
  if (name.includes('特急') || name.includes('エクスプレス') || name.includes('express')) {
    return { type: '特急', speed: 100 };
  }

  // 地下鉄
  if (
    comp.includes('メトロ') ||
    comp.includes('地下鉄') ||
    name.includes('地下鉄') ||
    comp.includes('都営') ||
    comp.includes('市営') ||
    comp.includes('市交通局')
  ) {
    return { type: '地下鉄', speed: 35 };
  }

  // JR在来線
  if (comp.includes('jr') || comp.includes('ＪＲ')) {
    return { type: '在来線', speed: 40 };
  }

  // 私鉄
  return { type: '私鉄', speed: 40 };
}

/**
 * 所要時間を計算（分）
 */
function calculateTravelTime(distance: number, speedKmh: number): number {
  // 時速km/hを分速km/minに変換して計算
  const speedKmMin = speedKmh / 60;
  const time = distance / speedKmMin;
  // 最低2分、小数点以下切り上げ
  return Math.max(2, Math.ceil(time));
}

/**
 * ファイル名をサニタイズ
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[\/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/～/g, '-')
    .substring(0, 100); // 長すぎる名前を制限
}

async function main() {
  console.log('=== 初期所要時間データ生成 ===\n');

  // データ読み込み
  console.log('データを読み込み中...');
  const stationsData = JSON.parse(fs.readFileSync(STATIONS_PATH, 'utf-8'));
  const connectionsData = JSON.parse(fs.readFileSync(CONNECTIONS_PATH, 'utf-8'));

  const stations: Station[] = stationsData.stations;
  const connections: Connection[] = connectionsData.connections;

  console.log(`  駅数: ${stations.length}`);
  console.log(`  接続数: ${connections.length}`);

  // 駅マップ作成
  const stationMap = new Map<string, Station>();
  for (const station of stations) {
    stationMap.set(station.code, station);
  }

  // 路線情報マップ作成
  const lineInfoMap = new Map<string, LineInfo>();
  for (const station of stations) {
    for (const line of station.lines) {
      if (!lineInfoMap.has(line.code)) {
        lineInfoMap.set(line.code, {
          code: line.code,
          name: line.name,
          company: line.company,
        });
      }
    }
  }

  console.log(`  路線数: ${lineInfoMap.size}`);

  // 路線ごとにセグメントをグルーピング
  const lineSegments = new Map<string, Segment[]>();

  let processedCount = 0;
  let skippedCount = 0;

  for (const conn of connections) {
    const fromStation = stationMap.get(conn.from);
    const toStation = stationMap.get(conn.to);

    if (!fromStation || !toStation) {
      skippedCount++;
      continue;
    }

    // 距離計算
    const distance = calculateDistance(
      fromStation.lat,
      fromStation.lon,
      toStation.lat,
      toStation.lon
    );

    // 路線情報取得
    const lineInfo = lineInfoMap.get(conn.line);
    if (!lineInfo) {
      skippedCount++;
      continue;
    }

    // 路線種別と速度を判定
    const { speed } = detectLineType(lineInfo.name, lineInfo.company);

    // 所要時間計算
    const time = calculateTravelTime(distance, speed);

    // セグメント作成
    const segment: Segment = {
      from: conn.from,
      from_name: fromStation.name,
      to: conn.to,
      to_name: toStation.name,
      time,
      distance: Math.round(distance * 100) / 100, // 小数点2桁
    };

    // 路線別に格納
    if (!lineSegments.has(conn.line)) {
      lineSegments.set(conn.line, []);
    }
    lineSegments.get(conn.line)!.push(segment);
    processedCount++;
  }

  console.log(`  処理済み接続: ${processedCount}`);
  console.log(`  スキップ: ${skippedCount}`);

  // 出力ディレクトリ作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 路線ごとにYAMLファイル生成
  console.log('\nYAMLファイルを生成中...');
  let fileCount = 0;

  for (const [lineCode, segments] of lineSegments) {
    const lineInfo = lineInfoMap.get(lineCode);
    if (!lineInfo) continue;

    const { type, speed } = detectLineType(lineInfo.name, lineInfo.company);

    const lineYaml: LineYaml = {
      line_code: lineCode,
      line_name: lineInfo.name,
      company: lineInfo.company,
      type,
      default_speed: speed,
      segments,
    };

    // ファイル名を生成
    const fileName = `${lineCode}_${sanitizeFileName(lineInfo.name)}.yaml`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    // YAML書き出し
    const yamlContent = yaml.dump(lineYaml, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });

    fs.writeFileSync(filePath, yamlContent, 'utf-8');
    fileCount++;
  }

  console.log(`  生成ファイル数: ${fileCount}`);

  // 統計情報
  console.log('\n=== 統計情報 ===');

  // 路線種別ごとの集計
  const typeStats = new Map<string, { count: number; totalTime: number; totalDistance: number }>();

  for (const [lineCode, segments] of lineSegments) {
    const lineInfo = lineInfoMap.get(lineCode);
    if (!lineInfo) continue;

    const { type } = detectLineType(lineInfo.name, lineInfo.company);

    if (!typeStats.has(type)) {
      typeStats.set(type, { count: 0, totalTime: 0, totalDistance: 0 });
    }

    const stats = typeStats.get(type)!;
    for (const seg of segments) {
      stats.count++;
      stats.totalTime += seg.time;
      stats.totalDistance += seg.distance;
    }
  }

  console.log('\n路線種別ごとの統計:');
  for (const [type, stats] of typeStats) {
    const avgTime = stats.count > 0 ? (stats.totalTime / stats.count).toFixed(1) : 0;
    const avgDist = stats.count > 0 ? (stats.totalDistance / stats.count).toFixed(2) : 0;
    console.log(`  ${type}: ${stats.count}区間, 平均${avgTime}分, 平均${avgDist}km`);
  }

  // 極端な所要時間をチェック
  console.log('\n所要時間チェック:');
  let shortCount = 0;
  let longCount = 0;
  const longSegments: { line: string; segment: Segment }[] = [];

  for (const [lineCode, segments] of lineSegments) {
    for (const seg of segments) {
      if (seg.time <= 2) shortCount++;
      if (seg.time >= 15) {
        longCount++;
        const lineInfo = lineInfoMap.get(lineCode);
        if (longSegments.length < 10) {
          longSegments.push({ line: lineInfo?.name || lineCode, segment: seg });
        }
      }
    }
  }

  console.log(`  2分以下の区間: ${shortCount}件`);
  console.log(`  15分以上の区間: ${longCount}件`);

  if (longSegments.length > 0) {
    console.log('\n  長い区間の例:');
    for (const { line, segment } of longSegments.slice(0, 5)) {
      console.log(`    ${line}: ${segment.from_name} → ${segment.to_name} (${segment.time}分, ${segment.distance}km)`);
    }
  }

  console.log('\n=== 完了 ===');
  console.log(`出力先: ${OUTPUT_DIR}`);
}

main().catch(console.error);
