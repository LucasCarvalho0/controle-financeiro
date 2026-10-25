"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function CategoryChart({ data }: { data: { name: string; value: string }[] }) {
  if (data.length === 0) return <p className="text-sm text-slate-500">Sem despesas no período.</p>;
  const rows = data.map((d) => ({ name: d.name, valor: Number(d.value) }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(v) => `R$ ${v}`} />
          <YAxis type="category" dataKey="name" width={110} />
          <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
          <Bar dataKey="valor" fill="#dc2626" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
