import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Loader2, LogOut, Search, Trash2, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useSession";
import { DOC_CATEGORIES, categoryLabel, formatSize } from "@/lib/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/records")({
  head: () => ({
    meta: [
      { title: "Patient records · MediVault" },
      {
        name: "description",
        content:
          "Upload and browse patient documents. Staff manage every chart; patients see their own records only.",
      },
      { property: "og:title", content: "Patient records · MediVault" },
      {
        property: "og:description",
        content: "Upload and browse hospital patient documents securely.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Records,
});

type DocRow = {
  id: string;
  patient_id: string;
  title: string;
  category: string;
  notes: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  created_at: string;
};

function Records() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useMyRole();
  const isStaff = !!me?.isStaff;

  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("lab_report");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const patientsQuery = useQuery({
    queryKey: ["patients"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, mrn")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const docsQuery = useQuery({
    queryKey: ["documents", isStaff, selectedPatient],
    enabled: !isLoading && !!me,
    queryFn: async () => {
      let q = supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (isStaff && selectedPatient) q = q.eq("patient_id", selectedPatient);
      const { data, error } = await q;
      if (error) throw error;
      return data as DocRow[];
    },
  });

  const patientName = useMemo(() => {
    const map = new Map<string, string>();
    (patientsQuery.data ?? []).forEach((p) =>
      map.set(p.id, p.full_name || p.email || "Unnamed patient"),
    );
    return map;
  }, [patientsQuery.data]);

  const docs = (docsQuery.data ?? []).filter((d) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      d.title.toLowerCase().includes(q) ||
      d.file_name.toLowerCase().includes(q) ||
      categoryLabel(d.category).toLowerCase().includes(q) ||
      (patientName.get(d.patient_id) ?? "").toLowerCase().includes(q)
    );
  });

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error("Choose a patient first");
      return;
    }
    if (!file) {
      toast.error("Choose a file to upload");
      return;
    }
    if (title.trim().length < 2) {
      toast.error("Give the document a title");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Files must be 50 MB or smaller");
      return;
    }

    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120);
    const path = `${selectedPatient}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("patient-documents")
      .upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (uploadError) {
      setUploading(false);
      toast.error(uploadError.message);
      return;
    }
    const { error } = await supabase.from("documents").insert({
      patient_id: selectedPatient,
      uploaded_by: me?.user.id ?? null,
      title: title.trim().slice(0, 200),
      category: category as never,
      notes: notes.trim().slice(0, 1000) || null,
      file_path: path,
      file_name: file.name.slice(0, 200),
      file_size: file.size,
      mime_type: file.type || null,
    });
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Document uploaded");
    setTitle("");
    setNotes("");
    setFile(null);
    const fileInput = document.getElementById("doc-file") as HTMLInputElement | null;
    if (fileInput) fileInput.value = "";
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  }

  async function handleOpen(doc: DocRow) {
    const { data, error } = await supabase.storage
      .from("patient-documents")
      .createSignedUrl(doc.file_path, 60);
    if (error || !data) {
      toast.error("Could not open this file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function handleDelete(doc: DocRow) {
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.storage.from("patient-documents").remove([doc.file_path]);
    toast.success("Document removed");
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <FileText className="size-5 text-primary" />
            MediVault
            <Badge variant="secondary" className="ml-2 font-sans">
              {isStaff ? "Staff" : "Patient"}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{me?.profile?.full_name || me?.user.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <div>
          <h1 className="text-2xl font-semibold">
            {isStaff ? "Patient document workspace" : "My medical documents"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isStaff
              ? "Select a patient to file new paperwork, or search across every record."
              : "Everything your care team has filed for you. Files open in a secure, expiring link."}
          </p>
        </div>

        {isStaff && (
          <section className="clinical-panel p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <UploadCloud className="size-5 text-primary" /> Upload a document
            </h2>
            <form onSubmit={handleUpload} className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {(patientsQuery.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name || p.email || "Unnamed"}
                        {p.mrn ? ` · ${p.mrn}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-title">Title</Label>
                <Input
                  id="doc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Chest X-ray report"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-file">File</Label>
                <Input
                  id="doc-file"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="doc-notes">Notes (optional)</Label>
                <Textarea
                  id="doc-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={uploading}>
                  {uploading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Upload document
                </Button>
              </div>
            </form>
          </section>
        )}

        <section className="clinical-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {isStaff && selectedPatient
                ? `Documents for ${patientName.get(selectedPatient) ?? "patient"}`
                : "Documents"}
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, type or patient"
                className="pl-9"
              />
            </div>
          </div>

          {docsQuery.isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading records…</div>
          ) : docs.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No documents yet.
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-border">
              {docs.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{doc.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {categoryLabel(doc.category)} · {formatSize(doc.file_size)} ·{" "}
                      {new Date(doc.created_at).toLocaleDateString()}
                      {isStaff && (
                        <> · {patientName.get(doc.patient_id) ?? "Unknown patient"}</>
                      )}
                    </p>
                    {doc.notes && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{doc.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpen(doc)}>
                      <Download className="mr-2 size-4" /> Open
                    </Button>
                    {isStaff && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
