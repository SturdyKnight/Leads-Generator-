/**
 * Excel export for a set of leads. Shared by the campaign and session export
 * routes, which previously carried identical 120-line copies of this.
 */

import ExcelJS from 'exceljs';
import type { Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

const COLUMNS = [
  { header: 'Name', key: 'name', width: 32 },
  { header: 'Status', key: 'status', width: 16 },
  { header: 'Score', key: 'score', width: 8 },
  { header: 'Phone', key: 'phone', width: 18 },
  { header: 'Website', key: 'website', width: 34 },
  { header: 'Address', key: 'address', width: 42 },
  { header: 'City', key: 'city', width: 16 },
  { header: 'State', key: 'state', width: 16 },
  { header: 'Rating', key: 'rating', width: 9 },
  { header: 'Reviews', key: 'reviewCount', width: 10 },
  { header: 'Categories', key: 'categories', width: 30 },
  { header: 'Notes', key: 'notes', width: 40 },
  { header: 'Contacted', key: 'contactedAt', width: 14 },
  { header: 'Discovered', key: 'createdAt', width: 14 },
];

const HEADER_FILL = 'FF1E293B';
const BORDER_COLOR = 'FFE2E8F0';

/**
 * Stream matching leads to the response as .xlsx.
 *
 * Headers are written before the workbook starts streaming, so a failure raised
 * from here has not yet sent anything — the error handler can still respond.
 */
export async function streamLeadWorkbook(
  res: Response,
  where: Prisma.LeadWhereInput,
  filenameBase: string,
): Promise<void> {
  const leads = await prisma.lead.findMany({ where, orderBy: { score: 'desc' } });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'B-Matrix';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Leads');
  sheet.columns = COLUMNS;

  for (const lead of leads) {
    sheet.addRow({
      name: lead.name,
      status: lead.status.replace(/_/g, ' '),
      score: lead.score,
      phone: lead.phone ?? '',
      website: lead.website ?? '',
      address: lead.address ?? '',
      city: lead.city ?? '',
      state: lead.state ?? '',
      rating: lead.rating ?? '',
      reviewCount: lead.reviewCount ?? 0,
      categories: parseCategories(lead.categories).join(', '),
      notes: lead.notes ?? '',
      contactedAt: formatDate(lead.contactedAt),
      createdAt: formatDate(lead.createdAt),
    });
  }

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  header.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER_COLOR } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } },
      };
      if (rowNumber > 1) cell.alignment = { vertical: 'top', wrapText: true };
    });
  });

  const filename = `${slugify(filenameBase)}-leads-${new Date().toISOString().slice(0, 10)}.xlsx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
}

function parseCategories(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : '';
}

function slugify(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'export';
}
