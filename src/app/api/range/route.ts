import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadGraphAndStationMap } from '@/lib/stations/loader';
import { searchMultipleOriginsParallel, searchWithGroups } from '@/lib/stations/multi-search';

// グループ検索用スキーマ
const GroupSearchSchema = z.object({
  originGroups: z.array(
    z.object({
      origins: z.array(z.string()).min(1),
      timeMinutes: z.number().min(1).max(180),
    })
  ).min(1, 'グループを1つ以上指定してください'),
});

// 従来のスキーマ（後方互換性のため）
const LegacySearchSchema = z.object({
  origins: z.array(z.string()).min(1, '起点を1つ以上指定してください'),
  timeMinutes: z.number().min(1).max(180, '最大180分まで指定可能です'),
  mode: z.enum(['or', 'and']).default('or'),
});

/**
 * POST /api/range
 * 範囲検索を実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ビルド済みグラフと駅マップを取得
    const { graph, stationMap } = await loadGraphAndStationMap();

    // グループ検索かレガシー検索かを判定
    const groupParseResult = GroupSearchSchema.safeParse(body);

    if (groupParseResult.success) {
      // グループ検索（新形式）
      const { originGroups } = groupParseResult.data;

      // 存在しない駅コードをチェック
      const allOrigins = originGroups.flatMap((g) => g.origins);
      const invalidOrigins = allOrigins.filter((code) => !stationMap.has(code));
      if (invalidOrigins.length > 0) {
        return NextResponse.json(
          {
            error: '無効な駅コードが含まれています',
            invalidOrigins,
          },
          { status: 400 }
        );
      }

      // グループ検索を実行
      const results = await searchWithGroups(graph, stationMap, originGroups);

      return NextResponse.json({
        stations: results,
        count: results.length,
      });
    }

    // レガシー検索（後方互換性）
    const legacyParseResult = LegacySearchSchema.safeParse(body);
    if (!legacyParseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: legacyParseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { origins, timeMinutes, mode } = legacyParseResult.data;

    // 存在しない駅コードをチェック
    const invalidOrigins = origins.filter((code) => !stationMap.has(code));
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
