import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStations, loadConnections } from '@/lib/stations/loader';
import { buildGraph } from '@/lib/stations/graph';
import { searchMultipleOriginsParallel } from '@/lib/stations/multi-search';
import type { Station, StationGraph } from '@/types/station';

// リクエストスキーマ
const RangeSearchSchema = z.object({
  origins: z.array(z.string()).min(1, '起点を1つ以上指定してください'),
  timeMinutes: z.number().min(1).max(180, '最大180分まで指定可能です'),
  mode: z.enum(['or', 'and']).default('or'),
});

// グラフと駅マップのキャッシュ
let cachedGraph: StationGraph | null = null;
let cachedStationMap: Map<string, Station> | null = null;

async function getGraphAndStationMap(): Promise<{
  graph: StationGraph;
  stationMap: Map<string, Station>;
}> {
  if (cachedGraph && cachedStationMap) {
    return { graph: cachedGraph, stationMap: cachedStationMap };
  }

  const [stations, connections] = await Promise.all([
    loadStations(),
    loadConnections(),
  ]);

  const graph = buildGraph(stations, connections);
  const stationMap = new Map(stations.map(s => [s.code, s]));

  cachedGraph = graph;
  cachedStationMap = stationMap;

  return { graph, stationMap };
}

/**
 * POST /api/range
 * 範囲検索を実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // バリデーション
    const parseResult = RangeSearchSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { origins, timeMinutes, mode } = parseResult.data;

    // グラフと駅マップを取得
    const { graph, stationMap } = await getGraphAndStationMap();

    // 存在しない駅コードをチェック
    const invalidOrigins = origins.filter(code => !stationMap.has(code));
    if (invalidOrigins.length > 0) {
      return NextResponse.json(
        {
          error: '無効な駅コードが含まれています',
          invalidOrigins,
        },
        { status: 400 }
      );
    }

    // 検索を実行
    const results = await searchMultipleOriginsParallel(graph, stationMap, {
      origins,
      maxTime: timeMinutes,
      mode,
    });

    return NextResponse.json({
      stations: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Range search failed:', error);
    return NextResponse.json(
      { error: '検索処理でエラーが発生しました' },
      { status: 500 }
    );
  }
}
