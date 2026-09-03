"use client";

export default function GlobalError({
  reset,
}: Readonly<{
  error: Readonly<Error>;
  reset: () => void;
}>) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            fontFamily: "monospace",
            padding: "3rem",
            textAlign: "center",
          }}
        >
          <h1>Something went wrong</h1>
          <p>The application could not finish loading.</p>
          <button onClick={reset} type="button">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
