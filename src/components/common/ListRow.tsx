import { cn } from '@/lib/utils';

interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function ListRow({ leading, trailing, className, children, ...props }: ListRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card/60 px-4 py-3 transition-colors hover:bg-accent/40',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {leading}
        <div>{children}</div>
      </div>
      {trailing && <div className="flex items-center gap-2">{trailing}</div>}
    </div>
  );
}
