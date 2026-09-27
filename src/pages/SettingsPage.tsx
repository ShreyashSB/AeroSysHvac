import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Database, RotateCcw, Shield } from "lucide-react";
import { useAuth, useCurrentUser } from "@/auth/AuthContext";
import { can, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/auth/permissions";
import { useSettings } from "@/hooks/queries";
import { useResetDemoData, useUpdateSettings } from "@/hooks/mutations";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import type { Role } from "@/types/models";

export function SettingsPage() {
  const { user, employee } = useCurrentUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();
  const reset = useResetDemoData();
  const [confirmReset, setConfirmReset] = useState(false);
  const [form, setForm] = useState({ companyName: "", instrumentMonthlyRatePct: "3", deadlineAlertDays: "14" });
  const editable = can(user.role, "settings.manage");

  useEffect(() => {
    if (settings)
      setForm({
        companyName: settings.companyName,
        instrumentMonthlyRatePct: String(settings.instrumentMonthlyRatePct),
        deadlineAlertDays: String(settings.deadlineAlertDays),
      });
  }, [settings]);

  const rate = Number(form.instrumentMonthlyRatePct);
  const days = Number(form.deadlineAlertDays);
  const invalid = !form.companyName.trim() || !(rate >= 0 && rate <= 20) || !(days >= 1 && days <= 90);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Settings" breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Settings" }]} />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Signed in as {employee.name}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">Designation</p><p className="font-medium">{employee.designation}</p></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{user.email}</p></div>
            <div><p className="text-xs text-muted-foreground">Role</p><p className="font-medium">{ROLE_LABELS[user.role]}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Costing & alerts</CardTitle>
              <CardDescription>{editable ? "Parameters used by cost calculations and notifications." : "Only management can change these settings."}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24" />
            ) : (
              <form
                className="grid gap-4 sm:grid-cols-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (invalid) return;
                  update.mutate(
                    { companyName: form.companyName.trim(), instrumentMonthlyRatePct: rate, deadlineAlertDays: days },
                    { onSuccess: () => toast.success("Settings saved", { description: "Project costs recalculated." }) },
                  );
                }}
              >
                <Field label="Company name" htmlFor="s-name" error={!form.companyName.trim() ? "Required" : undefined}>
                  <Input id="s-name" value={form.companyName} disabled={!editable} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                </Field>
                <Field label="Instrument usage rate (% / month)" htmlFor="s-rate" hint="Charged to projects on purchase value" error={!(rate >= 0 && rate <= 20) ? "0–20%" : undefined}>
                  <Input id="s-rate" type="number" step={0.5} min={0} max={20} value={form.instrumentMonthlyRatePct} disabled={!editable} onChange={(e) => setForm({ ...form, instrumentMonthlyRatePct: e.target.value })} />
                </Field>
                <Field label="Deadline alert (days before)" htmlFor="s-days" error={!(days >= 1 && days <= 90) ? "1–90 days" : undefined}>
                  <Input id="s-days" type="number" min={1} max={90} value={form.deadlineAlertDays} disabled={!editable} onChange={(e) => setForm({ ...form, deadlineAlertDays: e.target.value })} />
                </Field>
                {editable && (
                  <div className="sm:col-span-3">
                    <Button type="submit" loading={update.isPending} disabled={invalid}>Save settings</Button>
                  </div>
                )}
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><Shield className="size-4" /> Roles & access</CardTitle>
              <CardDescription>What each role can see and do in this prototype</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <div key={r} className="rounded-md border p-3">
                <p className="text-sm font-medium">{ROLE_LABELS[r]}{r === user.role && <span className="ml-2 text-xs text-primary">(you)</span>}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><Database className="size-4" /> Demo data</CardTitle>
              <CardDescription>All data is stored locally in this browser (localStorage) and survives refreshes. Reset to restore the original sample dataset.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="text-danger" onClick={() => setConfirmReset(true)}>
              <RotateCcw /> Reset demo data
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset all demo data?"
        description="All projects, expenses, assignments, instruments and notifications you created will be replaced by the original sample data."
        confirmLabel="Reset data"
        destructive
        loading={reset.isPending}
        onConfirm={() =>
          reset.mutate(undefined, {
            onSuccess: () => {
              toast.success("Demo data restored");
              setConfirmReset(false);
              logout();
              navigate("/login");
            },
          })
        }
      />
    </div>
  );
}
