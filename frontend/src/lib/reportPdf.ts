import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from './api';

type WorkspaceReport = 'executive' | 'technical';
type AnyRecord = Record<string, any>;

const BLUE: [number, number, number] = [0, 102, 204];
const NAVY: [number, number, number] = [20, 38, 63];
const MUTED: [number, number, number] = [91, 107, 124];
const LIGHT: [number, number, number] = [241, 246, 252];

function rows(value: any, key?: string): AnyRecord[] {
  const candidate = key ? value?.[key] : value;
  return Array.isArray(candidate) ? candidate : [];
}

function inr(value: unknown): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 'INR 0';
  if (Math.abs(amount) >= 10_000_000) return `INR ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (Math.abs(amount) >= 100_000) return `INR ${(amount / 100_000).toFixed(2)} L`;
  return `INR ${Math.round(amount).toLocaleString('en-IN')}`;
}

function percent(value: unknown): string {
  const number = Number(value ?? 0);
  return `${number.toFixed(number % 1 ? 1 : 0)}%`;
}

function safeName(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'CRISPR-report';
}

async function optionalGet(path: string): Promise<any> {
  try { return (await api.get(path)).data; }
  catch { return null; }
}

function addBrandHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, 5, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('CRISPR', 14, 14);
  doc.setFontSize(12);
  doc.text(title, 14, 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(205, 218, 234);
  doc.text(subtitle, 14, 29, { maxWidth: 180 });
}

function section(doc: jsPDF, title: string, y: number): number {
  if (y > 260) { doc.addPage(); y = 18; }
  doc.setFillColor(...LIGHT);
  doc.roundedRect(14, y, 182, 9, 1.5, 1.5, 'F');
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title, 18, y + 6);
  return y + 14;
}

function kpis(doc: jsPDF, values: Array<[string, string]>, y: number): number {
  const gap = 3;
  const width = (182 - gap * (values.length - 1)) / values.length;
  values.forEach(([label, value], index) => {
    const x = 14 + index * (width + gap);
    doc.setDrawColor(214, 224, 235);
    doc.setFillColor(250, 252, 255);
    doc.roundedRect(x, y, width, 23, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(label, x + 4, y + 7, { maxWidth: width - 8 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(value, x + 4, y + 17, { maxWidth: width - 8 });
  });
  return y + 29;
}

function table(doc: jsPDF, y: number, head: string[], body: (string | number)[][]): number {
  autoTable(doc, {
    startY: y,
    head: [head],
    body: body.length ? body : [['No verified records available', ...head.slice(1).map(() => '')]],
    theme: 'grid',
    margin: { left: 14, right: 14, bottom: 17 },
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 2.3, textColor: NAVY, lineColor: [222, 229, 237], lineWidth: 0.15 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 250, 253] },
  });
  return ((doc as any).lastAutoTable?.finalY ?? y) + 8;
}

function addFooter(doc: jsPDF, generatedAt: string, workspace: WorkspaceReport) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(215, 224, 234);
    doc.line(14, 284, 196, 284);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`CRISPR ${workspace === 'executive' ? 'Executive' : 'Technical'} Report | Confidential`, 14, 289);
    doc.text(`Generated ${generatedAt}`, 105, 289, { align: 'center' });
    doc.text(`Page ${page} of ${pages}`, 196, 289, { align: 'right' });
  }
}

function executiveReport(doc: jsPDF, data: AnyRecord) {
  const enterprise = data.enterprise ?? {};
  const risks = rows(data.risks, 'risks').sort((a, b) => Number(b.eal_inr) - Number(a.eal_inr));
  const compliance = rows(data.compliance, 'frameworks').length ? rows(data.compliance, 'frameworks') : rows(data.compliance);
  const gaps = rows(data.gaps, 'gaps').length ? rows(data.gaps, 'gaps') : rows(data.gaps);
  const controls = rows(data.controls, 'controls').length ? rows(data.controls, 'controls') : rows(data.controls);
  let y = section(doc, '1. Executive posture summary', 44);
  y = kpis(doc, [
    ['Enterprise risk score', String(enterprise.enterprise_risk_score ?? 'N/A')],
    ['Expected annual loss', inr(enterprise.total_eal_inr)],
    ['P95 cyber value at risk', inr(enterprise.var_95_inr)],
    ['Current security spend', enterprise.current_spend_inr == null ? 'Not supplied' : inr(enterprise.current_spend_inr)],
  ], y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  const statement = `Decision statement: Current quantified cyber exposure is ${inr(enterprise.total_eal_inr)} EAL. Prioritize investments against the highest financial contributors and validate realized reduction with remediation evidence.`;
  const lines = doc.splitTextToSize(statement, 178);
  doc.text(lines, 16, y);
  y += lines.length * 4 + 7;
  y = section(doc, '2. Top financial risk contributors', y);
  y = table(doc, y, ['Asset / risk', 'Risk score', 'Likelihood', 'Expected annual loss'], risks.slice(0, 10).map(r => [
    r.asset_name ?? r.name ?? r.asset_id ?? 'Unknown', Number(r.risk_score ?? 0).toFixed(1), percent(Number(r.likelihood ?? 0) * 100), inr(r.eal_inr ?? Number(r.eal_lakh ?? 0) * 100_000),
  ]));
  y = section(doc, '3. Compliance and regulatory exposure', y);
  y = table(doc, y, ['Framework', 'Score', 'Status / gap', 'Financial impact'], (gaps.length ? gaps : compliance).slice(0, 10).map(r => [
    r.framework ?? r.name ?? 'Framework', r.score == null ? 'N/A' : percent(r.score), r.requirement ?? r.gap ?? r.status ?? 'Current assessment', inr(r.financial_impact_inr ?? r.impact_inr ?? 0),
  ]));
  y = section(doc, '4. Investment priorities', y);
  table(doc, y, ['Control / initiative', 'Cost', 'Risk reduction', 'ROSI'], controls.slice(0, 10).map(r => {
    const cost = Number(r.cost_inr ?? 0);
    const reduction = Number(r.risk_reduction_inr ?? 0);
    return [r.name ?? r.control_name ?? r.control_id ?? 'Control', inr(cost), inr(reduction), cost ? percent(((reduction - cost) / cost) * 100) : 'N/A'];
  }));
}

function technicalReport(doc: jsPDF, data: AnyRecord) {
  const enterprise = data.enterprise ?? {};
  const findings = rows(data.findings, 'findings');
  const assets = rows(data.assets, 'assets');
  const risks = rows(data.risks, 'risks').sort((a, b) => Number(b.risk_score) - Number(a.risk_score));
  const integrations = rows(data.integrations, 'integrations');
  const remediations = rows(data.remediation, 'items');
  const critical = findings.filter(r => String(r.severity).toUpperCase() === 'CRITICAL').length;
  const high = findings.filter(r => String(r.severity).toUpperCase() === 'HIGH').length;
  const exposed = assets.filter(r => r.internet_facing).length;
  const connected = integrations.filter(r => String(r.status).toLowerCase() === 'connected').length;
  let y = section(doc, '1. Security operations summary', 44);
  y = kpis(doc, [['Critical findings', String(critical)], ['High findings', String(high)], ['Internet-exposed assets', String(exposed)], ['Connected sources', `${connected}/${integrations.length}`]], y);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Enterprise risk score: ${enterprise.enterprise_risk_score ?? 'N/A'} | Estimated annual loss: ${inr(enterprise.total_eal_inr)}`, 16, y);
  y += 10;
  y = section(doc, '2. Priority findings', y);
  const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  y = table(doc, y, ['Severity', 'Finding', 'Asset', 'Source', 'Status'], findings.sort((a, b) => order.indexOf(String(a.severity)) - order.indexOf(String(b.severity))).slice(0, 20).map(r => [
    r.severity ?? 'N/A', r.title ?? r.name ?? r.finding ?? r.finding_id ?? 'Finding', r.asset_name ?? r.asset_id ?? 'Unknown', r.source_type ?? r.source ?? 'Unknown', r.status ?? 'OPEN',
  ]));
  y = section(doc, '3. Active risk cases', y);
  y = table(doc, y, ['Asset / case', 'Risk score', 'EAL', 'Primary driver'], risks.slice(0, 12).map(r => [
    r.asset_name ?? r.name ?? r.asset_id ?? 'Unknown', Number(r.risk_score ?? 0).toFixed(1), inr(r.eal_inr ?? Number(r.eal_lakh ?? 0) * 100_000), r.top_driver ?? r.risk_driver ?? r.business_service ?? 'See finding evidence',
  ]));
  y = section(doc, '4. Remediation and verification status', y);
  y = table(doc, y, ['Ticket', 'Priority', 'Owner', 'Status', 'Potential reduction'], remediations.slice(0, 15).map(r => [
    r.ticket_key ?? r.id ?? 'Ticket', r.priority ?? 'N/A', r.owner_name ?? r.owner ?? 'Unassigned', r.status ?? 'OPEN', inr(r.risk_reduction_inr ?? r.potential_risk_reduction_inr ?? 0),
  ]));
  y = section(doc, '5. Data source health', y);
  table(doc, y, ['Integration', 'Provider', 'Status', 'Items ingested', 'Last synchronization'], integrations.slice(0, 15).map(r => [
    r.name ?? r.provider ?? 'Source', r.provider ?? 'N/A', r.status ?? 'Unknown', String(r.items_ingested ?? 0), r.last_sync_at ? new Date(r.last_sync_at).toLocaleString() : 'Not synchronized',
  ]));
}

