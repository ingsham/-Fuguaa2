'use client';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-x max-w-xl py-24 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-ink/75">Please try again. If it keeps happening, tell us the code below.</p>
      {error.digest && <p className="mt-2 font-mono text-sm text-ink/60">Code: {error.digest}</p>}
      <button onClick={reset} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
