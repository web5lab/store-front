import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, PageOrientation, AlignmentType, ShadingType } from 'docx';

/**
 * Every report leaves the building in three shapes from one description:
 *   { title, subtitle, columns: [{ header, key, type?: 'money'|'number'|'date'|'text' }], rows, totals? }
 */

export const FORMATS = {
    xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' },
    pdf: { mime: 'application/pdf', ext: 'pdf' },
    docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' },
};

const INK = '14213D';

function display(value, type) {
    if (value === null || value === undefined || value === '') return '';
    if (type === 'money') return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (type === 'number') return Number(value).toLocaleString('en-IN');
    if (type === 'date') return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return String(value);
}

export async function toXlsx(report) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Inventory';
    const ws = wb.addWorksheet(report.title.slice(0, 31));

    ws.addRow([report.title]).font = { bold: true, size: 14 };
    if (report.subtitle) ws.addRow([report.subtitle]).font = { color: { argb: 'FF6B7280' } };
    ws.addRow([]);

    const header = ws.addRow(report.columns.map((c) => c.header));
    header.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${INK}` } };
    });

    for (const row of report.rows) {
        ws.addRow(
            report.columns.map((c) => {
                const v = row[c.key];
                if (c.type === 'money' || c.type === 'number') return v === '' || v == null ? null : Number(v);
                if (c.type === 'date') return v ? new Date(v) : null;
                return v ?? '';
            })
        );
    }
    if (report.totals) {
        const t = ws.addRow(report.columns.map((c, i) => (i === 0 ? 'Total' : report.totals[c.key] ?? null)));
        t.font = { bold: true };
    }

    report.columns.forEach((c, i) => {
        const col = ws.getColumn(i + 1);
        col.width = Math.max(12, c.header.length + 4, c.type === 'text' || !c.type ? 22 : 14);
        if (c.type === 'money') col.numFmt = '#,##0.00';
        if (c.type === 'date') col.numFmt = 'dd-mmm-yyyy';
    });

    return Buffer.from(await wb.xlsx.writeBuffer());
}

export function toPdf(report) {
    return new Promise((resolve, reject) => {
        const wide = report.columns.length > 6;
        const doc = new PDFDocument({ size: 'A4', layout: wide ? 'landscape' : 'portrait', margin: 36 });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const left = doc.page.margins.left;
        const width = doc.page.width - left - doc.page.margins.right;
        const colW = width / report.columns.length;
        const rowH = 18;

        doc.fillColor(`#${INK}`).font('Helvetica-Bold').fontSize(16).text(report.title);
        if (report.subtitle) doc.moveDown(0.2).fillColor('#6B7280').font('Helvetica').fontSize(9).text(report.subtitle);
        doc.moveDown(0.8);

        const drawHeader = () => {
            const y = doc.y;
            doc.rect(left, y, width, rowH).fill(`#${INK}`);
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
            report.columns.forEach((c, i) => {
                const align = c.type === 'money' || c.type === 'number' ? 'right' : 'left';
                doc.text(c.header, left + i * colW + 4, y + 5, { width: colW - 8, align, lineBreak: false, ellipsis: true });
            });
            doc.y = y + rowH;
        };

        const drawRow = (values, { bold = false, shade = false } = {}) => {
            if (doc.y + rowH > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
                drawHeader();
            }
            const y = doc.y;
            if (shade) doc.rect(left, y, width, rowH).fill('#F2F4F7');
            doc.fillColor('#111827').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
            report.columns.forEach((c, i) => {
                const align = c.type === 'money' || c.type === 'number' ? 'right' : 'left';
                doc.text(values[i], left + i * colW + 4, y + 5, { width: colW - 8, align, lineBreak: false, ellipsis: true });
            });
            doc.moveTo(left, y + rowH).lineTo(left + width, y + rowH).lineWidth(0.4).strokeColor('#E5E7EB').stroke();
            doc.y = y + rowH;
        };

        drawHeader();
        report.rows.forEach((row, n) => drawRow(report.columns.map((c) => display(row[c.key], c.type)), { shade: n % 2 === 1 }));
        if (report.totals) {
            drawRow(report.columns.map((c, i) => (i === 0 ? 'Total' : display(report.totals[c.key], c.type))), { bold: true });
        }
        if (!report.rows.length) doc.moveDown().fillColor('#6B7280').font('Helvetica').fontSize(9).text('No records in this period.', left);

        doc.end();
    });
}

export async function toDocx(report) {
    const cell = (value, { header = false, right = false } = {}) =>
        new TableCell({
            shading: header ? { type: ShadingType.CLEAR, fill: INK, color: 'auto' } : undefined,
            children: [
                new Paragraph({
                    alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT,
                    children: [new TextRun({ text: String(value), bold: header, color: header ? 'FFFFFF' : '111827', size: 16 })],
                }),
            ],
        });

    const numeric = (c) => c.type === 'money' || c.type === 'number';
    const rows = [
        new TableRow({ tableHeader: true, children: report.columns.map((c) => cell(c.header, { header: true, right: numeric(c) })) }),
        ...report.rows.map((row) => new TableRow({ children: report.columns.map((c) => cell(display(row[c.key], c.type), { right: numeric(c) })) })),
    ];
    if (report.totals) {
        rows.push(
            new TableRow({
                children: report.columns.map((c, i) => cell(i === 0 ? 'Total' : display(report.totals[c.key], c.type), { right: numeric(c) })),
            })
        );
    }

    const doc = new Document({
        creator: 'Inventory',
        title: report.title,
        sections: [
            {
                properties: report.columns.length > 6 ? { page: { size: { orientation: PageOrientation.LANDSCAPE } } } : {},
                children: [
                    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: report.title, color: INK })] }),
                    ...(report.subtitle ? [new Paragraph({ children: [new TextRun({ text: report.subtitle, color: '6B7280', size: 18 })] })] : []),
                    new Paragraph({ text: '' }),
                    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
                ],
            },
        ],
    });
    return Packer.toBuffer(doc);
}

export function render(report, format) {
    if (format === 'xlsx') return toXlsx(report);
    if (format === 'pdf') return toPdf(report);
    if (format === 'docx') return toDocx(report);
    throw new Error(`Unknown format ${format}`);
}
