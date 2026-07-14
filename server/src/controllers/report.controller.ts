import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/ReportService';
import { generateReportPDF } from '../lib/pdf';
import { ForbiddenError } from '../utils/errors';
import { prisma } from '../lib/prisma';

export async function getReportController(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await reportService.getReport(req.params['id'] as string, req.userId);
    res.json(report);
  } catch (err) { next(err); }
}

export async function getReportPDFController(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await reportService.getReport(req.params['id'] as string, req.userId);

    // Enforce Pro plan for PDF export
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { planId: true } });
    const plan = await prisma.plan.findUniqueOrThrow({ where: { id: user.planId }, select: { pdfExportEnabled: true } });
    if (!plan.pdfExportEnabled) throw new ForbiddenError('PDF export requires a Pro plan.');

    const pdfBuffer = await generateReportPDF({
      role: report.session.role,
      difficulty: report.session.difficulty,
      interviewType: report.session.interviewType,
      completedAt: report.session.completedAt,
      overallScore: report.overallScore,
      technicalScore: report.technicalScore,
      communicationScore: report.communicationScore,
      confidenceScore: report.confidenceScore,
      grammarScore: report.grammarScore,
      problemSolvingScore: report.problemSolvingScore,
      strengths: report.strengths,
      weaknesses: report.weaknesses,
      suggestions: report.suggestions,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${report.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
}

export async function shareReportController(req: Request, res: Response, next: NextFunction) {
  try {
    const shareUrl = await reportService.generateShareToken(req.params['id'] as string, req.userId);
    res.json({ shareUrl });
  } catch (err) { next(err); }
}

export async function getSharedReportController(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await reportService.getReportByShareToken(req.params['token'] as string);
    res.json(report);
  } catch (err) { next(err); }
}
