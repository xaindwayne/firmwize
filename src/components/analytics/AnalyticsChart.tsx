import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTypeSelector, ChartType } from './ChartTypeSelector';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

const CHART_COLORS = [
  'hsl(262, 83%, 58%)',
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(280, 70%, 55%)',
  'hsl(180, 70%, 45%)',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DataPoint = Record<string, any>;

interface AnalyticsChartProps {
  title: string;
  description?: string;
  data: DataPoint[];
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  availableTypes?: ChartType[];
  xKey: string;
  yKeys: { key: string; label: string; color?: string }[];
  loading?: boolean;
  height?: number;
  valueFormatter?: (value: number) => string;
}

export function AnalyticsChart({
  title,
  description,
  data,
  chartType,
  onChartTypeChange,
  availableTypes,
  xKey,
  yKeys,
  loading,
  height = 300,
  valueFormatter = (v) => v.toString(),
}: AnalyticsChartProps) {
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
  };

  const renderChart = () => {
    if (loading) {
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">No data available</p>
        </div>
      );
    }

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey={xKey} 
                className="text-muted-foreground text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis className="text-muted-foreground text-xs" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => valueFormatter(value)} />
              <Legend />
              {yKeys.map((y, i) => (
                <Line
                  key={y.key}
                  type="monotone"
                  dataKey={y.key}
                  name={y.label}
                  stroke={y.color || CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey={xKey} 
                className="text-muted-foreground text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis className="text-muted-foreground text-xs" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => valueFormatter(value)} />
              <Legend />
              {yKeys.map((y, i) => (
                <Bar
                  key={y.key}
                  dataKey={y.key}
                  name={y.label}
                  fill={y.color || CHART_COLORS[i % CHART_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'stacked':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey={xKey} 
                className="text-muted-foreground text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis className="text-muted-foreground text-xs" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => valueFormatter(value)} />
              <Legend />
              {yKeys.map((y, i) => (
                <Bar
                  key={y.key}
                  dataKey={y.key}
                  name={y.label}
                  fill={y.color || CHART_COLORS[i % CHART_COLORS.length]}
                  stackId="stack"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'donut':
        const pieData = yKeys.length > 0 
          ? data.map((d, i) => ({ name: d[xKey], value: d[yKeys[0].key] as number }))
          : [];
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => valueFormatter(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'progress':
        const maxValue = Math.max(...data.map(d => Number(d[yKeys[0]?.key] || 0)));
        return (
          <div className="space-y-4">
            {data.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{item[xKey]}</span>
                  <span className="text-muted-foreground">
                    {valueFormatter(item[yKeys[0]?.key] as number)}
                  </span>
                </div>
                <Progress 
                  value={maxValue > 0 ? (Number(item[yKeys[0]?.key]) / maxValue) * 100 : 0} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className="max-h-[300px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{xKey}</TableHead>
                  {yKeys.map((y) => (
                    <TableHead key={y.key} className="text-right">{y.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row[xKey]}</TableCell>
                    {yKeys.map((y) => (
                      <TableCell key={y.key} className="text-right">
                        {valueFormatter(row[y.key] as number)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <ChartTypeSelector
          value={chartType}
          onChange={onChartTypeChange}
          availableTypes={availableTypes}
        />
      </CardHeader>
      <CardContent>
        <div style={{ height: chartType === 'progress' || chartType === 'table' ? 'auto' : height }}>
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}
