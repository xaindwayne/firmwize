import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  Layers, 
  List, 
  ChevronDown,
  BarChartHorizontal,
} from 'lucide-react';

export type ChartType = 'line' | 'bar' | 'donut' | 'stacked' | 'progress' | 'table';

interface ChartTypeSelectorProps {
  value: ChartType;
  onChange: (type: ChartType) => void;
  availableTypes?: ChartType[];
}

const chartTypeConfig: Record<ChartType, { icon: React.ElementType; label: string }> = {
  line: { icon: LineChart, label: 'Line Chart' },
  bar: { icon: BarChart3, label: 'Bar Chart' },
  donut: { icon: PieChart, label: 'Donut Chart' },
  stacked: { icon: Layers, label: 'Stacked Bar' },
  progress: { icon: BarChartHorizontal, label: 'Progress Bars' },
  table: { icon: List, label: 'Table View' },
};

export function ChartTypeSelector({ 
  value, 
  onChange, 
  availableTypes = ['line', 'bar', 'donut', 'stacked', 'progress', 'table'] 
}: ChartTypeSelectorProps) {
  const CurrentIcon = chartTypeConfig[value].icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <CurrentIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{chartTypeConfig[value].label}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableTypes.map((type) => {
          const { icon: Icon, label } = chartTypeConfig[type];
          return (
            <DropdownMenuItem
              key={type}
              onClick={() => onChange(type)}
              className={value === type ? 'bg-accent/10 text-accent' : ''}
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
