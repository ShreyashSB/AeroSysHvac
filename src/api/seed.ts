/**
 * Realistic first-load demo data for Aerosys HVAC.
 * All dates are generated relative to "today" so the demo always looks current.
 * Costs are never hardcoded as totals – dashboards derive them from these records.
 */
import type {
  AppNotification,
  AppSettings,
  Employee,
  Expense,
  ExpenseCategory,
  Instrument,
  Project,
  ProjectAssignment,
  ProjectCost,
  ProjectInstrument,
  User,
} from "@/types/models";
import { addDays, todayISO } from "@/lib/dates";

export interface Database {
  version: number;
  users: User[];
  employees: Employee[];
  projects: Project[];
  assignments: ProjectAssignment[];
  expenses: Expense[];
  instruments: Instrument[];
  projectInstruments: ProjectInstrument[];
  projectCosts: ProjectCost[];
  notifications: AppNotification[];
  settings: AppSettings;
}

export const DB_VERSION = 1;

/** Deterministic PRNG so the seed is identical on every fresh load. */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number, to = 100) => Math.round(n / to) * to;

export function buildSeed(): Database {
  const T = todayISO();
  const d = (offset: number) => addDays(T, offset);
  const now = new Date().toISOString();
  const rand = mulberry32(20260927);
  const pick = <V,>(arr: V[]) => arr[Math.floor(rand() * arr.length)]!;

  // ---------------------------------------------------------------- employees
  type E = Omit<Employee, "id" | "code" | "email" | "status" | "phone"> & { status?: Employee["status"] };
  const empRows: E[] = [
    { name: "Rajesh Kulkarni", department: "Management", designation: "Managing Director", monthlySalary: 350000, joiningDate: "2012-04-01", isSiteEngineer: false, baseLocation: "Pune HO" },
    { name: "Meera Iyer", department: "Management", designation: "Director – Operations", monthlySalary: 240000, joiningDate: "2014-06-16", isSiteEngineer: false, baseLocation: "Pune HO" },
    { name: "Anita Deshpande", department: "Projects", designation: "Senior Project Manager", monthlySalary: 140000, joiningDate: "2016-01-11", isSiteEngineer: false, baseLocation: "Pune HO" },
    { name: "Sandeep Rao", department: "Projects", designation: "Project Manager", monthlySalary: 120000, joiningDate: "2018-08-06", isSiteEngineer: false, baseLocation: "Pune HO" },
    { name: "Farhan Shaikh", department: "Projects", designation: "Project Manager", monthlySalary: 110000, joiningDate: "2019-03-18", isSiteEngineer: false, baseLocation: "Mumbai Office" },
    { name: "Sneha Joshi", department: "Accounts", designation: "Accounts Manager", monthlySalary: 85000, joiningDate: "2017-07-03", isSiteEngineer: false, baseLocation: "Pune HO" },
    { name: "Pooja Nair", department: "Accounts", designation: "Accounts Executive", monthlySalary: 45000, joiningDate: "2022-02-14", isSiteEngineer: false, baseLocation: "Pune HO" },
    { name: "Rahul Menon", department: "Admin", designation: "Admin Executive", monthlySalary: 38000, joiningDate: "2021-09-01", isSiteEngineer: false, baseLocation: "Pune HO" },
    { name: "Vikram Patil", department: "Engineering", designation: "Senior Site Engineer", monthlySalary: 75000, joiningDate: "2017-05-22", isSiteEngineer: true, baseLocation: "Pune" },
    { name: "Amit Chavan", department: "Engineering", designation: "Site Engineer", monthlySalary: 55000, joiningDate: "2020-01-06", isSiteEngineer: true, baseLocation: "Pune" },
    { name: "Priya Sharma", department: "Engineering", designation: "Site Engineer", monthlySalary: 58000, joiningDate: "2019-11-04", isSiteEngineer: true, baseLocation: "Mumbai" },
    { name: "Karan Mehta", department: "Engineering", designation: "Site Engineer", monthlySalary: 52000, joiningDate: "2021-06-14", isSiteEngineer: true, baseLocation: "Pune" },
    { name: "Nikhil Jadhav", department: "Engineering", designation: "Senior Site Engineer", monthlySalary: 72000, joiningDate: "2016-10-10", isSiteEngineer: true, baseLocation: "Nashik" },
    { name: "Suresh Yadav", department: "Service", designation: "HVAC Technician", monthlySalary: 32000, joiningDate: "2020-08-17", isSiteEngineer: true, baseLocation: "Pune" },
    { name: "Arjun Reddy", department: "Engineering", designation: "Site Engineer", monthlySalary: 50000, joiningDate: "2022-07-11", isSiteEngineer: true, baseLocation: "Mumbai" },
    { name: "Deepak Gupta", department: "Engineering", designation: "Commissioning Engineer", monthlySalary: 65000, joiningDate: "2018-12-03", isSiteEngineer: true, baseLocation: "Pune" },
    { name: "Rohit Pawar", department: "Service", designation: "HVAC Technician", monthlySalary: 30000, joiningDate: "2023-01-09", isSiteEngineer: true, baseLocation: "Pune" },
    { name: "Imran Khan", department: "Engineering", designation: "Site Supervisor", monthlySalary: 42000, joiningDate: "2019-04-15", isSiteEngineer: true, baseLocation: "Mumbai" },
    { name: "Kavya Pillai", department: "Engineering", designation: "Graduate Engineer Trainee", monthlySalary: 28000, joiningDate: "2025-07-01", isSiteEngineer: true, baseLocation: "Pune" },
    { name: "Manoj Bhosale", department: "Service", designation: "Senior Technician", monthlySalary: 38000, joiningDate: "2015-02-02", isSiteEngineer: true, baseLocation: "Pune", status: "on_leave" },
    { name: "Sagar Kale", department: "Engineering", designation: "Site Engineer", monthlySalary: 48000, joiningDate: "2023-06-19", isSiteEngineer: true, baseLocation: "Pune" },
    { name: "Neha Kulkarni", department: "Engineering", designation: "HVAC Design & Site Engineer", monthlySalary: 62000, joiningDate: "2021-03-08", isSiteEngineer: true, baseLocation: "Pune" },
  ];
  const employees: Employee[] = empRows.map((e, i) => ({
    ...e,
    id: `emp_${i + 1}`,
    code: `AHV-${String(101 + i)}`,
    email: `${e.name.split(" ")[0]!.toLowerCase()}.${e.name.split(" ")[1]!.toLowerCase()}@aerosyshvac.in`,
    phone: `+91 98${String(22000000 + i * 104729).slice(0, 8)}`,
    status: e.status ?? "active",
  }));
  const E = (n: number) => `emp_${n}`;

  const users: User[] = [
    [1, "management"], [2, "management"],
    [3, "project_manager"], [4, "project_manager"], [5, "project_manager"],
    [6, "accounts"], [7, "accounts"],
    [9, "site_engineer"], [10, "site_engineer"], [11, "site_engineer"], [12, "site_engineer"],
    [13, "site_engineer"], [15, "site_engineer"], [16, "site_engineer"],
  ].map(([n, role]) => ({
    id: `usr_${n}`,
    employeeId: E(n as number),
    role: role as User["role"],
    email: employees[(n as number) - 1]!.email,
  }));

  // ---------------------------------------------------------------- projects
  type P = [name: string, client: string, site: string, mgr: number, value: number, budgetPct: number, start: number, end: number, status: Project["status"], completion: number, desc: string];
  const projRows: P[] = [
    ["Phoenix Mall HVAC Retrofit", "Phoenix Marketcity Developers", "Viman Nagar, Pune", 3, 12500000, 0.7, -240, 60, "active", 70, "Replacement of 4 x 400TR air-cooled chillers with water-cooled screw chillers, AHU retrofit and BMS integration across 3 retail floors."],
    ["GreenTech Manufacturing Plant", "GreenTech Components Pvt Ltd", "Chakan MIDC, Pune", 4, 21000000, 0.74, -180, 150, "active", 45, "Complete HVAC for new 1.2 lakh sq.ft. auto-component plant: evaporative cooling, spot cooling for assembly lines and exhaust systems."],
    ["Sunrise Commercial Tower", "Sunrise Realty LLP", "BKC, Mumbai", 3, 16500000, 0.72, -120, 210, "active", 30, "VRF system for 18-storey Grade-A office tower including fresh air units, ducting and energy recovery ventilators."],
    ["Metro Hospital HVAC Installation", "Metro Healthcare Ltd", "Gangapur Road, Nashik", 5, 9500000, 0.71, -200, 10, "active", 90, "HVAC for 150-bed hospital with modular OT air handling, HEPA filtration, ICU pressure zoning and isolation rooms."],
    ["Orchid IT Park Chiller Upgrade", "Orchid Infospace Pvt Ltd", "Hinjewadi Phase 2, Pune", 4, 7800000, 0.72, -400, -60, "completed", 100, "Upgrade of central chiller plant with VFD-driven pumps, cooling tower refurbishment and plant room automation."],
    ["Blue Ridge Clubhouse VRF", "Blue Ridge Township", "Hinjewadi, Pune", 5, 3200000, 0.72, -300, -120, "completed", 100, "VRF air-conditioning for clubhouse, banquet hall, gymnasium and indoor pool dehumidification."],
    ["Apex Pharma Cleanroom HVAC", "Apex Lifesciences Ltd", "Ranjangaon MIDC", 3, 14000000, 0.73, -90, 180, "active", 20, "ISO Class 7/8 cleanroom HVAC with pressure cascades, AHUs with terminal HEPA and validation (DQ/IQ/OQ) support."],
    ["Cityscape Hotel Ventilation Revamp", "Cityscape Hospitality Pvt Ltd", "Koregaon Park, Pune", 4, 4800000, 0.73, -60, 75, "active", 35, "Kitchen exhaust & fresh air system revamp for 120-room hotel including toilet exhaust and car-park ventilation."],
    ["Nova Data Centre Precision Cooling", "Nova Datacenters Pvt Ltd", "Mahape, Navi Mumbai", 5, 18000000, 0.72, 20, 300, "planning", 0, "Precision cooling with in-row units, chilled water plant with free cooling and N+1 redundancy for 2 MW IT load."],
    ["Riverside School AHU Replacement", "Riverside Education Trust", "Kothrud, Pune", 3, 2200000, 0.73, -150, 5, "on_hold", 60, "Replacement of 12 ageing AHUs across classrooms and auditorium. On hold pending client approval of revised auditorium layout."],
    ["Horizon Logistics Warehouse Ventilation", "Horizon Logistics Pvt Ltd", "Talegaon MIDC", 4, 3800000, 0.74, -500, -200, "completed", 100, "Roof-mounted ventilation and HVLS fans for 80,000 sq.ft. warehouse with dock-area spot cooling."],
    ["Sai Krupa Mall Ducting Works", "Sai Krupa Developers", "Jalna Road, Aurangabad", 5, 2600000, 0.77, 35, 160, "planning", 0, "GI ducting, diffusers and insulation package for 3-level shopping centre (supply & installation)."],
  ];
  const projects: Project[] = projRows.map((p, i) => ({
    id: `prj_${i + 1}`,
    code: `PRJ-${2025 + (p[6] > -250 ? 1 : 0)}-${String(i + 1).padStart(3, "0")}`,
    name: p[0],
    clientName: p[1],
    site: p[2],
    managerId: E(p[3]),
    contractValue: p[4],
    estimatedCost: round(p[4] * p[5], 10000),
    startDate: d(p[6]),
    endDate: d(p[7]),
    status: p[8],
    completion: p[9],
    description: p[10],
    createdAt: new Date(Date.now() + (p[6] - 20) * 86400000).toISOString(),
    updatedAt: now,
  }));

  // ------------------------------------------------------------- assignments
  // [project, employee, role, allocation, startOffsetFromProjectStart, endOffsetFromToday|null]
  type A = [number, number, ProjectAssignment["role"], number, number, number | null];
  const asgRows: A[] = [
    [1, 9, "Lead Engineer", 100, 0, null],
    [1, 12, "Site Engineer", 100, 10, null],
    [1, 14, "Technician", 100, 30, null],
    [2, 13, "Lead Engineer", 100, 0, null],
    [2, 10, "Site Engineer", 100, 0, null],
    [2, 17, "Technician", 100, 20, null],
    [3, 11, "Lead Engineer", 100, 0, null],
    [3, 15, "Site Engineer", 100, 15, null],
    [3, 18, "Supervisor", 50, 30, null],
    [4, 16, "Lead Engineer", 60, 0, null],
    [4, 13, "Site Engineer", 30, 0, -100],
    [4, 19, "Site Engineer", 100, 40, null],
    [5, 9, "Lead Engineer", 100, 0, -241],
    [5, 10, "Site Engineer", 100, 0, -60],
    [5, 16, "Site Engineer", 50, 90, -60],
    [6, 12, "Lead Engineer", 100, 0, -120],
    [6, 20, "Technician", 100, 0, -120],
    [7, 16, "Lead Engineer", 40, 0, null],
    [7, 18, "Supervisor", 50, 10, null],
    [8, 20, "Technician", 50, 0, -30],
    [8, 15, "Site Engineer", 50, 0, null],
    [10, 12, "Site Engineer", 30, 0, -40],
    [11, 10, "Lead Engineer", 100, 0, -200],
    [11, 17, "Technician", 100, 10, -200],
  ];
  const assignments: ProjectAssignment[] = asgRows.map((a, i) => {
    const project = projects[a[0] - 1]!;
    const start = addDays(project.startDate, a[4]);
    return {
      id: `asg_${i + 1}`,
      projectId: project.id,
      employeeId: E(a[1]),
      role: a[2],
      allocation: a[3],
      startDate: start,
      endDate: a[5] === null ? null : d(a[5]),
    };
  });

  // ---------------------------------------------------- direct project costs
  const projectCosts: ProjectCost[] = [];
  const materialItems = [
    "Chiller / VRF outdoor units – supply",
    "AHU & FCU supply",
    "GI ducting & fabrication",
    "Copper piping & insulation",
    "Chilled water piping, valves & fittings",
    "Diffusers, grilles & dampers",
    "Electrical panels & cabling",
  ];
  let pcId = 1;
  for (const p of projects) {
    if (p.completion === 0) continue;
    // material is procured ahead of physical progress
    const materialTotal = p.contractValue * 0.47 * Math.min(1, (p.completion / 100) * 1.2);
    const parts = p.completion >= 60 ? 4 : p.completion >= 30 ? 3 : 2;
    let remaining = materialTotal;
    for (let k = 0; k < parts; k++) {
      const share = k === parts - 1 ? remaining : materialTotal * (0.2 + rand() * 0.2);
      remaining -= share;
      projectCosts.push({
        id: `pc_${pcId++}`,
        projectId: p.id,
        type: "material",
        description: materialItems[(k + Number(p.id.split("_")[1])) % materialItems.length]!,
        amount: round(share, 1000),
        date: addDays(p.startDate, 10 + k * 25),
      });
    }
    projectCosts.push({
      id: `pc_${pcId++}`,
      projectId: p.id,
      type: "labour_contract",
      description: "Sub-contract installation labour",
      amount: round(p.contractValue * 0.12 * (p.completion / 100), 1000),
      date: addDays(p.startDate, 45),
    });
    if (rand() > 0.4) {
      projectCosts.push({
        id: `pc_${pcId++}`,
        projectId: p.id,
        type: "other",
        description: pick(["Crane & rigging hire", "Scaffolding rental", "Third-party testing & balancing", "Transport of equipment"]),
        amount: round(40000 + rand() * 160000, 1000),
        date: addDays(p.startDate, 60),
      });
    }
  }

  // ---------------------------------------------------------------- expenses
  const expenseTemplates: Record<ExpenseCategory, { desc: string[]; min: number; max: number }> = {
    Travel: { desc: ["Bus fare to site", "Train tickets – site visit", "Flight for commissioning visit", "Cab from HO to site"], min: 600, max: 9500 },
    Accommodation: { desc: ["Hotel stay – 2 nights", "Guest house – weekly stay", "Lodging near site – 3 nights"], min: 2400, max: 14000 },
    Food: { desc: ["Team meals during night shift", "Meals during commissioning", "Site lunch for crew"], min: 350, max: 3200 },
    "Local Conveyance": { desc: ["Auto / local cab to site", "Two-wheeler fuel reimbursement", "Local transport for material pickup"], min: 200, max: 2200 },
    "Site Material": { desc: ["Urgent copper fittings purchase", "Nitrogen cylinder refill", "Refrigerant R-410A top-up", "Insulation tape & sealant"], min: 1200, max: 18000 },
    "Tools & Consumables": { desc: ["Drill bits & anchor fasteners", "Brazing rods", "PPE – gloves & masks", "Cable ties & consumables"], min: 400, max: 6500 },
    Other: { desc: ["Printing of drawings", "Courier of documents to client", "Site pass & gate charges"], min: 150, max: 2500 },
  };
  const categories = Object.keys(expenseTemplates) as ExpenseCategory[];
  const expenses: Expense[] = [];
  let exId = 1;
  for (const a of assignments) {
    const project = projects.find((p) => p.id === a.projectId)!;
    const end = a.endDate ?? T;
    const n = a.endDate ? 2 : 3;
    for (let k = 0; k < n; k++) {
      const cat = pick(categories);
      const tpl = expenseTemplates[cat];
      const span = Math.max(5, Math.round((new Date(end).getTime() - new Date(a.startDate).getTime()) / 86400000));
      const offset = a.endDate ? Math.round(rand() * span) : Math.max(0, span - Math.round(rand() * 45) - 1);
      const date = addDays(a.startDate, Math.min(offset, span));
      const age = Math.round((new Date(T).getTime() - new Date(date).getTime()) / 86400000);
      let status: Expense["status"] = "approved";
      if (project.status === "active" && age < 21) status = rand() > 0.35 ? "pending" : "approved";
      else if (rand() < 0.1) status = "rejected";
      const reviewer = project.managerId;
      expenses.push({
        id: `exp_${exId}`,
        code: `EXP-${String(1000 + exId)}`,
        employeeId: a.employeeId,
        projectId: a.projectId,
        category: cat,
        amount: round(tpl.min + rand() * (tpl.max - tpl.min), 10),
        date,
        description: pick(tpl.desc),
        receipt: rand() > 0.25 ? { fileName: `receipt_${1000 + exId}.jpg`, size: Math.round(80000 + rand() * 400000), mimeType: "image/jpeg" } : null,
        status,
        submittedAt: new Date(`${date}T18:30:00`).toISOString(),
        reviewedById: status === "pending" ? null : reviewer,
        reviewedAt: status === "pending" ? null : new Date(`${addDays(date, 2)}T11:00:00`).toISOString(),
        reviewNote: status === "rejected" ? "Receipt not legible / not a project expense" : "",
      });
      exId++;
    }
  }

  // ------------------------------------------------------------- instruments
  type I = [name: string, category: Instrument["category"], value: number, brand: string];
  const insRows: I[] = [
    ["Digital Manifold Gauge Set", "Refrigerant Handling", 68000, "TST"],
    ["Two-Stage Vacuum Pump 6 CFM", "Refrigerant Handling", 32000, "VPM"],
    ["Refrigerant Recovery Unit", "Refrigerant Handling", 85000, "RRU"],
    ["Electronic Refrigerant Leak Detector", "Refrigerant Handling", 24000, "LDT"],
    ["Vane Anemometer", "Air Balancing", 18500, "ANM"],
    ["Balometer / Air Flow Capture Hood", "Air Balancing", 245000, "BAL"],
    ["Differential Pressure Manometer", "Air Balancing", 22000, "MNM"],
    ["Thermal Imaging Camera", "Measurement", 310000, "TIC"],
    ["Digital Clamp Meter", "Electrical Testing", 38000, "CLM"],
    ["Insulation Resistance Tester (Megger)", "Electrical Testing", 52000, "IRT"],
    ["Digital Thermo-Hygrometer", "Measurement", 16000, "THG"],
    ["Sound Level Meter", "Measurement", 28000, "SLM"],
    ["Airborne Particle Counter", "Measurement", 380000, "APC"],
    ["Oxy-Acetylene Brazing Kit", "Power Tools", 26000, "BRZ"],
    ["Core Drilling Machine", "Power Tools", 72000, "CDM"],
    ["Duct Leakage Tester", "Air Balancing", 195000, "DLT"],
    ["Rotary Hammer Drill", "Power Tools", 18000, "RHD"],
    ["Full Body Harness Kit (set of 5)", "Safety", 12000, "SFH"],
  ];
  // [instrumentIndex, status, engineer, project]
  const insState: Array<[Instrument["status"], number | null, number | null]> = [
    ["assigned", 9, 1], ["assigned", 12, 1], ["available", null, null], ["assigned", 10, 2],
    ["assigned", 15, 3], ["assigned", 16, 4], ["maintenance", null, null], ["assigned", 11, 3],
    ["assigned", 13, 2], ["available", null, null], ["assigned", 19, 4], ["available", null, null],
    ["assigned", 18, 7], ["assigned", 14, 1], ["available", null, null], ["maintenance", null, null],
    ["available", null, null], ["retired", null, null],
  ];
  const instruments: Instrument[] = insRows.map((r, i) => {
    const [status, eng, prj] = insState[i]!;
    return {
      id: `ins_${i + 1}`,
      code: `INS-${String(i + 1).padStart(3, "0")}`,
      name: r[0],
      serialNumber: `${r[3]}-${2019 + (i % 6)}${String(4471 + i * 137).padStart(5, "0")}`,
      category: r[1],
      purchaseValue: r[2],
      purchaseDate: d(-2600 + i * 110),
      status,
      assignedEngineerId: eng ? E(eng) : null,
      assignedProjectId: prj ? `prj_${prj}` : null,
      notes: status === "maintenance" ? "Sent for annual calibration" : status === "retired" ? "Damaged beyond repair" : "",
    };
  });
  const projectInstruments: ProjectInstrument[] = [];
  let piId = 1;
  for (const ins of instruments) {
    if (ins.status === "assigned" && ins.assignedProjectId) {
      const project = projects.find((p) => p.id === ins.assignedProjectId)!;
      projectInstruments.push({
        id: `pi_${piId++}`,
        instrumentId: ins.id,
        projectId: project.id,
        engineerId: ins.assignedEngineerId,
        assignedAt: addDays(project.startDate, 15 + Math.round(rand() * 30)),
        returnedAt: null,
      });
    }
  }
  // historic deployments on completed projects
  const history: Array<[number, number, number]> = [[1, 5, 9], [6, 5, 10], [3, 6, 12], [8, 11, 10], [10, 5, 16]];
  for (const [insN, prjN, engN] of history) {
    const project = projects[prjN - 1]!;
    projectInstruments.push({
      id: `pi_${piId++}`,
      instrumentId: `ins_${insN}`,
      projectId: project.id,
      engineerId: E(engN),
      assignedAt: addDays(project.startDate, 20),
      returnedAt: addDays(project.endDate, -10),
    });
  }

  // ----------------------------------------------------------- notifications
  const notifications: AppNotification[] = [];
  const pending = expenses.filter((e) => e.status === "pending").slice(-4);
  for (const e of pending) {
    const emp = employees.find((x) => x.id === e.employeeId)!;
    const project = projects.find((p) => p.id === e.projectId)!;
    notifications.push({
      id: `ntf_${notifications.length + 1}`,
      type: "expense_submitted",
      title: "Expense submitted for approval",
      message: `${emp.name} submitted ${e.category} expense of ₹${e.amount.toLocaleString("en-IN")} on ${project.name}.`,
      link: `/expenses?status=pending`,
      createdAt: e.submittedAt,
      audienceRoles: ["management", "accounts"],
      audienceEmployeeIds: [project.managerId],
      readBy: [],
    });
  }
  notifications.push({
    id: `ntf_${notifications.length + 1}`,
    type: "engineer_assigned",
    title: "Assigned to project",
    message: "Kavya Pillai has been assigned to Metro Hospital HVAC Installation as Site Engineer.",
    link: "/projects/prj_4",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    audienceRoles: ["management"],
    audienceEmployeeIds: [E(19), E(5)],
    readBy: [],
  });

  return {
    version: DB_VERSION,
    users,
    employees,
    projects,
    assignments,
    expenses,
    instruments,
    projectInstruments,
    projectCosts,
    notifications,
    settings: {
      companyName: "Aerosys HVAC Solutions Pvt Ltd",
      instrumentMonthlyRatePct: 3,
      deadlineAlertDays: 14,
    },
  };
}
