import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';
import { withRetry } from '../../utils/retry';
import type { IAIEngine, QuestionContext, Evaluation, EvalContext } from '../../interfaces/IAIEngine';

export class GeminiClient implements IAIEngine {
  private client: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor() {
    this.client = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    this.model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generateQuestion(ctx: QuestionContext): Promise<{ text: string }> {
    const name = ctx.recruiterName || 'Emily Carter';
    const roleTitle = ctx.recruiterRole || 'Senior Software Engineer';
    const company = ctx.company || 'Google';
    const personality = ctx.personality || 'Professional';
    const phase = ctx.currentPhase || 'Warm-up';

    let companyDna = '';
    const compLower = company.toLowerCase();
    if (compLower.includes('google')) {
      companyDna = `Google DNA Focus: Core Algorithms, computational complexity (Big O notation), scaling, performance, and Googleyness. Act calm, technical, and analytical.`;
    } else if (compLower.includes('amazon')) {
      companyDna = `Amazon DNA Focus: Amazon Leadership Principles (such as Ownership, Customer Obsession, Deep Dive). Seek data points, business metrics, and answers structured in the STAR (Situation, Task, Action, Result) method.`;
    } else if (compLower.includes('microsoft')) {
      companyDna = `Microsoft DNA Focus: Collaborative problem solving, robust architecture design, system thinking, and engineering trade-offs.`;
    } else if (compLower.includes('startup')) {
      companyDna = `Startup DNA Focus: Founder mindset, rapid shipping speeds, absolute product ownership, and scrappy engineering decisions.`;
    } else {
      companyDna = `General Recruiter Focus: Clear communication, basic engineering design, confidence, and career alignment.`;
    }

    let historyString = '';
    if (ctx.history && ctx.history.length > 0) {
      historyString = ctx.history
        .map((h, i) => `[Question ${i + 1}]: ${h.question}\n[Candidate Answer ${i + 1}]: ${h.answer}`)
        .join('\n\n');
    }

    const prompt = `You are ${name}, a ${roleTitle} at ${company} in the team ${ctx.recruiterTeam || 'Core Systems'}.
Your interviewer personality is "${personality}" (Experience: ${ctx.recruiterExp || 10} Years).
You are mock-interviewing a candidate for the position of "${ctx.role}" (Difficulty level: ${ctx.difficulty || 'Mid'}).
The technology stack for this interview is: ${ctx.techStack.join(', ')}.
The interview language is: ${ctx.language}.
${ctx.candidateName ? `The candidate's name is: ${ctx.candidateName}.` : ''}

${companyDna}

Current Interview Phase: "${phase}"
Phases:
- Introduction: Greet the candidate warmly${ctx.candidateName ? ` by name ("${ctx.candidateName}")` : ''}, mention their name, explain the setup, and ask "Shall we begin?". (Do NOT ask a technical question in this phase. Wait for user consent).
- Warm-up: Ask general warm-up questions (e.g. "Tell me about yourself" or "What motivated you to apply?").
- Technical: Ask a core technical question matching their tech stack.
- Deep Technical: Drill down into their previous technical choices. Ask "Why did you choose X over Y?" or challenge their design decisions.
- Behavioral: Ask a behavioral question mapping to team collaboration, leadership, or challenges.
- Scenario-Based: Ask about scaling their project (e.g. "Suppose traffic increases 100x or to 2 million users, how will you redesign it?").
- Candidate Questions: Ask: "Do you have any questions for me?"
- Closing: Give closing recruiter remarks and wrap up.

---
CONVERSATION HISTORY SO FAR:
${historyString || 'No history yet (Beginning of interview)'}
---
LAST CANDIDATE RESPONSE:
"${ctx.previousTranscript || 'No response yet'}"

INSTRUCTIONS:
1. Act strictly in-character as ${name}. Do not break character.
2. Generate exactly ONE response or question suitable for the current phase "${phase}". Keep it natural, conversational, and direct, as if speaking on a Zoom call.
3. Memory Engine: Actively scan the Conversation History. Reference details they mentioned in earlier answers (e.g. if they mentioned building an e-commerce platform or a Netflix Clone in Q1, bring it up later in Scenario/Deep Technical phase).
4. Recruiter Behaviors:
   - Use soft verbal cues when starting your turn ("Hmm...", "Interesting...", "Nice.", "Fair enough.").
   - If they are doing well, apply stress level questioning: "Are you sure about that?", "Can you justify that choice?", "Why?".
   - If they say they don't know, be supportive: "That's alright. Let's approach it differently. Imagine..."
5. Return ONLY the spoken recruiter text, nothing else. Do not wrap in JSON, brackets, or XML tags.`;

    return withRetry(async () => {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text().trim();
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
        aiNotes: '⚠ Candidate remained silent.',
      };
    }

    const prompt = `Evaluate this interview response. Return valid JSON only, no markdown code blocks.
Question: ${ctx.questionText}
Role: ${ctx.role}, Difficulty: ${ctx.difficulty}
Phase: ${ctx.currentPhase || 'Technical'}
Candidate Response: ${transcript.substring(0, 2000)}

JSON format:
{
  "technicalScore": 0-100,
  "communicationScore": 0-100,
  "problemSolvingScore": 0-100,
  "grammarScore": 0-100,
  "strengths": ["..."],
  "improvements": ["..."],
  "aiNotes": "A short recruiter-style notebook comment (e.g., '✔ Good React claims, ⚠ Unsure about CDN caching, ✔ Good confidence')"
}

Rules:
- Each score must be an integer between 0 and 100.
- Include at least 1 strength and 1 improvement.
- Ensure 'aiNotes' captures quick notes exactly like an interviewer's notebook (using ✔ for positive points and ⚠ for weak/hesitant points).`;

    return withRetry(async () => {
      const result = await this.model.generateContent(prompt);
      const raw = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(raw) as Evaluation;
      return {
        technicalScore: Math.min(100, Math.max(0, parsed.technicalScore)),
        communicationScore: Math.min(100, Math.max(0, parsed.communicationScore)),
        problemSolvingScore: Math.min(100, Math.max(0, parsed.problemSolvingScore)),
        grammarScore: Math.min(100, Math.max(0, parsed.grammarScore)),
        strengths: parsed.strengths?.length ? parsed.strengths : ['Attempted to answer'],
        improvements: parsed.improvements?.length ? parsed.improvements : ['Provide more detail'],
        aiNotes: parsed.aiNotes || '✔ Attempted response.',
      };
    });
  }

  async generateDashboardSuggestions(recentRoles: string[], avgScores: number[]): Promise<string[]> {
    const avgScore = avgScores.length
      ? avgScores.reduce((a, b) => a + b, 0) / avgScores.length
      : 0;

    const prompt = `Give 2-3 short, actionable interview preparation suggestions for someone who has been practicing for: ${recentRoles.slice(0, 3).join(', ')} roles, with an average score of ${Math.round(avgScore)}/100. Return a JSON array of strings only. Example: ["Practice system design", "Work on communication clarity"]`;

    return withRetry(async () => {
      const result = await this.model.generateContent(prompt);
      const raw = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
      const suggestions = JSON.parse(raw) as string[];
      return suggestions.slice(0, 3);
    }).catch(() => [
      'Practice regularly',
      'Review common interview questions',
      'Work on clear communication',
    ]);
  }
}
