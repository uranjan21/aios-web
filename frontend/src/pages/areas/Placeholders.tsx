export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-6 lg:p-8 flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-16 h-16 rounded-3xl bg-muted/50 mb-6 flex items-center justify-center border border-border">
        <span className="text-2xl text-muted-foreground font-semibold uppercase">{title.charAt(0)}</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">{title}</h1>
      <p className="text-muted-foreground max-w-md">
        This area is currently under construction. We are rolling out the new premium architecture across the entire AiOS.
      </p>
    </div>
  )
}
