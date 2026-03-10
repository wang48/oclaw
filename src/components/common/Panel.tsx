import { cn } from '@/lib/utils';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'default' | 'subtle';
}

export function Panel({ className, tone = 'default', ...props }: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card/80 shadow-[0_1px_0_rgba(0,0,0,0.03)] backdrop-blur',
        tone === 'subtle' && 'bg-card/60 border-border/40',
        className
      )}
      {...props}
    />
  );
}
