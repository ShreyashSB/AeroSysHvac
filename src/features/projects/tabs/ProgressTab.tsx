import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { useUpdateProgress } from "@/hooks/mutations";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/models";

const STEPS = [0, 25, 50, 75, 100];
const MILESTONES: Record<number, string> = {
  0: "Mobilisation",
  25: "Material delivered & first fix",
  50: "Equipment installed",
  75: "Testing, balancing & commissioning",
  100: "Handover complete",
};

export function ProgressTab({ project, canUpdate }: { project: Project; canUpdate: boolean }) {
  const update = useUpdateProgress();
  const [value, setValue] = useState(project.completion);
  useEffect(() => setValue(project.completion), [project.completion]);
  const locked = !canUpdate || project.status === "archived";
  const dirty = value !== project.completion;

  const save = (completion: number) =>
    update.mutate(
      { id: project.id, completion },
      {
        onSuccess: (p) =>
          toast.success(`Progress updated to ${p.completion}%`, {
            description: p.status === "completed" ? "Project marked as completed. Dashboard updated." : "Dashboard and reports updated.",
          }),
      },
    );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div>
            <CardTitle>Project completion</CardTitle>
            <CardDescription>
              {locked ? "You have view-only access to progress for this project." : "Select a milestone or fine-tune with the slider. Changes update the dashboard immediately."}
            </CardDescription>
          </div>
          {locked && <Lock className="size-4 text-muted-foreground" />}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-end gap-3">
            <span className="text-4xl font-semibold tabular">{value}%</span>
            {dirty && <span className="pb-1.5 text-sm text-muted-foreground">(saved: {project.completion}%)</span>}
          </div>
          <Progress value={value} className="h-3" tone={value === 100 ? "success" : "primary"} />

          <div className="grid grid-cols-5 gap-2">
            {STEPS.map((s) => (
              <button
                key={s}
                disabled={locked || update.isPending}
                onClick={() => {
                  setValue(s);
                  save(s);
                }}
                className={cn(
                  "rounded-md border px-2 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer",
                  project.completion === s ? "border-primary bg-primary text-white" : "hover:border-primary hover:bg-primary-soft",
                )}
              >
                {s}%
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="progress-slider" className="mb-2 block text-sm font-medium">Fine-tune</label>
            <input
              id="progress-slider"
              type="range"
              min={0}
              max={100}
              step={5}
              value={value}
              disabled={locked}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full accent-primary disabled:opacity-50"
            />
            <div className="mt-3 flex gap-2">
              <Button disabled={!dirty || locked} loading={update.isPending} onClick={() => save(value)}>
                Save progress
              </Button>
              <Button variant="outline" disabled={!dirty} onClick={() => setValue(project.completion)}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {STEPS.map((s) => {
              const done = project.completion >= s && !(s === 0 && project.completion === 0 && project.status === "planning");
              return (
                <li key={s} className="flex gap-3">
                  {done ? <CheckCircle2 className="size-5 shrink-0 text-success" /> : <Circle className="size-5 shrink-0 text-muted-foreground/50" />}
                  <div>
                    <p className={cn("text-sm font-medium", !done && "text-muted-foreground")}>{MILESTONES[s]}</p>
                    <p className="text-xs text-muted-foreground">{s}%</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
