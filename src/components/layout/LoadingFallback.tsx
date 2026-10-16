export function LoadingFallback({ label = "Cargando…" }: { label?: string }) {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <div className="flex items-center gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2 rounded-full bg-subtle-foreground/50 motion-safe:animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <span className="text-sm">{label}</span>
      </div>
    </main>
  );
}
