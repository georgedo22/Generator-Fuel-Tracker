"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/layout/page-header";
import { ImageUpload } from "@/components/generators/image-upload";
import { apiSend, type GeneratorDto } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type FormState = {
  code: string;
  location: string;
  imageUrl: string | null;
  notes: string;
};

const EMPTY: FormState = { code: "", location: "", imageUrl: null, notes: "" };

export default function GeneratorsPage() {
  const { data: generatorsData, loading, error, reload } = useApi<GeneratorDto[]>(
    "/api/generators"
  );
  const generators = generatorsData ?? [];
  const [query, setQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GeneratorDto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    reload();
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(g: GeneratorDto) {
    setEditing(g);
    setForm({
      code: g.code,
      location: g.location,
      imageUrl: g.imageUrl,
      notes: g.notes ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await apiSend(`/api/generators/${editing.id}`, "PUT", form);
      } else {
        await apiSend("/api/generators", "POST", form);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(g: GeneratorDto) {
    if (
      !confirm(
        `Delete generator "${g.code}"? All its fuel logs will also be deleted.`
      )
    )
      return;
    try {
      await apiSend(`/api/generators/${g.id}`, "DELETE");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const filtered = generators.filter((g) => {
    const q = query.toLowerCase();
    return (
      g.code.toLowerCase().includes(q) || g.location.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Generators"
        description="Register generators with their number, location and photo."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Generator
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search by number or location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            No generators yet. Click “Add Generator” to create the first one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <Card key={g.id} className="overflow-hidden">
              <div className="h-40 w-full bg-slate-100">
                {g.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.imageUrl}
                    alt={g.code}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    No image
                  </div>
                )}
              </div>
              <CardContent>
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{g.code}</p>
                    <p className="flex items-center gap-1 text-sm text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {g.location}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {g._count?.fuelLogs ?? 0} logs
                  </span>
                </div>
                {g.notes ? (
                  <p className="mb-3 line-clamp-2 text-sm text-slate-500">
                    {g.notes}
                  </p>
                ) : null}
                <div className="flex items-center gap-2">
                  <Link href={`/generators/${g.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      View details
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(g)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(g)}
                    aria-label="Delete"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Generator" : "Add Generator"}
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Generator Number / Code">
            <Input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. GEN-001"
            />
          </Field>
          <Field label="Location">
            <Input
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Main Site - Building A"
            />
          </Field>
          <Field label="Photo">
            <ImageUpload
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
            />
          </Field>
          <Field label="Notes (optional)">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Capacity, model, remarks..."
            />
          </Field>

          {formError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Add generator"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}