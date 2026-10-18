import { money } from "./billing.js";

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 42;
const usableW = PAGE_W - MARGIN * 2;
const ascii = value => String(value ?? "").replaceAll("₱", "PHP ").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "?");
const pdfString = value => ascii(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
const fmt = value => money(Number(value || 0));
const monthTitle = month => new Date(`${month}-01T12:00:00`).toLocaleDateString("en-PH", { month: "long", year: "numeric" });

function createPdfPages(data, month, period) {
  const pages = [];
  let commands = [];
  let y = 42;
  const push = value => commands.push(value);
  const text = (value, x, top, size = 9, color = "0.09 0.17 0.29") => {
    push(`${color} rg BT /F1 ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${(PAGE_H - top).toFixed(2)} Tm (${pdfString(value)}) Tj ET`);
  };
  const rect = (x, top, w, h, fill, stroke) => {
    if (fill) push(`${fill} rg ${x} ${(PAGE_H - top - h).toFixed(2)} ${w} ${h} re f`);
    if (stroke) push(`${stroke} RG 0.6 w ${x} ${(PAGE_H - top - h).toFixed(2)} ${w} ${h} re S`);
  };
  const line = (x1, top1, x2, top2, color = "0.86 0.89 0.93") => push(`${color} RG 0.55 w ${x1} ${(PAGE_H - top1).toFixed(2)} m ${x2} ${(PAGE_H - top2).toFixed(2)} l S`);
  const finishPage = () => {
    line(MARGIN, 813, PAGE_W - MARGIN, 813);
    text("Spartment analytics · Confidential", MARGIN, 827, 7, "0.40 0.46 0.54");
    text(`Page ${pages.length + 1}`, PAGE_W - MARGIN - 35, 827, 7, "0.40 0.46 0.54");
    pages.push(commands.join("\n"));
    commands = [];
  };
  const newPage = () => {
    if (commands.length) finishPage();
    rect(0, 0, PAGE_W, 5, "0.14 0.36 0.89");
    text("SPARTMENT  /  PROPERTY MANAGEMENT", MARGIN, 27, 7, "0.14 0.36 0.89");
    text(`${period.toUpperCase()} REPORT  ·  ${month}`, PAGE_W - MARGIN - 150, 27, 7, "0.34 0.41 0.51");
    line(MARGIN, 36, PAGE_W - MARGIN, 36);
    y = 54;
  };
  const wrap = (value, maxChars) => {
    const words = ascii(value).split(/\s+/);
    const lines = [];
    let current = "";
    for (const word of words) {
      if (!word) continue;
      if (word.length > maxChars) {
        if (current) lines.push(current);
        current = "";
        for (let i = 0; i < word.length; i += maxChars) lines.push(word.slice(i, i + maxChars));
      } else if (!current || (current + " " + word).length <= maxChars) current = current ? current + " " + word : word;
      else { lines.push(current); current = word; }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  };
  const sectionTitle = (title, subtitle) => {
    if (y > PAGE_H - 90) newPage();
    text(title, MARGIN, y + 12, 13, "0.09 0.17 0.29");
    y += 19;
    if (subtitle) { text(subtitle, MARGIN, y + 7, 8, "0.38 0.44 0.53"); y += 16; }
    y += 4;
  };
  const drawTable = (headers, rows, widths, emptyText = "No records.") => {
    const contentRows = rows.length ? rows : [[emptyText, ...Array(Math.max(0, headers.length - 1)).fill("")]];
    const drawHeader = () => {
      rect(MARGIN, y, usableW, 22, "0.92 0.95 0.99");
      let x = MARGIN;
      headers.forEach((header, index) => { text(header.toUpperCase(), x + 5, y + 14, 6.4, "0.16 0.28 0.45"); x += widths[index]; });
      y += 22;
    };
    drawHeader();
    contentRows.forEach((row, rowIndex) => {
      const wrapped = row.map((cell, index) => wrap(cell, Math.max(7, Math.floor(widths[index] / 4.1))));
      const lineCount = Math.min(3, Math.max(...wrapped.map(lines => lines.length)));
      const height = Math.max(21, lineCount * 9 + 9);
      if (y + height > PAGE_H - 45) { newPage(); drawHeader(); }
      if (rowIndex % 2 === 1) rect(MARGIN, y, usableW, height, "0.985 0.99 1");
      let x = MARGIN;
      wrapped.forEach((cellLines, index) => {
        cellLines.slice(0, 3).forEach((value, lineIndex) => text(value, x + 5, y + 12 + lineIndex * 9, 7.2, "0.12 0.19 0.29"));
        x += widths[index];
      });
      line(MARGIN, y + height, PAGE_W - MARGIN, y + height);
      y += height;
    });
    y += 10;
  };

  const snapshot = data.snapshot || {};
  const health = snapshot.collectionHealth || {};
  const rows = snapshot.rows || [];
  const [year, monthNumber] = month.split("-").map(Number);
  const startMonth = period === "Yearly" ? 1 : period === "Quarterly" ? Math.floor((monthNumber - 1) / 3) * 3 + 1 : monthNumber;
  const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const nextMonth = new Date(Date.UTC(year, startMonth - 1 + (period === "Yearly" ? 12 : period === "Quarterly" ? 3 : 1), 1)).toISOString().slice(0, 7);
  const periodRows = rows.filter(bill => bill.billing_period >= start && bill.billing_period < `${nextMonth}-01`);
  const kpis = [
    ["COLLECTED THIS MONTH", fmt(snapshot.collected), month],
    ["OUTSTANDING BALANCE", fmt(snapshot.outstanding), `${rows.filter(bill => Number(bill.balance) > 0).length} unpaid bills`],
    ["OVERDUE BALANCE", fmt(snapshot.overdue), `Through ${snapshot.cutoff || "report date"}`],
    ["ROOM OCCUPANCY", `${Number(snapshot.occupancy || 0).toFixed(1)}%`, `${snapshot.activeTenants || 0} active tenants`],
  ];

  newPage();
  text("Collections & operations report", MARGIN, y + 20, 22, "0.07 0.14 0.25");
  text(`${period} view  ·  ${monthTitle(month)}`, MARGIN, y + 38, 10, "0.36 0.43 0.53");
  text(`REPORT THROUGH  ${snapshot.cutoff || "-"}`, PAGE_W - MARGIN - 125, y + 18, 8, "0.16 0.28 0.45");
  text(`Generated ${new Date(data.loadedAt || Date.now()).toLocaleDateString("en-PH")}`, PAGE_W - MARGIN - 125, y + 31, 7, "0.40 0.46 0.54");
  y += 58;
  const gap = 9;
  const cardW = (usableW - gap * 3) / 4;
  kpis.forEach((item, index) => {
    const x = MARGIN + index * (cardW + gap);
    rect(x, y, cardW, 61, "0.97 0.98 1", "0.85 0.89 0.95");
    text(item[0], x + 8, y + 15, 6, "0.38 0.45 0.55");
    text(item[1], x + 8, y + 34, 11, "0.07 0.14 0.25");
    text(item[2], x + 8, y + 49, 6.5, "0.40 0.46 0.54");
  });
  y += 76;

  sectionTitle("Revenue trend", `Billed by billing period and collected by payment date · Through ${snapshot.cutoff || "-"}`);
  drawTable(["Period", "Billed (PHP)", "Collected (PHP)"], (data.series || []).map(point => [point.label, fmt(point.billed), fmt(point.value)]), [170, 170, 171], "No collection data.");

  const statusRows = ["Paid", "Partially paid", "Pending", "Late"].map(status => {
    const bills = periodRows.filter(bill => bill.status === status);
    return [status === "Pending" ? "Outstanding" : status, bills.length, fmt(bills.reduce((sum, bill) => sum + Number(bill.total || 0), 0)), fmt(bills.reduce((sum, bill) => sum + Number(bill.paid || 0), 0)), fmt(bills.reduce((sum, bill) => sum + Number(bill.balance || 0), 0))];
  });
  sectionTitle("Bill status totals", `Selected ${period.toLowerCase()} period · ${start} through ${snapshot.cutoff || "-"}`);
  drawTable(["Status", "Bills", "Billed", "Collected", "Balance"], statusRows, [117, 53, 100, 100, 141]);

  sectionTitle("Current room inventory", `Current availability · ${Number(snapshot.occupancy || 0).toFixed(1)}% occupied · Potential monthly vacancy rent ${fmt(snapshot.vacancyGap)}`);
  drawTable(["Room status", "Rooms"], (snapshot.inventory || []).map(room => [room.status, room.count]), [340, 171]);

  sectionTitle("Collection health", "Recorded payment performance through the report date.");
  drawTable(["Measure", "Result"], [["Collection rate", `${Number(health.collectionRate || 0).toFixed(1)}%`], ["On-time payment rate", `${Number(health.onTimeRate || 0).toFixed(1)}%`], ["Bills due", health.dueBillCount || 0], ["Bills paid in full by due date", health.onTimeBillCount || 0]], [340, 171]);

  sectionTitle("Outstanding balance aging", "Outstanding balances grouped by days past due.");
  drawTable(["Age", "Balance (PHP)", "Bills"], (health.aging || []).map(bucket => [bucket.label, fmt(bucket.balance), bucket.billCount]), [200, 200, 111]);

  sectionTitle("Tenant payment risk", "At least two bills paid late or still unpaid in the six-month window.");
  drawTable(["Tenant", "Room", "Late bills", "Overdue balance"], (health.repeatLatePayers || []).map(tenant => [tenant.name, tenant.room, tenant.lateBillCount, fmt(tenant.overdueBalance)]), [135, 190, 70, 116], "No tenants meet the repeated late-payment rule.");

  if (commands.length) finishPage();
  return pages;
}

export function generateAnalyticsPdf(data, month, period) {
  const pages = createPdfPages(data, month, period);
  const objects = [];
  const pageRefs = pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ");
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`);
  pages.forEach((content, index) => {
    const pageObject = 3 + index * 2;
    const contentObject = pageObject + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentObject} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  let document = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(document.length);
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = document.length;
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index++) document += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(document);
}
