// Shared frontend examples used by the tenant dashboard and admin request list.
export const maintenanceRequests = [
  {
    id: "REQ-T201-001", type: "Maintenance", title: "Kitchen faucet leak",
    text: "Kitchen faucet leak", name: "Maria Santos", email: "tenant1@gmail.com",
    phone: "", room: "201", sender: "Tenant", priority: "Normal",
    created: "2026-05-09T10:00:00+08:00", status: "Scheduled", scheduledDate: "2026-05-12",
    detail: "A technician is scheduled for May 12.",
    history: [
      { date: "2026-05-09T10:00:00+08:00", text: "Request submitted." },
      { date: "2026-05-12T00:00:00+08:00", text: "Scheduled technician visit: May 12, 2026." },
    ],
  },
  {
    id: "REQ-T201-002", type: "Maintenance", title: "Bedroom light fixture",
    text: "Bedroom light fixture", name: "Maria Santos", email: "tenant1@gmail.com",
    phone: "", room: "201", sender: "Tenant", priority: "Normal",
    created: "2026-04-18T10:00:00+08:00", status: "Resolved",
    detail: "Completed Apr 20, 2026",
    history: [
      { date: "2026-04-18T10:00:00+08:00", text: "Request submitted." },
      { date: "2026-04-20T10:00:00+08:00", text: "Bedroom light fixture completed." },
    ],
  },
];
