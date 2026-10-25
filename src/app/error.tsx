"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto mt-24 max-w-md card text-center">
      <h1 className="text-lg font-semibold">Algo deu errado</h1>
      <p className="mt-2 text-sm text-slate-600">Não foi possível concluir a operação. Tente novamente.</p>
      <button className="btn mt-4" onClick={reset}>Tentar novamente</button>
    </div>
  );
}
