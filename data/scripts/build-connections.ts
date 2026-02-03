/**
 * 接続データビルドスクリプト
 *
 * 路線ごとのYAMLファイルを読み込み、統合されたJSONファイルを生成する
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// 型定義
interface Segment {
  from: string;
  from_name?: string;
  to: string;
  to_name?: string;
  time: number;
  distance?: number;
}

interface LineYaml {
  line_code: string;
  line_name: string;
  company: string;
  type: string;
  default_speed: number;
  segments: Segment[];
}

interface ConnectionWithTime {
  from: string;
  to: string;
  line: string;
  time: number;
}

interface OutputJson {
  generated_at: string;
  total_connections: number;
  connections: ConnectionWithTime[];
}

// パス設定
const ROOT_DIR = path.resolve(__dirname, '../..');
const YAML_DIR = path.join(ROOT_DIR, 'data/travel-times/lines');
const OUTPUT_PATH = path.join(ROOT_DIR, 'data/travel-times/generated/connections-with-times.json');

async function main() {
  console.log('=== 接続データビルド ===\n');

  // YAMLディレクトリの存在確認
  if (!fs.existsSync(YAML_DIR)) {
    console.error(`エラー: YAMLディレクトリが存在しません: ${YAML_DIR}`);
    console.error('先に npm run generate:times を実行してください。');
    process.exit(1);
  }

  // YAMLファイル一覧を取得
  const yamlFiles = fs.readdirSync(YAML_DIR).filter((f) => f.endsWith('.yaml'));
  console.log(`YAMLファイル数: ${yamlFiles.length}`);

  if (yamlFiles.length === 0) {
    console.error('エラー: YAMLファイルが見つかりません。');
    console.error('先に npm run generate:times を実行してください。');
    process.exit(1);
  }

  // 全セグメントを統合
  const allConnections: ConnectionWithTime[] = [];
  const lineStats: { name: string; count: number }[] = [];

  for (const yamlFile of yamlFiles) {
    const filePath = path.join(YAML_DIR, yamlFile);
    const content = fs.readFileSync(filePath, 'utf-8');

    try {
      const lineData = yaml.load(content) as LineYaml;

      if (!lineData || !lineData.segments) {
        console.warn(`警告: ${yamlFile} にセグメントがありません`);
        continue;
      }

      let segmentCount = 0;
      for (const segment of lineData.segments) {
        allConnections.push({
          from: segment.from,
          to: segment.to,
          line: lineData.line_code,
          time: segment.time,
        });
        segmentCount++;
      }

      lineStats.push({ name: lineData.line_name, count: segmentCount });
    } catch (err) {
      console.error(`エラー: ${yamlFile} の解析に失敗:`, err);
    }
  }

  console.log(`\n統合済み接続数: ${allConnections.length}`);

  // 出力ディレクトリ作成
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // JSON出力
  const output: OutputJson = {
    generated_at: new Date().toISOString(),
    total_connections: allConnections.length,
    connections: allConnections,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n出力先: ${OUTPUT_PATH}`);

  // 統計情報
  console.log('\n=== 統計情報 ===');

  // 所要時間の分布
  const timeDistribution = new Map<number, number>();
  for (const conn of allConnections) {
    const bucket = Math.floor(conn.time / 5) * 5; // 5分刻み
    timeDistribution.set(bucket, (timeDistribution.get(bucket) || 0) + 1);
  }

  console.log('\n所要時間分布（5分刻み）:');
  const sortedBuckets = Array.from(timeDistribution.entries()).sort((a, b) => a[0] - b[0]);
  for (const [bucket, count] of sortedBuckets) {
    const bar = '█'.repeat(Math.min(50, Math.round(count / 100)));
    console.log(`  ${bucket.toString().padStart(3)}分〜: ${count.toString().padStart(5)}件 ${bar}`);
  }

  // 上位路線
  console.log('\n接続数上位10路線:');
  lineStats.sort((a, b) => b.count - a.count);
  for (const stat of lineStats.slice(0, 10)) {
    console.log(`  ${stat.name}: ${stat.count}区間`);
  }

  console.log('\n=== 完了 ===');
}

main().catch(console.error);
