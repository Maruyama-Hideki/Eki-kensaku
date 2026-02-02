'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useStations } from '../hooks/useStations';
import type { Station } from '@/types/station';

interface SearchPanelProps {
  onSearch: (origins: string[], timeMinutes: number, mode: 'or' | 'and') => void;
  isLoading: boolean;
}

export function SearchPanel({ onSearch, isLoading }: SearchPanelProps) {
  const { data: stationsData, isLoading: isLoadingStations } = useStations();
  const [selectedStations, setSelectedStations] = useState<Station[]>([]);
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [mode, setMode] = useState<'or' | 'and'>('or');
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const stations = stationsData?.stations || [];

  // 検索クエリでフィルタリング
  const filteredStations = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return stations
      .filter(
        (s) =>
          s.name.toLowerCase().includes(query) &&
          !selectedStations.some((sel) => sel.code === s.code)
      )
      .slice(0, 50); // パフォーマンスのため50件に制限
  }, [stations, searchQuery, selectedStations]);

  const handleSelectStation = (station: Station) => {
    setSelectedStations((prev) => [...prev, station]);
    setSearchQuery('');
  };

  const handleRemoveStation = (stationCode: string) => {
    setSelectedStations((prev) => prev.filter((s) => s.code !== stationCode));
  };

  const handleSearch = () => {
    if (selectedStations.length === 0) return;
    const originCodes = selectedStations.map((s) => s.code);
    onSearch(originCodes, timeMinutes, mode);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>駅範囲検索</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 起点駅選択 */}
        <div className="space-y-2">
          <Label>起点駅（複数選択可）</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={isLoadingStations}
              >
                {isLoadingStations
                  ? '駅データを読み込み中...'
                  : '駅名を入力して検索'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="駅名を入力..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>
                    {searchQuery ? '駅が見つかりません' : '駅名を入力してください'}
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredStations.map((station) => (
                      <CommandItem
                        key={station.code}
                        value={station.code}
                        onSelect={() => {
                          handleSelectStation(station);
                          setOpen(false);
                        }}
                      >
                        <span>{station.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {station.lines[0]?.company}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* 選択された駅 */}
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedStations.map((station) => (
              <Badge
                key={station.code}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => handleRemoveStation(station.code)}
              >
                {station.name} ×
              </Badge>
            ))}
          </div>
        </div>

        {/* 時間スライダー */}
        <div className="space-y-2">
          <Label>最大所要時間: {timeMinutes}分</Label>
          <Slider
            value={[timeMinutes]}
            onValueChange={(value) => setTimeMinutes(value[0])}
            min={5}
            max={120}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5分</span>
            <span>120分</span>
          </div>
        </div>

        {/* 検索モード */}
        <div className="space-y-2">
          <Label>検索モード</Label>
          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as 'or' | 'and')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="or" id="mode-or" />
              <Label htmlFor="mode-or" className="cursor-pointer">
                OR（いずれかから到達可能）
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="and" id="mode-and" />
              <Label htmlFor="mode-and" className="cursor-pointer">
                AND（すべてから到達可能）
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* 検索ボタン */}
        <Button
          onClick={handleSearch}
          disabled={selectedStations.length === 0 || isLoading}
          className="w-full"
        >
          {isLoading ? '検索中...' : '検索'}
        </Button>
      </CardContent>
    </Card>
  );
}
