import { ApiError, clone, db, simulateLatency } from "@/api/mockDb";
import { todayISO } from "@/lib/dates";
import { uid } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/types/models";
import { pushNotification } from "./notificationService";

export type ProjectInput = Pick<
  Project,
  "name" | "clientName" | "site" | "managerId" | "contractValue" | "estimatedCost" | "startDate" | "endDate" | "description" | "status"
>;

function validate(input: ProjectInput) {
  if (!input.name.trim()) throw new ApiError("Project name is required");
  if (input.contractValue <= 0) throw new ApiError("Contract value must be greater than zero");
  if (input.endDate < input.startDate) throw new ApiError("Expected completion must be after start date");
}

/** Keeps completion and status consistent with each other. */
function reconcile(p: Project) {
  if (p.completion >= 100) {
    p.completion = 100;
    if (p.status === "active" || p.status === "planning" || p.status === "on_hold") p.status = "completed";
  } else if (p.status === "completed") {
    p.status = "active";
  }
  if (p.status === "planning" && p.completion > 0) p.status = "active";
}

export const projectService = {
  // GET /api/projects
  async list(): Promise<Project[]> {
    await simulateLatency();
    return clone(db.read().projects);
  },

  // GET /api/projects/:id
  async get(id: string): Promise<Project> {
    await simulateLatency();
    const p = db.read().projects.find((x) => x.id === id);
    if (!p) throw new ApiError("Project not found", 404);
    return clone(p);
  },

  // POST /api/projects
  async create(input: ProjectInput): Promise<Project> {
    await simulateLatency();
    validate(input);
    return db.write((data) => {
      const seq = Math.max(0, ...data.projects.map((p) => Number(p.code.split("-").pop()) || 0)) + 1;
      const now = new Date().toISOString();
      const project: Project = {
        ...input,
        id: uid("prj"),
        code: `PRJ-${new Date().getFullYear()}-${String(seq).padStart(3, "0")}`,
        completion: input.status === "completed" ? 100 : 0,
        createdAt: now,
        updatedAt: now,
      };
      data.projects.unshift(project);
      pushNotification(data, {
        type: "project_created",
        title: "New project created",
        message: `${project.name} for ${project.clientName} has been created.`,
        link: `/projects/${project.id}`,
        audienceRoles: ["management", "accounts"],
        audienceEmployeeIds: [project.managerId],
      });
      return clone(project);
    });
  },

  // PUT /api/projects/:id
  async update(id: string, input: ProjectInput): Promise<Project> {
    await simulateLatency();
    validate(input);
    return db.write((data) => {
      const p = data.projects.find((x) => x.id === id);
      if (!p) throw new ApiError("Project not found", 404);
      const managerChanged = p.managerId !== input.managerId;
      Object.assign(p, input, { updatedAt: new Date().toISOString() });
      if (input.status === "completed") p.completion = 100;
      reconcile(p);
      if (managerChanged) {
        pushNotification(data, {
          type: "engineer_assigned",
          title: "Project manager assigned",
          message: `You are now the project manager for ${p.name}.`,
          link: `/projects/${p.id}`,
          audienceRoles: [],
          audienceEmployeeIds: [p.managerId],
        });
      }
      return clone(p);
    });
  },

  // PATCH /api/projects/:id/progress
  async updateProgress(id: string, completion: number): Promise<Project> {
    await simulateLatency(100, 250);
    return db.write((data) => {
      const p = data.projects.find((x) => x.id === id);
      if (!p) throw new ApiError("Project not found", 404);
      if (p.status === "archived") throw new ApiError("Archived projects cannot be updated");
      const before = p.completion;
      p.completion = Math.round(Math.min(100, Math.max(0, completion)));
      p.updatedAt = new Date().toISOString();
      reconcile(p);
      if (p.completion === 100 && before < 100) {
        pushNotification(data, {
          type: "project_completion",
          title: "Project completed",
          message: `${p.name} has been marked 100% complete.`,
          link: `/projects/${p.id}`,
          audienceRoles: ["management", "accounts"],
          audienceEmployeeIds: [p.managerId],
        });
        // Completed project: close open engineer assignments
        for (const a of data.assignments) if (a.projectId === p.id && !a.endDate) a.endDate = todayISO();
      } else if (p.completion >= 90 && before < 90) {
        pushNotification(data, {
          type: "project_completion",
          title: "Project nearing completion",
          message: `${p.name} has reached ${p.completion}% completion.`,
          link: `/projects/${p.id}`,
          audienceRoles: ["management", "accounts"],
          audienceEmployeeIds: [p.managerId],
        });
      }
      return clone(p);
    });
  },

  async setStatus(id: string, status: ProjectStatus): Promise<Project> {
    await simulateLatency();
    return db.write((data) => {
      const p = data.projects.find((x) => x.id === id);
      if (!p) throw new ApiError("Project not found", 404);
      p.status = status;
      if (status === "completed") p.completion = 100;
      p.updatedAt = new Date().toISOString();
      return clone(p);
    });
  },

  // DELETE /api/projects/:id – hard delete, cascades related records.
  async remove(id: string): Promise<void> {
    await simulateLatency();
    db.write((data) => {
      data.projects = data.projects.filter((p) => p.id !== id);
      data.assignments = data.assignments.filter((a) => a.projectId !== id);
      data.expenses = data.expenses.filter((e) => e.projectId !== id);
      data.projectCosts = data.projectCosts.filter((c) => c.projectId !== id);
      data.projectInstruments = data.projectInstruments.filter((pi) => pi.projectId !== id);
      for (const ins of data.instruments) {
        if (ins.assignedProjectId === id) {
          ins.assignedProjectId = null;
          ins.assignedEngineerId = null;
          ins.status = "available";
        }
      }
    });
  },
};
