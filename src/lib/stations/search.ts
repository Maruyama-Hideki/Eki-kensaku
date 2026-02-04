import type { Station, StationGraph, SearchResult, RouteStep } from '@/types/station';
import { estimateTransferTime } from './transfer';

/**
 * 優先度付きキューのエントリ
 * 状態: (駅コード, 現在の路線コード)
 */
interface QueueEntry {
  stationCode: string;
  lineCode: string | null; // 現在乗っている路線（起点ではnull）
  totalTime: number;
}

/**
 * 経路復元用の情報
 */
interface PathInfo {
  prevStation: string | null;
  prevLine: string | null;
  lineCode: string | null;
  time: number; // この区間の所要時間（乗り換え時間含む）
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
      [this.heap[parentIndex], this.heap[index]] = [
        this.heap[index],
        this.heap[parentIndex],
      ];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (
        leftChild < length &&
        this.heap[leftChild].totalTime < this.heap[smallest].totalTime
      ) {
        smallest = leftChild;
      }
      if (
        rightChild < length &&
        this.heap[rightChild].totalTime < this.heap[smallest].totalTime
      ) {
        smallest = rightChild;
      }

      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [
        this.heap[index],
        this.heap[smallest],
      ];
      index = smallest;
    }
  }
}

/**
 * ダイクストラ法による最短経路探索（乗り換え時間考慮版）
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
  // 状態: "駅コード_路線コード" -> 最短時間
  const stateDistances = new Map<string, number>();
  // 駅ごとの最短時間（結果用）
  const stationDistances = new Map<string, number>();
  // 経路復元用: 状態 -> 前の状態情報
  const pathMap = new Map<string, PathInfo>();
  // 駅ごとの最短経路到達時の状態（どの路線で到達したか）
  const bestStateForStation = new Map<string, string>();
  const queue = new PriorityQueue();

  // 起点を初期化（どの路線にも乗っていない状態）
  const initialState = `${originCode}_null`;
  stateDistances.set(initialState, 0);
  stationDistances.set(originCode, 0);
  bestStateForStation.set(originCode, initialState);
  pathMap.set(initialState, {
    prevStation: null,
    prevLine: null,
    lineCode: null,
    time: 0,
  });
  queue.push({ stationCode: originCode, lineCode: null, totalTime: 0 });

  while (!queue.isEmpty()) {
    const current = queue.pop()!;
    const currentState = `${current.stationCode}_${current.lineCode}`;

    // この状態での最短時間より長ければスキップ
    const bestTime = stateDistances.get(currentState);
    if (bestTime !== undefined && current.totalTime > bestTime) continue;

    // 最大時間を超えたらスキップ
    if (current.totalTime > maxTime) continue;

    // 現在の駅の情報を取得
    const currentStation = stationMap.get(current.stationCode);
    if (!currentStation) continue;

    // 隣接駅を探索
    const edges = graph.get(current.stationCode) || [];
    for (const edge of edges) {
      let newTime = current.totalTime + edge.time;
      let segmentTime = edge.time;

      // 乗り換えが必要かチェック
      const needsTransfer =
        current.lineCode !== null && current.lineCode !== edge.line;

      if (needsTransfer) {
        // 乗り換え時間を加算（現在の駅での乗り換え）
        const transferTime = estimateTransferTime(currentStation);
        newTime += transferTime;
        segmentTime += transferTime;
      }

      // 最大時間を超えるならスキップ
      if (newTime > maxTime) continue;

      // 新しい状態
      const newState = `${edge.station}_${edge.line}`;

      // より短い経路が見つかった場合のみ更新
      const existingStateTime = stateDistances.get(newState);
      if (existingStateTime === undefined || newTime < existingStateTime) {
        stateDistances.set(newState, newTime);

        // 経路情報を保存
        pathMap.set(newState, {
          prevStation: current.stationCode,
          prevLine: current.lineCode,
          lineCode: edge.line,
          time: segmentTime,
        });

        // 駅ごとの最短時間も更新
        const existingStationTime = stationDistances.get(edge.station);
        if (existingStationTime === undefined || newTime < existingStationTime) {
          stationDistances.set(edge.station, newTime);
          bestStateForStation.set(edge.station, newState);
        }

        queue.push({
          stationCode: edge.station,
          lineCode: edge.line,
          totalTime: newTime,
        });
      }
    }
  }

  // 路線コードから路線名を取得するヘルパー
  const getLineName = (lineCode: string): string => {
    for (const station of stationMap.values()) {
      const line = station.lines.find((l) => l.code === lineCode);
      if (line) return line.name;
    }
    return lineCode;
  };

  // 経路を復元する関数
  const reconstructRoute = (stationCode: string): RouteStep[] => {
    const route: RouteStep[] = [];
    const bestState = bestStateForStation.get(stationCode);
    if (!bestState) return route;

    let currentState = bestState;

    while (currentState) {
      const info = pathMap.get(currentState);
      if (!info || info.prevStation === null) break;

      const fromStation = stationMap.get(info.prevStation);
      const [toStationCode] = currentState.split('_');
      const toStation = stationMap.get(toStationCode);

      if (fromStation && toStation && info.lineCode) {
        route.unshift({
          fromCode: info.prevStation,
          toCode: toStationCode,
          from: fromStation.name,
          to: toStation.name,
          line: getLineName(info.lineCode),
          time: info.time,
        });
      }

      // 前の状態へ
      currentState = `${info.prevStation}_${info.prevLine}`;
    }

    return route;
  };

  // 結果を構築
  const results: SearchResult[] = [];
  for (const [stationCode, totalTime] of stationDistances) {
    const station = stationMap.get(stationCode);
    if (station) {
      const route = reconstructRoute(stationCode);
      results.push({
        station,
        totalTime,
        timesFromOrigins: { [originCode]: totalTime },
        routesFromOrigins: route.length > 0 ? { [originCode]: route } : undefined,
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
