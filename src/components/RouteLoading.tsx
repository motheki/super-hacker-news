export function RouteLoading({ label }: Readonly<{ label: string }>) {
  return (
    <p className="eink-muted" role="status">
      Loading {label}…
    </p>
  );
}
