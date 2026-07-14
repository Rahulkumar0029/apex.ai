import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

interface ReportData {
  role: string;
  difficulty: string;
  interviewType: string;
  completedAt: Date | null;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  grammarScore: number;
  problemSolvingScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

/**
 * Generates a PDF buffer from report data using PDFKit.
 * Requirements: 7.4
 */
export async function generateReportPDF(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    const writable = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk as Buffer);
        callback();
      },
    });

    writable.on('finish', () => resolve(Buffer.concat(chunks)));
    writable.on('error', reject);
    doc.pipe(writable);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Apex.ai Interview Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').fillColor('#666666')
      .text(`Role: ${data.role}  |  Difficulty: ${data.difficulty}  |  Type: ${data.interviewType}`, { align: 'center' });
    if (data.completedAt) {
      doc.text(`Date: ${new Date(data.completedAt).toLocaleDateString()}`, { align: 'center' });
    }
    doc.moveDown();

    // Scores
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text('Scores');
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica');
    const scores = [
      ['Overall Score', data.overallScore],
      ['Technical', data.technicalScore],
      ['Communication', data.communicationScore],
      ['Confidence', data.confidenceScore],
      ['Grammar & Fluency', data.grammarScore],
      ['Problem Solving', data.problemSolvingScore],
    ] as [string, number][];
    scores.forEach(([label, score]) => {
      doc.text(`${label}: ${score}/100`);
    });
    doc.moveDown();

    // Strengths
    if (data.strengths.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Strengths');
      doc.moveDown(0.3);
      doc.fontSize(12).font('Helvetica');
      data.strengths.forEach((s) => doc.text(`• ${s}`));
      doc.moveDown();
    }

    // Areas for Improvement
    if (data.weaknesses.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Areas for Improvement');
      doc.moveDown(0.3);
      doc.fontSize(12).font('Helvetica');
      data.weaknesses.forEach((w) => doc.text(`• ${w}`));
      doc.moveDown();
    }

    // Suggestions
    if (data.suggestions.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Suggestions');
      doc.moveDown(0.3);
      doc.fontSize(12).font('Helvetica');
      data.suggestions.forEach((s) => doc.text(`• ${s}`));
    }

    doc.end();
  });
}
