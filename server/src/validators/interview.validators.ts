import { z } from 'zod';

/**
 * Zod validation schemas for interview session-related request bodies.
 * Requirements: 2.1–2.5, 4.13
 */

export const createSessionSchema = z.object({
  role: z
    .string()
    .min(1, 'Role is required.')
    .max(100, 'Role must be at most 100 characters.'),
  experienceYears: z
    .number()
    .int('Experience years must be an integer.')
    .min(0, 'Experience years must be at least 0.')
    .max(30, 'Experience years must be at most 30.'),
  difficulty: z.enum(['Intern', 'Fresher', 'Junior', 'Mid', 'Senior', 'Staff', 'Principal'], {
    errorMap: () => ({ message: 'Difficulty must be one of: Intern, Fresher, Junior, Mid, Senior, Staff, Principal.' }),
  }),
  interviewType: z.enum(['HR', 'Technical', 'SystemDesign', 'Behavioral', 'Coding', 'Managerial', 'Mixed'], {
    errorMap: () => ({ message: 'Interview type must be one of: HR, Technical, SystemDesign, Behavioral, Coding, Managerial, Mixed.' }),
  }),
  techStack: z
    .array(z.string())
    .min(1, 'At least one tech stack item is required.'),
  language: z
    .string()
    .min(1, 'Language is required.'),
  questionCount: z
    .number()
    .int('Question count must be an integer.')
    .min(3, 'Question count must be at least 3.')
    .max(20, 'Question count must be at most 20.')
    .optional()
    .default(8),
  company: z
    .string()
    .min(1, 'Company must not be empty.')
    .optional(),
  personality: z
    .string()
    .min(1, 'Personality must not be empty.')
    .optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
