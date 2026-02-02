import type { Station, StationGraph, SearchResult } from '@/types/station';

/**
 * 優先度付きキューのエントリ
 */
interface QueueEntry {
  stationCode: string;
  totalTime: number;
}

/**
 * シンプルな優先度付きキュー（ヒープベース）
 */
class PriorityQueue {
  private heap: QueueEntry[] = [];

  push(entry: QueueEntry): void {
    this.heap.push(entry);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): QueueEntry | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return min;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].totalTime <= this.heap[index].totalTime) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length && this.heap[leftChild].totalTime < this.heap[smallest].totalTime) {
        smallest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild].totalTime < this.heap[smallest].totalTime) {
        smallest = rightChild;
      }

      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }
}

/**
 * ダイクストラ法による最短経路探索
 * 指定した起点から指定時間内に到達可能な駅を探索
 *
 * @param graph グラフ構造
 * @param stationMap 駅コード -> 駅情報のマップ
 * @param originCode 起点駅コード
 * @param maxTime 最大所要時間（分）
 * @returns 到達可能な駅のリスト（所要時間付き）
 */
export function searchReachableStations(
  graph: StationGraph,
  stationMap: Map<string, Station>,
  originCode: string,
  maxTime: number
): SearchResult[] {
  const distances = new Map<string, number>();
  const visited = new Set<string>();
  const queue = new PriorityQueue();

  // 起点を初期化
  distances.set(originCode, 0);
  queue.push({ stationCode: originCode, totalTime: 0 });

  while (!queue.isEmpty()) {
    const current = queue.pop()!;

    // 既に訪問済みならスキップ
    if (visited.has(current.stationCode)) continue;
    visited.add(current.stationCode);

    // 最大時間を超えたらスキップ
    if (current.totalTime > maxTime) continue;

    // 隣接駅を探索
    const edges = graph.get(current.stationCode) || [];
    for (const edge of edges) {
      const newTime = current.totalTime + edge.time;

      // 最大時間を超えるならスキップ
      if (newTime > maxTime) continue;

      // より短い経路が見つかった場合のみ更新
      const existingTime = distances.get(edge.station);
      if (existingTime === undefined || newTime < existingTime) {
        distances.set(edge.station, newTime);
        queue.push({ stationCode: edge.station, totalTime: newTime });
      }
    }
  }

  // 結果を構築
  const results: SearchResult[] = [];
  for (const [stationCode, totalTime] of distances) {
    const station = stationMap.get(stationCode);
    if (station) {
      results.push({
        station,
        totalTime,
        timesFromOrigins: { [originCode]: totalTime },
      });
    }
  }

  // 所要時間でソート
  results.sort((a, b) => a.totalTime - b.totalTime);

  return results;
}

/**
 * 駅名から駅コードを検索
 */
export function findStationByName(
  stationMap: Map<string, Station>,
  name: string
): Station | undefined {
  for (const station of stationMap.values()) {
    if (station.name === name) {
      return station;
    }
  }
  return undefined;
}
