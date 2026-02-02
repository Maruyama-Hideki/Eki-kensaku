'use client';

import { useState, useCallback } from 'react';
import type { SearchResult, RangeSearchResponse } from '@/types/station';

interface UseRangeSearchState {
  results: SearchResult[];
  count: number;
  isLoading: boolean;
  error: string | null;
}

interface UseRangeSearchReturn extends UseRangeSearchState {
  search: (origins: string[], timeMinutes: number, mode: 'or' | 'and') => Promise<void>;
  reset: () => void;
}

export function useRangeSearch(): UseRangeSearchReturn {
  const [state, setState] = useState<UseRangeSearchState>({
    results: [],
    count: 0,
    isLoading: false,
    error: null,
  });

  const search = useCallback(
    async (origins: string[], timeMinutes: number, mode: 'or' | 'and') => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch('/api/range', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origins, timeMinutes, mode }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '検索に失敗しました');
        }

        const data: RangeSearchResponse = await response.json();
        setState({
          results: data.stations,
          count: data.count,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : '不明なエラーが発生しました',
        }));
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      results: [],
      count: 0,
      isLoading: false,
      error: null,
    });
  }, []);

  return { ...state, search, reset };
}
