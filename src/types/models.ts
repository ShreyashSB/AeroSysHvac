/**
 * Core domain model. These types mirror what a future REST API would return.
 * Relationships are expressed via ids only (no embedded copies) so there is a
 * single source of truth for every entity.
 */

export type ID = string;
export type ISODate = string; // yyyy-mm-dd
export type ISODateTime = string;

export type Role = "management" | "project_manager" | "site_engineer" | "accounts";

export interface User {
  id: ID;
  employeeId: ID;
  role: Role;
  email: string;
}

export type Department = "Management" | "Projects" | "Engineering" | "Accounts" | "Admin" | "Service";
export type EmployeeStatus = "active" | "on_leave" | "inactive";

export interface Employee {
  id: ID;
  code: string; // EMP-001
  name: string;
  email: string;
  phone: string;
  department: Department;
  designation: string;
  monthlySalary: number; // CTC per month, INR – used for labour costing only
  joiningDate: ISODate;
  status: EmployeeStatus;
  isSiteEngineer: boolean;
  baseLocation: string;
}

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "archived";

export interface Project {
  id: ID;
  code: string; // PRJ-2026-001
  name: string;
  clientName: string;
  site: string;
  managerId: ID;
  contractValue: number;
  estimatedCost: number; // budget
  startDate: ISODate;
  endDate: ISODate; // expected completion
  description: string;
  status: ProjectStatus;
  completion: number; // 0-100
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ProjectAssignment {
  id: ID;
  projectId: ID;
  employeeId: ID;
  role: "Lead Engineer" | "Site Engineer" | "Technician" | "Supervisor";
  allocation: number; // % of time on the project (drives labour cost)
  startDate: ISODate;
  endDate: ISODate | null; // null = still active
}

export type ExpenseCategory =
  | "Travel"
  | "Accommodation"
  | "Food"
  | "Local Conveyance"
  | "Site Material"
  | "Tools & Consumables"
  | "Other";

export type ExpenseStatus = "pending" | "approved" | "rejected";

export interface Receipt {
  fileName: string;
  size: number;
  mimeType: string;
  dataUrl?: string; // small images kept locally to simulate upload
}

export interface Expense {
  id: ID;
  code: string;
  employeeId: ID;
  projectId: ID;
  category: ExpenseCategory;
  amount: number;
  date: ISODate;
  description: string;
  receipt: Receipt | null;
  status: ExpenseStatus;
  submittedAt: ISODateTime;
  reviewedById: ID | null;
  reviewedAt: ISODateTime | null;
  reviewNote: string;
}

export type InstrumentStatus = "available" | "assigned" | "maintenance" | "retired";
export type InstrumentCategory =
  | "Measurement"
  | "Refrigerant Handling"
  | "Air Balancing"
  | "Electrical Testing"
  | "Power Tools"
  | "Safety";

export interface Instrument {
  id: ID;
  code: string; // INS-001
  name: string;
  serialNumber: string;
  category: InstrumentCategory;
  purchaseValue: number;
  purchaseDate: ISODate;
  status: InstrumentStatus;
  assignedEngineerId: ID | null;
  assignedProjectId: ID | null;
  notes: string;
}

/** History of instrument deployments. Drives instrument/equipment cost. */
export interface ProjectInstrument {
  id: ID;
  instrumentId: ID;
  projectId: ID;
  engineerId: ID | null;
  assignedAt: ISODate;
  returnedAt: ISODate | null;
}

export type ProjectCostType = "material" | "labour_contract" | "other";

/** Direct project cost entries not covered by expenses (e.g. equipment purchase, subcontract labour). */
export interface ProjectCost {
  id: ID;
  projectId: ID;
  type: ProjectCostType;
  description: string;
  amount: number;
  date: ISODate;
}

export type NotificationType =
  | "expense_submitted"
  | "expense_approved"
  | "expense_rejected"
  | "engineer_assigned"
  | "instrument_assigned"
  | "project_deadline"
  | "project_completion"
  | "project_created";

export interface AppNotification {
  id: ID;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  createdAt: ISODateTime;
  /** Roles that should see this notification. */
  audienceRoles: Role[];
  /** Specific employees that should see it (in addition to roles). */
  audienceEmployeeIds: ID[];
  readBy: ID[]; // user ids
  dedupeKey?: string;
}

export interface AppSettings {
  companyName: string;
  /** Monthly instrument usage charge as a % of purchase value. */
  instrumentMonthlyRatePct: number;
  /** Days before expected completion that triggers a deadline alert. */
  deadlineAlertDays: number;
}
