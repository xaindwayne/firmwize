import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive?: boolean;
    label?: string;
  };
  iconBgClass?: string;
  iconColorClass?: string;
}

export function KPICard({ 
  title, 
  value, 
  icon, 
  trend,
  iconBgClass = 'bg-accent/10',
  iconColorClass = 'text-accent',
}: KPICardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="h-3 w-3" />;
    if (trend.value < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.isPositive === undefined) {
      return trend.value >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive';
    }
    return trend.isPositive ? 'text-[hsl(var(--success))]' : 'text-destructive';
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', iconBgClass)}>
            <div className={iconColorClass}>{icon}</div>
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
          {trend && (
            <div className={cn('flex items-center gap-1 text-sm', getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend.value)}%</span>
              {trend.label && (
                <span className="text-xs text-muted-foreground ml-1">{trend.label}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
