import OpenAI from 'openai';
import { config } from '../../config';
import { withRetry } from '../../utils/retry';
import type { IAIEngine, QuestionContext, Evaluation, EvalContext } from '../../interfaces/IAIEngine';

export class OpenAIClient implements IAIEngine {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }

  async generateQuestion(ctx: QuestionContext): Promise<{ text: string }> {
    const prompt = `You are an expert technical interviewer. Generate ONE interview question for:
Role: ${ctx.role}
Experience: ${ctx.experienceYears} years
Difficulty: ${ctx.difficulty}
Type: ${ctx.interviewType}
Tech Stack: ${ctx.techStack.join(', ')}
Language: ${ctx.language}
Question number: ${ctx.questionIndex + 1}
${ctx.previousTranscript ? `Previous answer context: ${ctx.previousTranscript.substring(0, 500)}` : ''}

Return ONLY the question text, nothing else.`;

    return withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.choices[0]?.message?.content?.trim() ?? '';
      return { text };
    });
  }

  async evaluateResponse(transcript: string, ctx: EvalContext): Promise<Evaluation> {
    if (!transcript || transcript.trim().length === 0) {
      return {
        technicalScore: 0,
        communicationScore: 0,
        problemSolvingScore: 0,
        grammarScore: 0,
        strengths: [],
        improvements: ['No response provided'],
      };
    }

    const prompt = `Evaluate this interview response.
Question: ${ctx.questionText}
Role: ${ctx.role}, Difficulty: ${ctx.difficulty}
Response: ${transcript.substring(0, 2000)}

Return a JSON object with these fields: technicalScore (0-100), communicationScore (0-100), problemSolvingScore (0-100), grammarScore (0-100), strengths (array of strings), improvements (array of strings).
Rules: each score must be 0-100, include at least 1 strength and 1 improvement.`;

    return withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
      const raw = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw) as Evaluation;
      // Clamp scores to valid range and ensure arrays are non-empty
      return {
        technicalScore: Math.min(100, Math.max(0, parsed.technicalScore)),
        communicationScore: Math.min(100, Math.max(0, parsed.communicationScore)),
        problemSolvingScore: Math.min(100, Math.max(0, parsed.problemSolvingScore)),
        grammarScore: Math.min(100, Math.max(0, parsed.grammarScore)),
        strengths: parsed.strengths?.length ? parsed.strengths : ['Attempted to answer'],
        improvements: parsed.improvements?.length ? parsed.improvements : ['Provide more detail'],
      };
    });
  }

  async generateDashboardSuggestions(recentRoles: string[], avgScores: number[]): Promise<string[]> {
    const avgScore = avgScores.length
      ? avgScores.reduce((a, b) => a + b, 0) / avgScores.length
      : 0;

    const prompt = `Give 2-3 short, actionable interview preparation suggestions for someone who has been practicing for: ${recentRoles.slice(0, 3).join(', ')} roles, with an average score of ${Math.round(avgScore)}/100. Return a JSON object with a "suggestions" field containing an array of strings. Example: {"suggestions": ["Practice system design", "Work on communication clarity"]}`;

    return withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
      const raw = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw) as { suggestions?: string[] };
      const suggestions = parsed.suggestions ?? [];
      return suggestions.slice(0, 3);
    }).catch(() => [
      'Practice regularly',
      'Review common interview questions',
      'Work on clear communication',
    ]);
  }
}
