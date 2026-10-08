import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { credentialStatus } from "@/lib/iot.functions";
import { useProject } from "@/lib/project";

export function Section({ title, description, children, footer }: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="card-surface">
      <div className="border-b px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">{children}</div>
      {footer && <div className="flex flex-wrap items-center gap-2 border-t bg-secondary/50 px-5 py-3">{footer}</div>}
    </section>
  );
}

export function Field({ label, children, full, hint }: { label: string; children: ReactNode; full?: boolean; hint?: string }) {
  return (
    <div className={full ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

let cache: { id: string; v: Record<string, boolean> } | null = null;
export function useCredentialStatus() {
  const { project } = useProject();
  const [status, setStatus] = useState<Record<string, boolean>>(cache?.id === project?.id ? cache!.v : {});
  const refresh = async () => {
    if (!project) return;
    const v = ((await credentialStatus({ data: { projectId: project.id } }).catch(() => ({}))) ?? {}) as Record<string, boolean>;
    cache = { id: project.id, v };
    setStatus(v);
  };
  useEffect(() => { refresh(); }, [project?.id]);
  return { status, refresh };
}

export function SecretField({ label, kind, isSet, onSaved }: { label: string; kind: string; isSet?: boolean; onSaved: () => void }) {
  const { project } = useProject();
  const [v, setV] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!project || !v) return;
    setSaving(true);
    const { error } = await supabase
      .from("project_credentials")
      .upsert({ project_id: project.id, kind, value: v.trim(), updated_at: new Date().toISOString() }, { onConflict: "project_id,kind" });
    setSaving(false);
    if (error) return toast.error(error.message);
    setV("");
    toast.success(`${label} saved securely`);
    onSaved();
  }
  return (
    <Field label={label} hint={isSet ? "Stored securely. Enter a new value to replace it." : "Stored on the server — never shown again."}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <KeyRound className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input type="password" className="pl-8" placeholder={isSet ? "••••••••  (saved)" : "Not set"} value={v} onChange={(e) => setV(e.target.value)} autoComplete="off" />
        </div>
        <Button variant="outline" onClick={save} disabled={!v || saving}>{isSet && !v ? <Check /> : "Save"}</Button>
      </div>
    </Field>
  );
}
