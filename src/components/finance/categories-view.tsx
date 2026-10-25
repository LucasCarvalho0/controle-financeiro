"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  TrendingDown,
  TrendingUp,
  FolderOpen,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string;
  icon?: string | null;
  isActive: boolean;
}

const PRESET_COLORS = [
  "#ef4444", // Vermelho
  "#f97316", // Laranja
  "#f59e0b", // Âmbar
  "#10b981", // Esmeralda
  "#06b6d4", // Ciano
  "#3b82f6", // Azul
  "#6366f1", // Índigo
  "#8b5cf6", // Violeta
  "#ec4899", // Rosa
  "#64748b", // Ardósia
  "#14b8a6", // Teal
  "#84cc16", // Lima
];

export function CategoriesView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "EXPENSE" | "INCOME">("ALL");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Modais de Criação e Edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Campos do formulário
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Carregar categorias
  async function loadCategories() {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  // Abrir modal de criação
  function openCreate() {
    setEditingCat(null);
    setFormName("");
    setFormType("EXPENSE");
    setFormColor(PRESET_COLORS[0]);
    setModalOpen(true);
  }

  // Abrir modal de edição
  function openEdit(cat: Category) {
    setEditingCat(cat);
    setFormName(cat.name);
    setFormType(cat.type);
    setFormColor(cat.color || PRESET_COLORS[0]);
    setModalOpen(true);
  }

  // Salvar (criar ou editar)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;

    setFormSubmitting(true);
    try {
      if (editingCat) {
        // Atualizar
        const res = await fetch(`/api/categories/${editingCat.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            type: formType,
            color: formColor,
          }),
        });

        if (res.ok) {
          setMsg({ ok: true, text: "Categoria atualizada com sucesso!" });
          setModalOpen(false);
          void loadCategories();
        } else {
          const j = await res.json();
          alert(j.error?.message ?? "Erro ao atualizar categoria.");
        }
      } else {
        // Criar
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            type: formType,
            color: formColor,
          }),
        });

        if (res.ok) {
          setMsg({ ok: true, text: "Nova categoria criada com sucesso!" });
          setModalOpen(false);
          void loadCategories();
        } else {
          const j = await res.json();
          alert(j.error?.message ?? "Erro ao criar categoria.");
        }
      }
    } catch {
      alert("Erro na conexão ao salvar categoria.");
    } finally {
      setFormSubmitting(false);
    }
  }

  // Excluir categoria
  async function handleDelete(cat: Category) {
    if (!confirm(`Deseja realmente excluir a categoria "${cat.name}"?`)) return;

    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
      if (res.ok) {
        const j = await res.json();
        setMsg({ ok: true, text: j.message ?? "Categoria removida com sucesso!" });
        void loadCategories();
      } else {
        const j = await res.json();
        alert(j.error?.message ?? "Não foi possível remover a categoria.");
      }
    } catch {
      alert("Erro na conexão ao excluir categoria.");
    }
  }

  // Filtragem
  const filtered = useMemo(() => {
    return categories.filter((c) => {
      const matchesType = typeFilter === "ALL" || c.type === typeFilter;
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [categories, typeFilter, search]);

  const expenseCount = categories.filter((c) => c.type === "EXPENSE").length;
  const incomeCount = categories.filter((c) => c.type === "INCOME").length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl flex items-center gap-2">
            <Tag className="h-6 w-6 text-blue-600" />
            Gestão de Categorias
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Adicione, edite ou exclua categorias para organizar seus lançamentos de despesas e receitas.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="btn bg-blue-600 hover:bg-blue-700 shadow-sm text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Nova Categoria
        </button>
      </div>

      {/* FEEDBACK MSG */}
      {msg && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-all ${
            msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            {msg.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-rose-600" />}
            {msg.text}
          </span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div
          onClick={() => setTypeFilter("ALL")}
          className={`card cursor-pointer transition-all ${
            typeFilter === "ALL" ? "border-blue-500 ring-2 ring-blue-100" : "hover:border-slate-300"
          }`}
        >
          <p className="text-xs font-medium text-slate-500">Total de Categorias</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{categories.length}</p>
        </div>

        <div
          onClick={() => setTypeFilter("EXPENSE")}
          className={`card cursor-pointer transition-all ${
            typeFilter === "EXPENSE" ? "border-rose-500 ring-2 ring-rose-100" : "hover:border-slate-300"
          }`}
        >
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5 text-rose-600" /> Despesas
          </p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{expenseCount}</p>
        </div>

        <div
          onClick={() => setTypeFilter("INCOME")}
          className={`card cursor-pointer transition-all ${
            typeFilter === "INCOME" ? "border-emerald-500 ring-2 ring-emerald-100" : "hover:border-slate-300"
          }`}
        >
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Receitas
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{incomeCount}</p>
        </div>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Pesquisar categoria por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => setTypeFilter("ALL")}
            className={`btn-ghost text-xs ${typeFilter === "ALL" ? "bg-slate-200 font-semibold" : ""}`}
          >
            Todas ({categories.length})
          </button>
          <button
            onClick={() => setTypeFilter("EXPENSE")}
            className={`btn-ghost text-xs ${typeFilter === "EXPENSE" ? "bg-rose-100 text-rose-800 font-semibold" : ""}`}
          >
            Despesas ({expenseCount})
          </button>
          <button
            onClick={() => setTypeFilter("INCOME")}
            className={`btn-ghost text-xs ${typeFilter === "INCOME" ? "bg-emerald-100 text-emerald-800 font-semibold" : ""}`}
          >
            Receitas ({incomeCount})
          </button>
        </div>
      </div>

      {/* GRID DE CATEGORIAS */}
      {loading ? (
        <div className="card p-12 text-center text-slate-500">
          <div className="inline-flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Carregando categorias…
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <FolderOpen className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="font-medium text-slate-700">Nenhuma categoria encontrada.</p>
          <p className="text-xs text-slate-400 mt-1">
            Clique no botão acima para adicionar uma nova categoria.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cat) => (
            <div
              key={cat.id}
              className="card flex items-center justify-between p-3.5 hover:shadow-md transition-shadow group border-slate-200"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold shadow-xs shrink-0"
                  style={{ backgroundColor: cat.color }}
                >
                  <Tag className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{cat.name}</p>
                  <span
                    className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                      cat.type === "EXPENSE"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {cat.type === "EXPENSE" ? "Despesa" : "Receita"}
                  </span>
                </div>
              </div>

              {/* Ações: Editar e Excluir */}
              <div className="flex items-center gap-1">
                <button
                  title="Editar categoria"
                  onClick={() => openEdit(cat)}
                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  title="Excluir categoria"
                  onClick={() => handleDelete(cat)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE CATEGORIA                                    */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingCat ? "Editar Categoria" : "Nova Categoria"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {editingCat ? "Altere o nome, tipo ou cor da categoria." : "Cadastre uma nova categoria para seus lançamentos."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="catName">
                  Nome da Categoria
                </label>
                <input
                  id="catName"
                  className="input font-medium"
                  placeholder="Ex: Farmácia, Cinema, Academia..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType("EXPENSE")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all ${
                      formType === "EXPENSE"
                        ? "border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <TrendingDown className="h-3.5 w-3.5" />
                    Despesa
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType("INCOME")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all ${
                      formType === "INCOME"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    Receita
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Cor de Identificação</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      className={`h-7 w-7 rounded-full transition-transform ${
                        formColor === c ? "scale-125 ring-2 ring-blue-500 ring-offset-2" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-center">
                <span className="text-xs text-slate-400 block mb-1">Prévia da Tag</span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold text-white shadow-xs"
                  style={{ backgroundColor: formColor }}
                >
                  <Tag className="h-3.5 w-3.5" />
                  {formName.trim() || "Nome da Categoria"}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-ghost text-xs"
                  disabled={formSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn bg-blue-600 hover:bg-blue-700 text-xs font-semibold"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? "Salvando…" : editingCat ? "Salvar Alterações" : "Criar Categoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
