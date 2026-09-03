"use client";

export default function ErrorPage({
  reset,
}: Readonly<{
  error: Readonly<Error>;
  reset: () => void;
}>) {
  return (
    <section className="py-12 text-center">
      <h1 className="text-2xl">Something went wrong</h1>
      <button
        className="eink-interactive mt-4 border-2 border-dotted border-[var(--color-line)] px-3 py-2"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </section>
  );
}
