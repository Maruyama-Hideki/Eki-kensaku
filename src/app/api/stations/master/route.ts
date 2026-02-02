import { NextResponse } from 'next/server';
import { loadStations } from '@/lib/stations/loader';

/**
 * GET /api/stations/master
 * 全駅データを返す
 */
export async function GET() {
  try {
    const stations = await loadStations();

    return NextResponse.json({
      stations,
      count: stations.length,
    });
  } catch (error) {
    console.error('Failed to load stations:', error);
    return NextResponse.json(
      { error: 'Failed to load station data' },
      { status: 500 }
    );
  }
}
