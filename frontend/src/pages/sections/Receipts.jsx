import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  BadgeIndianRupee,
  CalendarDays,
  CreditCard,
  Download,
  ExternalLink,
  Filter,
  Hash,
  Loader2,
  Mail,
  Phone,
  ReceiptText,
  RefreshCw,
  Search,
  User,
  WalletCards,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import api, { API, formatError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const LIMIT = 12;
const PAYMENT_STATUSES = ["Paid", "Pending"];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Other"];
const initialFilters = {
  search: "",
  from_date: "",
  to_date: "",
  status: "all",
  payment_method: "all",
  min_amount: "",
  max_amount: "",
};

function numericAmount(value) {
  const n = Number(String(value || "0").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numericAmount(value));
}

function formatDate(value) {
  if (!value) return "No date";
  const normalized = String(value).length === 10 ? `${value}T00:00:00` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (["paid", "success", "successful", "completed", "complete", "collected"].includes(value)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";
  }
  if (value === "pending") return "border-amber-500/30 bg-amber-500/10 text-amber-500";
  return "border-border bg-muted text-muted-foreground";
}

function hasActiveFilters(filters) {
  return Object.entries(filters).some(([key, value]) => {
    if (key === "status" || key === "payment_method") return value !== "all";
    return Boolean(String(value || "").trim());
  });
}

function dateValue(value) {
  if (!value) return null;
  const normalized = String(value).length === 10 ? `${value}T00:00:00` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function receiptDateValue(receipt) {
  return dateValue(receipt.payment_date) || dateValue(receipt.created_at) || new Date(0);
}

function fallbackReceiptItem(lead, receipt) {
  const values = lead?.field_values || {};
  const customer = receipt?.customer && typeof receipt.customer === "object" ? receipt.customer : {};
  return {
    id: receipt.id || "",
    receipt_number: receipt.receipt_number || "",
    amount: receipt.amount || "",
    due_amount: receipt.due_amount || "",
    payment_date: receipt.payment_date || receipt.created_at || "",
    payment_method: receipt.payment_method || "",
    status: receipt.status || "",
    payment_stage: receipt.payment_stage || "",
    transaction_id: receipt.transaction_id || "",
    description: receipt.description || "",
    created_at: receipt.created_at || "",
    lead_id: lead.id || "",
    lead_name: values.full_name || lead.full_name || customer.name || "Customer",
    phone: values.phone || lead.phone || customer.phone || "",
    email: values.email || lead.email || customer.email || "",
  };
}

function receiptMatchesFilters(receipt, filters) {
  const term = filters.search.trim().toLowerCase();
  if (term) {
    const searchable = [
      receipt.receipt_number,
      receipt.transaction_id,
      receipt.description,
      receipt.payment_stage,
      receipt.payment_method,
      receipt.status,
      receipt.lead_name,
      receipt.phone,
      receipt.email,
      receipt.amount,
    ];
    if (!searchable.some((value) => String(value || "").toLowerCase().includes(term))) return false;
  }

  const receiptDate = receiptDateValue(receipt);
  const from = dateValue(filters.from_date);
  const to = dateValue(filters.to_date);
  if (from && receiptDate < from) return false;
  if (to) {
    const endOfDay = new Date(to);
    endOfDay.setHours(23, 59, 59, 999);
    if (receiptDate > endOfDay) return false;
  }

  if (filters.status !== "all" && String(receipt.status || "").toLowerCase() !== filters.status.toLowerCase()) return false;
  if (filters.payment_method !== "all" && String(receipt.payment_method || "").toLowerCase() !== filters.payment_method.toLowerCase()) return false;
  if (filters.min_amount && numericAmount(receipt.amount) < numericAmount(filters.min_amount)) return false;
  if (filters.max_amount && numericAmount(receipt.amount) > numericAmount(filters.max_amount)) return false;
  return true;
}

function fallbackReceiptsPage(leads, filters, page, limit) {
  const items = (leads || [])
    .flatMap((lead) => (lead.receipts || []).map((receipt) => fallbackReceiptItem(lead, receipt)))
    .filter((receipt) => receiptMatchesFilters(receipt, filters))
    .sort((a, b) => receiptDateValue(b).getTime() - receiptDateValue(a).getTime());
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * limit;
  return { items: items.slice(start, start + limit), total: items.length, page: safePage, limit };
}

function FieldLabel({ children }) {
  return <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{children}</label>;
}

function SelectField({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
    >
      {children}
    </select>
  );
}

function MetaLine({ icon: Icon, children }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  );
}

function ReceiptCard({ receipt, wsId }) {
  const openUrl = `${API}/workspaces/${wsId}/crm/leads/${receipt.lead_id}/receipts/${receipt.id}/html`;
  const pdfUrl = `${API}/workspaces/${wsId}/crm/leads/${receipt.lead_id}/receipts/${receipt.id}/pdf`;

  return (
    <article className="group flex min-h-[300px] flex-col rounded-md border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
            <ReceiptText className="h-4 w-4 shrink-0" />
            <span className="truncate">{receipt.receipt_number || "Receipt"}</span>
          </div>
          <div className="mt-3 font-display text-3xl font-black leading-none">{money(receipt.amount)}</div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(receipt.status)}`}>
          {receipt.status || "Unknown"}
        </span>
      </div>

      <div className="mt-5 space-y-2.5">
        <MetaLine icon={User}>{receipt.lead_name || "Customer"}</MetaLine>
        <MetaLine icon={CalendarDays}>{formatDate(receipt.payment_date)}</MetaLine>
        <MetaLine icon={CreditCard}>{receipt.payment_method || "No method"}</MetaLine>
        <MetaLine icon={WalletCards}>{receipt.payment_stage || "No stage"}</MetaLine>
        <MetaLine icon={Hash}>{receipt.transaction_id || "No transaction ID"}</MetaLine>
      </div>

      {(receipt.email || receipt.phone) && (
        <div className="mt-4 grid gap-2 border-t border-border pt-4">
          {receipt.email && <MetaLine icon={Mail}>{receipt.email}</MetaLine>}
          {receipt.phone && <MetaLine icon={Phone}>{receipt.phone}</MetaLine>}
        </div>
      )}

      {receipt.description && (
        <p className="mt-4 line-clamp-2 border-t border-border pt-4 text-sm text-muted-foreground">{receipt.description}</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        <div className="min-w-0 text-xs text-muted-foreground">
          Due <span className="font-semibold text-foreground">{money(receipt.due_amount)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" size="sm" className="px-2.5" title="Open receipt">
            <a href={openUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Open</span>
            </a>
          </Button>
          <Button asChild size="sm" className="px-2.5" title="Download PDF">
            <a href={pdfUrl}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}

function ReceiptSkeleton() {
  return (
    <div className="min-h-[300px] rounded-md border border-border bg-card p-5">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="mt-4 h-9 w-40 rounded bg-muted" />
      <div className="mt-8 space-y-3">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-4 w-4/5 rounded bg-muted" />
      </div>
      <div className="mt-8 h-px bg-border" />
      <div className="mt-4 flex justify-end gap-2">
        <div className="h-8 w-20 rounded bg-muted" />
        <div className="h-8 w-20 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function Receipts() {
  const { wsId } = useParams();
  const [filters, setFilters] = useState(initialFilters);
  const [receipts, setReceipts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: LIMIT });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / (pagination.limit || LIMIT)));
  const activeFilters = hasActiveFilters(filters);
  const pageAmount = useMemo(() => receipts.reduce((sum, receipt) => sum + numericAmount(receipt.amount), 0), [receipts]);
  const pageStart = pagination.total ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const pageEnd = Math.min(pagination.total, pagination.page * pagination.limit);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setPage(1);
  };

  const loadReceipts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      Object.entries(filters).forEach(([key, value]) => {
        const text = String(value || "").trim();
        if (text && text !== "all") params.set(key, text);
      });
      const r = await api.get(`/workspaces/${wsId}/crm/receipts?${params.toString()}`);
      setReceipts(r.data.items || []);
      setPagination({
        total: r.data.total || 0,
        page: r.data.page || page,
        limit: r.data.limit || LIMIT,
      });
    } catch (e) {
      if (e.response?.status === 404) {
        try {
          const fallback = await api.get(`/workspaces/${wsId}/crm/leads?limit=1000`);
          const leads = Array.isArray(fallback.data) ? fallback.data : fallback.data.items || [];
          const pageData = fallbackReceiptsPage(leads, filters, page, LIMIT);
          setReceipts(pageData.items);
          setPagination(pageData);
          setError("");
          return;
        } catch (fallbackError) {
          const fallbackMessage = formatError(fallbackError.response?.data?.detail);
          setError(fallbackMessage);
          toast.error(fallbackMessage);
          return;
        }
      }
      const message = formatError(e.response?.data?.detail);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, wsId]);

  useEffect(() => {
    const t = setTimeout(loadReceipts, 250);
    return () => clearTimeout(t);
  }, [loadReceipts]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            <ReceiptText className="h-3.5 w-3.5" />
            CRM Receipts
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight">Receipts</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Every CRM payment receipt, newest first.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 font-medium">
            <ReceiptText className="h-4 w-4 text-primary" />
            {pagination.total} total
          </span>
          <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 font-medium">
            <BadgeIndianRupee className="h-4 w-4 text-primary" />
            {money(pageAmount)} shown
          </span>
        </div>
      </div>

      <section className="rounded-md border border-border bg-card p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-display font-bold">
            <Filter className="h-4 w-4 text-primary" />
            Filters
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadReceipts} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={resetFilters} disabled={!activeFilters}>
              <XCircle className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-8">
          <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="h-10 pl-9"
                placeholder="Receipt, customer, phone, transaction"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>From</FieldLabel>
            <Input type="date" value={filters.from_date} onChange={(e) => updateFilter("from_date", e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>To</FieldLabel>
            <Input type="date" value={filters.to_date} onChange={(e) => updateFilter("to_date", e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Status</FieldLabel>
            <SelectField value={filters.status} onChange={(value) => updateFilter("status", value)}>
              <option value="all">All status</option>
              {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </SelectField>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Method</FieldLabel>
            <SelectField value={filters.payment_method} onChange={(value) => updateFilter("payment_method", value)}>
              <option value="all">All methods</option>
              {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
            </SelectField>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Min Amount</FieldLabel>
            <Input type="number" min="0" value={filters.min_amount} onChange={(e) => updateFilter("min_amount", e.target.value)} className="h-10" placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Max Amount</FieldLabel>
            <Input type="number" min="0" value={filters.max_amount} onChange={(e) => updateFilter("max_amount", e.target.value)} className="h-10" placeholder="Any" />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <ReceiptSkeleton key={index} />)}
        </div>
      ) : receipts.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-10 text-center">
          <ReceiptText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="font-display text-xl font-bold">{activeFilters ? "No matching receipts" : "No receipts yet"}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {activeFilters ? "Try a wider date range or clear one of the filters." : "Receipts generated from CRM customer payments will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {receipts.map((receipt) => (
            <ReceiptCard key={`${receipt.lead_id}-${receipt.id}`} receipt={receipt} wsId={wsId} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          Showing <span className="font-semibold text-foreground">{pageStart}</span>-<span className="font-semibold text-foreground">{pageEnd}</span> of{" "}
          <span className="font-semibold text-foreground">{pagination.total}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={loading || page <= 1}>
            Previous
          </Button>
          <span className="min-w-24 text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Page {pagination.page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={loading || page >= totalPages}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
