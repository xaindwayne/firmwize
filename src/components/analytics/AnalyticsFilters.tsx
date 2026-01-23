import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface AnalyticsFiltersProps {
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  department: string;
  onDepartmentChange: (value: string) => void;
  departments: string[];
  customDateRange?: DateRange;
  onCustomDateRangeChange?: (range: DateRange | undefined) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function AnalyticsFilters({
  dateRange,
  onDateRangeChange,
  department,
  onDepartmentChange,
  departments,
  customDateRange,
  onCustomDateRangeChange,
  onRefresh,
  loading,
}: AnalyticsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Period:</span>
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {dateRange === 'custom' && onCustomDateRangeChange && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[260px] justify-start text-left font-normal',
                !customDateRange && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {customDateRange?.from ? (
                customDateRange.to ? (
                  <>
                    {format(customDateRange.from, 'LLL dd, y')} -{' '}
                    {format(customDateRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(customDateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={customDateRange?.from}
              selected={customDateRange}
              onSelect={onCustomDateRangeChange}
              numberOfMonths={2}
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Department:</span>
        <Select value={department} onValueChange={onDepartmentChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="ml-auto">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
