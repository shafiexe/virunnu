"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Pencil, Trash2, ChevronLeft, ChevronRight,
  Search, LayoutList, Tags, ChevronDown, ChevronUp, Zap, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Employee = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  salaryPaise: number | null;
  isActive: boolean;
};

type Expense = {
  id: string;
  category: string;
  label: string;
  amountPaise: number;
  date: string;
  notes: string | null;
  employeeId: string | null;
  employee: { id: string; name: string; role: string } | null;
};

type ExpenseItem = {
  id: string;
  name: string;
  defaultAmountPaise: number;
  notes: string | null;
};

type ExpenseCategory = {
  id: string;
  name: string;
  icon: string;
  items: ExpenseItem[];
};

type FormState = {
  category: string;
  label: string;
  amount: string;
  date: string;
  notes: string;
  employeeId: string;
};

const STAFF_ROLES = ["Cleaning Staff", "Security", "Supervisor", "Manager", "Driver", "Cook", "Helper", "Other"];

const PAGE_SIZE = 20;

const EMPTY_FORM: FormState = {
  category: "",
  label: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
  employeeId: "",
};

// ─── Category pill colors (cycle through palette) ─────────────────────────────

const PILL_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400",
  "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
];

function pillColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PILL_COLORS[h % PILL_COLORS.length];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExpenseManager({
  expenses: initial,
  year,
  month,
}: {
  expenses: Expense[];
  year: number;
  month: number;
}) {
  const router = useRouter();

  // ── Current month/year (owned locally so navigation is instant) ───────────────
  const [curYear, setCurYear] = useState(year);
  const [curMonth, setCurMonth] = useState(month);

  // ── Tab ──────────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"expenses" | "categories" | "staff">("expenses");

  // ── Expenses state ────────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<Expense[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [page, setPage] = useState(1);
  const [customCat, setCustomCat] = useState(false); // true = user typed a free-text category

  // ── Employees state ───────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [staffForm, setStaffForm] = useState({ name: "", role: STAFF_ROLES[0], phone: "", salary: "" });
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [editEmpId, setEditEmpId] = useState<string | null>(null);
  const [editEmpForm, setEditEmpForm] = useState({ name: "", role: "", phone: "", salary: "" });
  const [confirmDeleteEmpId, setConfirmDeleteEmpId] = useState<string | null>(null);
  const [empActionError, setEmpActionError] = useState<Record<string, string>>({});

  // ── Categories state ──────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  // Add category form
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📌");
  const [catFormLoading, setCatFormLoading] = useState(false);
  const [catFormError, setCatFormError] = useState("");
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("");
  // Item forms (keyed by categoryId)
  const [newItemByCat, setNewItemByCat] = useState<Record<string, { name: string; amount: string; notes: string }>>({});
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editItemForm, setEditItemForm] = useState({ name: "", amount: "", notes: "" });
  const [itemLoading, setItemLoading] = useState(false);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(null);

  // ── Load employees ────────────────────────────────────────────────────────────
  const loadEmployees = useCallback(async () => {
    const res = await fetch("/api/owner/employees");
    if (res.ok) { const d = await res.json(); setEmployees(d.employees ?? []); }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // ── Load categories ───────────────────────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    const res = await fetch("/api/owner/expense-categories");
    if (res.ok) {
      const d = await res.json();
      setCategories(d.categories ?? []);
    }
    setCatLoading(false);
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  // ── Refresh expenses ──────────────────────────────────────────────────────────
  const refreshExpenses = useCallback(async (y = curYear, m = curMonth) => {
    const res = await fetch(`/api/owner/expenses?year=${y}&month=${m}`);
    if (res.ok) {
      const data = await res.json();
      setExpenses(data.expenses.map((e: Expense) => ({ ...e, date: e.date.slice(0, 10) })));
    }
  }, [curYear, curMonth]);

  // ── Derived — filter + search + paginate ──────────────────────────────────────
  const filtered = useMemo(() => {
    let list = expenses;
    if (filterCategory !== "ALL") list = list.filter((e) => e.category === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) => e.label.toLowerCase().includes(q) ||
               e.category.toLowerCase().includes(q) ||
               (e.notes ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, filterCategory, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalPaise = filtered.reduce((s, e) => s + e.amountPaise, 0);

  // Unique categories in this month's expenses for filter chips
  const monthCategories = useMemo(() => {
    const seen = new Set<string>();
    return expenses.filter((e) => { if (seen.has(e.category)) return false; seen.add(e.category); return true; })
      .map((e) => e.category);
  }, [expenses]);

  // ── Nav month ─────────────────────────────────────────────────────────────────
  function navMonth(delta: number) {
    const d = new Date(curYear, curMonth - 1 + delta, 1);
    const newYear = d.getFullYear();
    const newMonth = d.getMonth() + 1;
    setCurYear(newYear);
    setCurMonth(newMonth);
    setSearch("");
    setFilterCategory("ALL");
    setPage(1);
    router.push(`/owner/expenses?year=${newYear}&month=${newMonth}`, { scroll: false });
    refreshExpenses(newYear, newMonth);
  }

  // ── Expense form ──────────────────────────────────────────────────────────────
  function openAdd(prefill?: Partial<FormState>) {
    setEditId(null);
    setCustomCat(false);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10), ...prefill });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(e: Expense) {
    setEditId(e.id);
    const knownCat = categories.some((c) => c.name === e.category);
    setCustomCat(!knownCat);
    setForm({ category: e.category, label: e.label, amount: String(e.amountPaise / 100), date: e.date, notes: e.notes ?? "", employeeId: e.employeeId ?? "" });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError("");
    const amountRupees = parseFloat(form.amount);
    if (!amountRupees || amountRupees <= 0) { setFormError("Enter a valid amount."); return; }
    if (!form.label.trim()) { setFormError("Enter a name / label."); return; }
    if (!form.category.trim()) { setFormError("Enter a category."); return; }

    setFormLoading(true);
    try {
      const url = editId ? `/api/owner/expenses/${editId}` : "/api/owner/expenses";
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: form.category.trim(), label: form.label.trim(), amountRupees, date: form.date, notes: form.notes.trim() || undefined, employeeId: form.employeeId || null }),
      });
      if (!res.ok) { let msg = "Something went wrong."; try { const d = await res.json(); msg = d.error ?? msg; } catch {} setFormError(msg); return; }
      setShowForm(false);
      setEditId(null);
      await refreshExpenses();
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/owner/expenses/${id}`, { method: "DELETE" });
    setConfirmDeleteId(null);
    await refreshExpenses();
  }

  // ── Category CRUD ─────────────────────────────────────────────────────────────
  async function addCategory() {
    if (!newCatName.trim()) return;
    setCatFormLoading(true);
    setCatFormError("");
    try {
      const res = await fetch("/api/owner/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), icon: newCatIcon }),
      });
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { const d = await res.json(); msg = d.error ?? msg; } catch {}
        setCatFormError(msg);
        return;
      }
      setNewCatName("");
      setNewCatIcon("📌");
      await loadCategories();
    } catch (err) {
      setCatFormError("Network error — please try again.");
    } finally {
      setCatFormLoading(false);
    }
  }

  async function saveEditCat(id: string) {
    if (!editCatName.trim()) return;
    await fetch(`/api/owner/expense-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editCatName.trim(), icon: editCatIcon }),
    });
    setEditCatId(null);
    await loadCategories();
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/owner/expense-categories/${id}`, { method: "DELETE" });
    setConfirmDeleteCatId(null);
    if (expandedCat === id) setExpandedCat(null);
    await loadCategories();
  }

  // ── Item CRUD ─────────────────────────────────────────────────────────────────
  async function addItem(categoryId: string) {
    const f = newItemByCat[categoryId] ?? { name: "", amount: "", notes: "" };
    if (!f.name.trim()) return;
    setItemLoading(true);
    const res = await fetch(`/api/owner/expense-categories/${categoryId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name.trim(),
        defaultAmountPaise: f.amount ? Math.round(parseFloat(f.amount) * 100) : 0,
        notes: f.notes.trim() || undefined,
      }),
    });
    setItemLoading(false);
    if (res.ok) {
      setNewItemByCat((prev) => ({ ...prev, [categoryId]: { name: "", amount: "", notes: "" } }));
      await loadCategories();
    }
  }

  async function saveEditItem(itemId: string, categoryId: string) {
    if (!editItemForm.name.trim()) return;
    setItemLoading(true);
    await fetch(`/api/owner/expense-categories/${categoryId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editItemForm.name.trim(),
        defaultAmountPaise: editItemForm.amount ? Math.round(parseFloat(editItemForm.amount) * 100) : 0,
        notes: editItemForm.notes.trim() || null,
      }),
    });
    setItemLoading(false);
    setEditItemId(null);
    await loadCategories();
  }

  async function deleteItem(itemId: string, categoryId: string) {
    await fetch(`/api/owner/expense-categories/${categoryId}/items/${itemId}`, { method: "DELETE" });
    setConfirmDeleteItemId(null);
    await loadCategories();
  }

  // ── Employee CRUD ─────────────────────────────────────────────────────────────
  async function addEmployee() {
    if (!staffForm.name.trim()) return;
    setStaffLoading(true);
    setStaffError("");
    try {
      const res = await fetch("/api/owner/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: staffForm.name.trim(),
          role: staffForm.role,
          phone: staffForm.phone.trim() || undefined,
          salaryPaise: staffForm.salary ? Math.round(parseFloat(staffForm.salary) * 100) : undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setStaffError(d.error ?? "Error"); return; }
      setStaffForm({ name: "", role: STAFF_ROLES[0], phone: "", salary: "" });
      await loadEmployees();
    } finally {
      setStaffLoading(false);
    }
  }

  async function saveEditEmployee(id: string) {
    const res = await fetch(`/api/owner/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editEmpForm.name.trim(),
        role: editEmpForm.role,
        phone: editEmpForm.phone.trim() || null,
        salaryPaise: editEmpForm.salary ? Math.round(parseFloat(editEmpForm.salary) * 100) : null,
      }),
    });
    if (res.ok) { setEditEmpId(null); await loadEmployees(); }
  }

  async function toggleEmployee(id: string, isActive: boolean) {
    await fetch(`/api/owner/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    await loadEmployees();
  }

  async function deleteEmployee(id: string) {
    const res = await fetch(`/api/owner/employees/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (!res.ok) {
      setEmpActionError((prev) => ({ ...prev, [id]: d.error ?? "Cannot delete" }));
      setConfirmDeleteEmpId(null);
      return;
    }
    setConfirmDeleteEmpId(null);
    await loadEmployees();
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("expenses")}
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors",
            tab === "expenses"
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          <LayoutList className="h-3.5 w-3.5" />
          Expenses
        </button>
        <button
          onClick={() => setTab("categories")}
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors",
            tab === "categories"
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          <Tags className="h-3.5 w-3.5" />
          Categories
          {categories.length > 0 && (
            <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {categories.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("staff")}
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors",
            tab === "staff"
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Staff
          {employees.length > 0 && (
            <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {employees.filter((e) => e.isActive).length}
            </span>
          )}
        </button>
      </div>

      {/* ── EXPENSES TAB ───────────────────────────────────────────────────────── */}
      {tab === "expenses" && (
        <div className="space-y-4">
          {/* Month nav + Add */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <button onClick={() => navMonth(-1)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <ChevronLeft className="h-4 w-4 text-zinc-500" />
              </button>
              <span className="font-semibold text-sm text-zinc-700 dark:text-zinc-300 min-w-[140px] text-center">
                {new Date(year, month - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </span>
              <button onClick={() => navMonth(1)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <ChevronRight className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => openAdd()}
              className="inline-flex items-center gap-1.5 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add expense
            </button>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by name, category, notes…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category filter chips */}
          {monthCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setFilterCategory("ALL"); setPage(1); }}
                className={cn(
                  "text-xs font-medium px-3 py-1 rounded-full border transition-colors",
                  filterCategory === "ALL"
                    ? "border-amber-400 bg-amber-500 text-white"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                )}
              >
                All
              </button>
              {monthCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setFilterCategory((f) => f === cat ? "ALL" : cat); setPage(1); }}
                  className={cn(
                    "text-xs font-medium px-3 py-1 rounded-full border transition-colors",
                    filterCategory === cat
                      ? "border-amber-400 bg-amber-500 text-white"
                      : `border-transparent ${pillColor(cat)} hover:opacity-80`
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {paginated.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-zinc-400 text-sm">
                  {search || filterCategory !== "ALL" ? "No matching expenses." : "No expenses recorded this month."}
                </p>
                {!search && filterCategory === "ALL" && (
                  <button onClick={() => openAdd()} className="mt-3 text-amber-600 text-sm font-medium hover:underline">
                    + Add first expense
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                      <tr>
                        {["Date", "Category", "Name / Label", "Notes", "Amount", ""].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {paginated.map((e) => {
                        const dateStr = new Date(e.date + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                        return (
                          <tr key={e.id} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{dateStr}</td>
                            <td className="px-4 py-3">
                              <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", pillColor(e.category))}>
                                {e.category}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-zinc-800 dark:text-zinc-200">{e.label}</div>
                              {e.employee && (
                                <div className="text-[10px] text-zinc-400 mt-0.5">👤 {e.employee.name} · {e.employee.role}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-400 max-w-[160px] truncate">{e.notes ?? "—"}</td>
                            <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                              ₹{(e.amountPaise / 100).toLocaleString("en-IN")}
                            </td>
                            <td className="px-4 py-3">
                              {confirmDeleteId === e.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-red-600">Delete?</span>
                                  <button onClick={() => handleDelete(e.id)} className="text-xs font-bold text-red-600 hover:underline">Yes</button>
                                  <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-zinc-400">No</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => setConfirmDeleteId(e.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer: total + pagination */}
                <div className="bg-zinc-50 dark:bg-zinc-800/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    {filtered.length} item{filtered.length !== 1 ? "s" : ""} · ₹{(totalPaise / 100).toLocaleString("en-IN")}
                  </span>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs text-zinc-500 min-w-[80px] text-center">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── CATEGORIES TAB ─────────────────────────────────────────────────────── */}
      {tab === "categories" && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">Define categories and items. When adding an expense, pick an item to auto-fill details.</p>

          {/* Add category */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">New Category</p>
            <div className="flex gap-2 items-end">
              <div className="w-12">
                <label className="text-xs text-zinc-400 mb-1 block">Icon</label>
                <input
                  type="text"
                  maxLength={2}
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="w-full text-center text-lg rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-zinc-400 mb-1 block">Category name *</label>
                <input
                  type="text"
                  placeholder="e.g. Staff, Utilities, Maintenance…"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                onClick={addCategory}
                disabled={catFormLoading || !newCatName.trim()}
                className="inline-flex items-center gap-1.5 text-sm font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            {catFormError && <p className="text-xs text-red-500 mt-2">{catFormError}</p>}
          </div>

          {/* Categories list */}
          {catLoading && !categories.length ? (
            <p className="text-sm text-zinc-400 text-center py-8">Loading…</p>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-sm">
              No categories yet. Add one above.
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => {
                const isExpanded = expandedCat === cat.id;
                const isEditing = editCatId === cat.id;
                const newItem = newItemByCat[cat.id] ?? { name: "", amount: "", notes: "" };

                return (
                  <div key={cat.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    {/* Category header */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            maxLength={2}
                            value={editCatIcon}
                            onChange={(e) => setEditCatIcon(e.target.value)}
                            className="w-10 text-center text-lg rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 py-1 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveEditCat(cat.id)}
                            className="flex-1 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                            autoFocus
                          />
                          <button onClick={() => saveEditCat(cat.id)} className="text-xs font-bold text-amber-600 hover:underline">Save</button>
                          <button onClick={() => setEditCatId(null)} className="text-xs text-zinc-400">Cancel</button>
                        </>
                      ) : (
                        <>
                          <span className="text-lg">{cat.icon}</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-100 flex-1">{cat.name}</span>
                          <span className="text-xs text-zinc-400">{cat.items.length} item{cat.items.length !== 1 ? "s" : ""}</span>
                          <button
                            onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name); setEditCatIcon(cat.icon); }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {confirmDeleteCatId === cat.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600">Delete all?</span>
                              <button onClick={() => deleteCategory(cat.id)} className="text-xs font-bold text-red-600 hover:underline">Yes</button>
                              <button onClick={() => setConfirmDeleteCatId(null)} className="text-xs text-zinc-400">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDeleteCatId(cat.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Items */}
                    {isExpanded && (
                      <div className="border-t border-zinc-100 dark:border-zinc-800">
                        {cat.items.length > 0 && (
                          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {cat.items.map((item) => {
                              const isEditingItem = editItemId === item.id;
                              return (
                                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 bg-zinc-50/50 dark:bg-zinc-800/30">
                                  {isEditingItem ? (
                                    <>
                                      <input
                                        type="text"
                                        value={editItemForm.name}
                                        onChange={(e) => setEditItemForm((f) => ({ ...f, name: e.target.value }))}
                                        className="flex-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 text-sm focus:outline-none"
                                        autoFocus
                                      />
                                      <input
                                        type="number"
                                        placeholder="₹ amount"
                                        value={editItemForm.amount}
                                        onChange={(e) => setEditItemForm((f) => ({ ...f, amount: e.target.value }))}
                                        className="w-28 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm focus:outline-none"
                                      />
                                      <button onClick={() => saveEditItem(item.id, cat.id)} disabled={itemLoading} className="text-xs font-bold text-amber-600 hover:underline">Save</button>
                                      <button onClick={() => setEditItemId(null)} className="text-xs text-zinc-400">Cancel</button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200">{item.name}</span>
                                      {item.defaultAmountPaise > 0 && (
                                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                          ₹{(item.defaultAmountPaise / 100).toLocaleString("en-IN")}
                                        </span>
                                      )}
                                      {item.notes && (
                                        <span className="text-xs text-zinc-400 max-w-[100px] truncate">{item.notes}</span>
                                      )}
                                      <button
                                        onClick={() => {
                                          setEditItemId(item.id);
                                          setEditItemForm({ name: item.name, amount: item.defaultAmountPaise > 0 ? String(item.defaultAmountPaise / 100) : "", notes: item.notes ?? "" });
                                        }}
                                        className="p-1 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                      {confirmDeleteItemId === item.id ? (
                                        <div className="flex items-center gap-1.5">
                                          <button onClick={() => deleteItem(item.id, cat.id)} className="text-xs font-bold text-red-600 hover:underline">Del</button>
                                          <button onClick={() => setConfirmDeleteItemId(null)} className="text-xs text-zinc-400">No</button>
                                        </div>
                                      ) : (
                                        <button onClick={() => setConfirmDeleteItemId(item.id)} className="p-1 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add item form */}
                        <div className="px-4 py-3 flex items-center gap-2 bg-zinc-50/30 dark:bg-zinc-800/10">
                          <input
                            type="text"
                            placeholder="Item name (e.g. Rajan, KSEB)"
                            value={newItem.name}
                            onChange={(e) => setNewItemByCat((prev) => ({ ...prev, [cat.id]: { ...newItem, name: e.target.value } }))}
                            onKeyDown={(e) => e.key === "Enter" && addItem(cat.id)}
                            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <input
                            type="number"
                            placeholder="₹ default"
                            value={newItem.amount}
                            onChange={(e) => setNewItemByCat((prev) => ({ ...prev, [cat.id]: { ...newItem, amount: e.target.value } }))}
                            className="w-28 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <button
                            onClick={() => addItem(cat.id)}
                            disabled={itemLoading || !newItem.name.trim()}
                            className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── STAFF TAB ──────────────────────────────────────────────────────────── */}
      {tab === "staff" && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">Manage your staff roster. Pick an employee when adding an expense to auto-fill their details.</p>

          {/* Add employee form */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Add staff member</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Name *</label>
                <input type="text" placeholder="e.g. Rajan Kumar"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Role *</label>
                <select value={staffForm.role} onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Phone</label>
                <input type="tel" placeholder="+91 98765 43210"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Monthly salary (₹)</label>
                <input type="number" placeholder="0" min={0}
                  value={staffForm.salary}
                  onChange={(e) => setStaffForm((f) => ({ ...f, salary: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            {staffError && <p className="text-xs text-red-500">{staffError}</p>}
            <button onClick={addEmployee} disabled={staffLoading || !staffForm.name.trim()}
              className="inline-flex items-center gap-1.5 text-sm font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl transition-colors">
              <Plus className="h-4 w-4" />
              {staffLoading ? "Adding…" : "Add staff"}
            </button>
          </div>

          {/* Employee list */}
          {employees.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-sm">No staff added yet.</div>
          ) : (
            <div className="space-y-2">
              {employees.map((emp) => {
                const isEditing = editEmpId === emp.id;
                const actionErr = empActionError[emp.id];
                return (
                  <div key={emp.id} className={cn(
                    "bg-white dark:bg-zinc-900 rounded-2xl border overflow-hidden",
                    emp.isActive ? "border-zinc-200 dark:border-zinc-800" : "border-zinc-100 dark:border-zinc-800 opacity-60"
                  )}>
                    {isEditing ? (
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Name</label>
                            <input type="text" value={editEmpForm.name}
                              onChange={(e) => setEditEmpForm((f) => ({ ...f, name: e.target.value }))}
                              className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 text-sm focus:outline-none"
                              autoFocus />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Role</label>
                            <select value={editEmpForm.role} onChange={(e) => setEditEmpForm((f) => ({ ...f, role: e.target.value }))}
                              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none">
                              {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Phone</label>
                            <input type="tel" value={editEmpForm.phone}
                              onChange={(e) => setEditEmpForm((f) => ({ ...f, phone: e.target.value }))}
                              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Salary (₹/month)</label>
                            <input type="number" min={0} value={editEmpForm.salary}
                              onChange={(e) => setEditEmpForm((f) => ({ ...f, salary: e.target.value }))}
                              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEditEmployee(emp.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">Save</button>
                          <button onClick={() => setEditEmpId(null)}
                            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0 text-sm">
                          👤
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">{emp.name}</span>
                            {!emp.isActive && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">Inactive</span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5 flex flex-wrap gap-x-3">
                            <span>{emp.role}</span>
                            {emp.phone && <span>📞 {emp.phone}</span>}
                            {emp.salaryPaise && <span className="text-amber-600 dark:text-amber-400 font-medium">₹{(emp.salaryPaise / 100).toLocaleString("en-IN")}/mo</span>}
                          </div>
                          {actionErr && <p className="text-[10px] text-red-500 mt-0.5">{actionErr}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => { setEditEmpId(emp.id); setEditEmpForm({ name: emp.name, role: emp.role, phone: emp.phone ?? "", salary: emp.salaryPaise ? String(emp.salaryPaise / 100) : "" }); setEmpActionError((p) => ({ ...p, [emp.id]: "" })); }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => toggleEmployee(emp.id, !emp.isActive)}
                            className={cn("p-1.5 rounded-lg text-xs font-semibold transition-colors",
                              emp.isActive
                                ? "text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20")}
                            title={emp.isActive ? "Disable" : "Enable"}>
                            {emp.isActive ? "✕" : "✓"}
                          </button>
                          {confirmDeleteEmpId === emp.id ? (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => deleteEmployee(emp.id)} className="text-xs font-bold text-red-600 hover:underline">Del</button>
                              <button onClick={() => setConfirmDeleteEmpId(null)} className="text-xs text-zinc-400">No</button>
                            </div>
                          ) : (
                            <button onClick={() => { setConfirmDeleteEmpId(emp.id); setEmpActionError((p) => ({ ...p, [emp.id]: "" })); }}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ADD / EDIT EXPENSE MODAL ────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                {editId ? "Edit expense" : "Add expense"}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick pick from items */}
            {!editId && categories.some((c) => c.items.length > 0) && (
              <div className="px-5 pt-4 pb-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-500" />
                  Quick pick
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {categories.filter((c) => c.items.length > 0).map((cat) => (
                    <div key={cat.id}>
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1 pl-1">
                        {cat.icon} {cat.name}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setCustomCat(false);
                              setForm((f) => ({
                                ...f,
                                category: cat.name,
                                label: item.name,
                                amount: item.defaultAmountPaise > 0 ? String(item.defaultAmountPaise / 100) : f.amount,
                              }));
                            }}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-full border transition-colors",
                              form.label === item.name && form.category === cat.name
                                ? "border-amber-400 bg-amber-500 text-white"
                                : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                            )}
                          >
                            {item.name}
                            {item.defaultAmountPaise > 0 && (
                              <span className="ml-1 opacity-70">₹{(item.defaultAmountPaise / 100).toLocaleString("en-IN")}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-zinc-100 dark:border-zinc-800 mt-3" />
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Category — select from list or type custom */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Category *</label>
                {!customCat ? (
                  <select
                    value={form.category}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setCustomCat(true);
                        setForm((f) => ({ ...f, category: "" }));
                      } else {
                        setForm((f) => ({ ...f, category: e.target.value }));
                      }
                    }}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="">Select category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                    ))}
                    <option value="__custom__">✏️ Custom category…</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Type custom category name"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="flex-1 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => { setCustomCat(false); setForm((f) => ({ ...f, category: "" })); }}
                      className="px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      ← List
                    </button>
                  </div>
                )}
              </div>

              {/* Employee picker */}
              {employees.filter((e) => e.isActive).length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Employee (optional)</label>
                  <select
                    value={form.employeeId}
                    onChange={(ev) => {
                      const emp = employees.find((e) => e.id === ev.target.value);
                      setForm((f) => ({
                        ...f,
                        employeeId: ev.target.value,
                        label: emp ? emp.name : "",
                        amount: emp?.salaryPaise ? String(emp.salaryPaise / 100) : "",
                      }));
                    }}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">— No employee —</option>
                    {employees.filter((e) => e.isActive).map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} · {e.role}{e.salaryPaise ? ` (₹${(e.salaryPaise / 100).toLocaleString("en-IN")})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Label */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Name / Label *</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajan (Security), KSEB Bill"
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Amount (₹) *</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    min={1}
                    step="0.01"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                {/* Notes */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Notes</label>
                  <input
                    type="text"
                    placeholder="Optional note"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {formError && <p className="text-sm text-red-500">{formError}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {formLoading ? "Saving…" : editId ? "Save changes" : "Add expense"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