export async function downloadDashboardPdf(workspace: WorkspaceReport, reportName: string): Promise<void> {
  const endpointMap = workspace === 'executive'
    ? { enterprise: '/api/risks/enterprise', risks: '/api/risks', compliance: '/api/compliance', gaps: '/api/compliance/gaps', controls: '/api/optimize/controls' }
    : { enterprise: '/api/risks/enterprise', findings: '/api/findings', assets: '/api/assets', risks: '/api/risks', integrations: '/api/integrations', remediation: '/api/remediation' };
  const entries = await Promise.all(Object.entries(endpointMap).map(async ([key, path]) => [key, await optionalGet(path)] as const));
  const data = Object.fromEntries(entries);
  if (!data.enterprise) throw new Error('Current dashboard risk data is unavailable; PDF generation was stopped.');
  const generatedAt = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  addBrandHeader(doc, workspace === 'executive' ? 'Executive Cyber Risk Report' : 'Technical Security Operations Report', `${reportName} | Current organization scope | Evidence-based snapshot`);
  if (workspace === 'executive') executiveReport(doc, data); else technicalReport(doc, data);
  addFooter(doc, generatedAt, workspace);
  doc.setProperties({ title: reportName, subject: workspace === 'executive' ? 'Executive cyber-risk and financial exposure' : 'Technical security operations and evidence', author: 'CRISPR Security Intelligence Platform', creator: 'CRISPR' });
  doc.save(`${safeName(reportName)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
