import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts'
import {
  Download, Share2, ArrowLeft, CheckCircle2, XCircle,
  Lightbulb, MessageSquare, Clock, Trophy, BookOpen, Sparkles, Brain, Award
} from 'lucide-react'

import api from '@/lib/axios'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// Skeleton removed
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionData {
  text: string
}

interface ResponseData {
  question: QuestionData
  transcript: string
  technicalScore: number
  communicationScore: number
  problemSolvingScore: number
  grammarScore: number
  aiNotes?: string
  strengths?: string[]
  improvements?: string[]
}

interface SessionData {
  role: string
  difficulty: string
  interviewType: string
  completedAt?: string
  company?: string
  personality?: string
  recruiterName?: string
  recruiterRole?: string
  recruiterTeam?: string
  recruiterExp?: number
  responses: ResponseData[]
}

interface ReportData {
  id: string
  overallScore: number
  technicalScore: number
  communicationScore: number
  confidenceScore: number
  grammarScore: number
  problemSolvingScore: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  hiringDecision?: string
  decisionExplanation?: string
  session: SessionData
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_REPORT: ReportData = {
  id: 'report-1',
  overallScore: 76,
  technicalScore: 78,
  communicationScore: 72,
  confidenceScore: 74,
  grammarScore: 80,
  problemSolvingScore: 75,
  hiringDecision: 'Lean Hire',
  decisionExplanation: 'The candidate demonstrated strong React skills and clear structures. Some minor stuttering was noted in technical design questions, and confidence levels dropped slightly under stressful grilling.',
  strengths: [
    'Clear explanation of React hooks and lifecycle',
    'Good use of technical terminology',
    'Structured problem-solving approach',
  ],
  weaknesses: [
    'Could provide more concrete examples',
    'Response length was slightly short',
  ],
  suggestions: [
    'Practice explaining complex concepts with real-world analogies',
    'Aim for 2-3 minute responses for technical questions',
    'Review system design fundamentals',
  ],
  session: {
    role: 'Frontend Engineer',
    difficulty: 'Medium',
    interviewType: 'Technical',
    completedAt: new Date().toISOString(),
    company: 'Google',
    personality: 'Friendly',
    recruiterName: 'Emily Carter',
    recruiterRole: 'Senior Software Engineer',
    recruiterTeam: 'Google Search (11 Years Exp)',
    responses: [
      {
        question: { text: 'Explain the difference between useEffect and useLayoutEffect in React.' },
        transcript: 'useEffect runs asynchronously after the render is committed to the screen, while useLayoutEffect runs synchronously after all DOM mutations...',
        technicalScore: 80,
        communicationScore: 75,
        problemSolvingScore: 78,
        grammarScore: 82,
        aiNotes: 'Excellent grasp of React rendering phases. Answer was technically accurate and structured well.',
      },
      {
        question: { text: 'How would you optimize a React application with performance issues?' },
        transcript: 'I would start by profiling the app with React DevTools to identify bottlenecks, then consider memoization with useMemo and useCallback...',
        technicalScore: 76,
        communicationScore: 70,
        problemSolvingScore: 72,
        grammarScore: 78,
        aiNotes: 'Solid understanding of client side profiling tools. Could benefit from mentioning bundle size optimizations like dynamic code splitting.',
      },
    ],
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-500/15'
  if (score >= 60) return 'bg-yellow-500/15'
  return 'bg-red-500/15'
}

function scoreBarColor(score: number) {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-yellow-500'
  return 'bg-red-500'
}

// ─── Hiring Decision Configuration ───────────────────────────────────────────

const DECISION_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any; explanation: string }> = {
  'Strong Hire': {
    label: 'Strong Hire',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    icon: Trophy,
    explanation: 'Highly recommended. Candidate met or exceeded standard expectations across all core rubrics.',
  },
  'Hire': {
    label: 'Hire',
    bg: 'bg-green-500/15',
    text: 'text-green-400',
    border: 'border-green-500/30',
    icon: CheckCircle2,
    explanation: 'Recommended. Strong overall fundamentals with minor room for growth.',
  },
  'Lean Hire': {
    label: 'Lean Hire',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    icon: Sparkles,
    explanation: 'Satisfactory. Recommended with some reservations; core competency is present, but needs coaching.',
  },
  'Lean No Hire': {
    label: 'Lean No Hire',
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    icon: XCircle,
    explanation: 'Not recommended. Below expectations in critical focus areas, though showing potential.',
  },
  'No Hire': {
    label: 'No Hire',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    icon: XCircle,
    explanation: 'Rejected. Performance was significantly below acceptable thresholds for this level.',
  },
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - score / 100)

  const color =
    score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171'

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
        <motion.circle
          cx="72" cy="72" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute text-center">
        <motion.span
          className={cn('text-3xl font-extrabold tabular-nums', scoreColor(score))}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          {score}
        </motion.span>
        <p className="text-xs text-gray-500 mt-0.5">/ 100</p>
      </div>
    </div>
  )
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-300 w-36 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', scoreBarColor(score))}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
      <span className={cn('text-sm font-bold w-8 text-right tabular-nums', scoreColor(score))}>
        {score}
      </span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pollCount, setPollCount] = useState(0)

  // Poll until report is available (max 10 times × 3s = 30s)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    let attempts = 0

    async function poll() {
      try {
        const { data } = await api.get(`/report/${id}`)
        if (!cancelled) {
          setReport(data)
          setLoading(false)
        }
      } catch {
        attempts++
        setPollCount(attempts)
        if (attempts < 10 && !cancelled) {
          setTimeout(poll, 3000)
        } else if (!cancelled) {
          // Fall back to mock after polling exhausted
          setReport(MOCK_REPORT)
          setLoading(false)
        }
      }
    }

    poll()
    return () => { cancelled = true }
  }, [id])

  async function handleDownloadPDF() {
    try {
      const res = await api.get(`/report/${id}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `apex-report-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast({ title: 'PDF export requires a Pro plan', variant: 'destructive' })
    }
  }

  async function handleShare() {
    try {
      const { data } = await api.post(`/report/${id}/share`)
      await navigator.clipboard.writeText(data.shareUrl)
      toast({ title: '🔗 Share link copied to clipboard!' })
    } catch {
      toast({ title: 'Shareable links require a Pro plan', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="relative w-20 h-20 mx-auto">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-violet-500/30"
            />
            <div className="absolute inset-2 rounded-full bg-violet-600/70 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                className="w-7 h-7 rounded-full border-4 border-white/20 border-t-white"
              />
            </div>
          </div>
          <p className="text-white font-semibold text-lg">Generating your report...</p>
          <p className="text-gray-400 text-sm">
            {pollCount > 0 ? `Attempt ${pollCount}/10 — please wait` : 'Analyzing your responses'}
          </p>
        </motion.div>
      </div>
    )
  }

  if (!report) return null

  const radarData = [
    { subject: 'Technical', value: report.technicalScore },
    { subject: 'Communication', value: report.communicationScore },
    { subject: 'Confidence', value: report.confidenceScore },
    { subject: 'Grammar', value: report.grammarScore },
    { subject: 'Problem Solving', value: report.problemSolvingScore },
  ]

  const scoreBreakdown = [
    { label: 'Technical', score: report.technicalScore },
    { label: 'Communication', score: report.communicationScore },
    { label: 'Confidence', score: report.confidenceScore },
    { label: 'Grammar & Fluency', score: report.grammarScore },
    { label: 'Problem Solving', score: report.problemSolvingScore },
  ]

  // Parse hiring decision details
  const decision = report.hiringDecision ?? 'Lean Hire'
  const config = DECISION_CONFIG[decision] ?? DECISION_CONFIG['Lean Hire']
  const DecisionIcon = config.icon

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Interview Report</h1>
            <p className="text-sm text-gray-400 mt-1">
              {report.session.role} · {report.session.difficulty} · {report.session.interviewType}
              {report.session.completedAt && (
                <> · {new Date(report.session.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 gap-1.5"
            >
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 gap-1.5"
            >
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
        </motion.div>

        {/* ── Hiring Decision Badge Panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <Card className={cn("bg-gradient-to-r border shadow-lg overflow-hidden", 
            decision.includes('No') ? 'from-red-950/20 via-slate-900 to-slate-900 border-red-500/25' : 
            decision.includes('Lean') ? 'from-yellow-950/20 via-slate-900 to-slate-900 border-yellow-500/25' :
            'from-emerald-950/20 via-slate-900 to-slate-900 border-emerald-500/25'
          )}>
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-5">
              <div className={cn("p-4 rounded-2xl flex items-center justify-center shrink-0 border", config.bg, config.border)}>
                <DecisionIcon className={cn("h-10 w-10", config.text)} />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Recruiter Verdict</span>
                  <span className={cn("text-xs px-2.5 py-0.5 rounded-full border font-bold", config.bg, config.text, config.border)}>
                    {config.label}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">
                  Hiring Decision: <span className={config.text}>{config.label}</span>
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {report.decisionExplanation ?? config.explanation}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Overall Score + Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
                {/* Score ring */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <ScoreRing score={report.overallScore} />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-200">Overall Score</p>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <Trophy className={cn('h-4 w-4', scoreColor(report.overallScore))} />
                      <span className={cn('text-xs font-medium', scoreColor(report.overallScore))}>
                        {report.overallScore >= 80 ? 'Excellent' : report.overallScore >= 60 ? 'Good' : 'Needs Work'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score bars */}
                <div className="flex-1 w-full space-y-3">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4">Score Breakdown</h3>
                  {scoreBreakdown.map((item) => (
                    <ScoreBar key={item.label} label={item.label} score={item.score} />
                  ))}
                </div>

                {/* Radar chart */}
                <div className="shrink-0 w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} isAnimationActive animationDuration={800} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Recruiter Notebook Logs Panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                <CardTitle className="text-white text-base">Recruiter's Private Notebook</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Detailed notes logged by {report.session.recruiterName ?? 'the recruiter'} during response evaluation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.session.responses.map((resp, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Log #{idx + 1}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      Q: {resp.question.text.slice(0, 40)}...
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {(report.session.recruiterName ?? 'R').charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs italic text-slate-400 font-medium">{report.session.recruiterName ?? 'Recruiter'} note:</p>
                      <p className="text-sm text-slate-200 mt-1">
                        {resp.aiNotes ?? 'Candidate answered clearly. Focused on core requirements but had some slight gaps in optimization details.'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Strengths & Weaknesses */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.strengths.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-start gap-2 text-sm text-gray-300"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  {s}
                </motion.div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-400" /> Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.weaknesses.map((w, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-start gap-2 text-sm text-gray-300"
                >
                  <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  {w}
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Continue with AI Coach (Sandbox Activation) ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card className="relative overflow-hidden bg-gradient-to-r from-violet-900/30 via-slate-900 to-slate-900 border border-violet-500/25 shadow-lg">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold">
                  <Brain className="h-3 w-3" />
                  Interactive AI Sandbox
                </div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Activate AI Coach
                </h3>
                <p className="text-sm text-slate-300 max-w-xl">
                  Ready to fix those weak spots? Jump into the AI Sandbox to practice alternative explanations, target specific failures, and practice customized mock questions based on this interview's notes.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/interview/new')}
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-2 shrink-0 shadow-lg shadow-violet-900/30"
              >
                <Award className="h-4 w-4" /> Start Sandbox Prep
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-violet-400" /> Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.suggestions.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-start gap-3 p-3 rounded-lg border border-violet-500/20 bg-violet-500/5"
                >
                  <Lightbulb className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-300">{s}</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Q&A Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-400" /> Question & Answer Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {report.session.responses.map((r, i) => {
                const avgScore = Math.round(
                  (r.technicalScore + r.communicationScore + r.problemSolvingScore + r.grammarScore) / 4
                )
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="relative pl-8 border-l-2 border-gray-800 last:border-0"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-violet-500 bg-gray-900" />

                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Badge variant="outline" className="text-xs border-gray-700 text-gray-400 mb-2">
                            Question {i + 1}
                          </Badge>
                          <p className="text-sm font-medium text-white">{r.question.text}</p>
                        </div>
                        <span className={cn(
                          'shrink-0 inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold min-w-[3rem]',
                          scoreBg(avgScore), scoreColor(avgScore)
                        )}>
                          {avgScore}
                        </span>
                      </div>

                      {r.transcript && (
                        <div className="rounded-lg bg-gray-800/60 p-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <MessageSquare className="h-3 w-3 text-gray-500" />
                            <span className="text-xs text-gray-500 font-medium">Your Answer</span>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">{r.transcript}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {[
                          { l: 'Technical', v: r.technicalScore },
                          { l: 'Communication', v: r.communicationScore },
                          { l: 'Problem Solving', v: r.problemSolvingScore },
                          { l: 'Grammar', v: r.grammarScore },
                        ].map(({ l, v }) => (
                          <span
                            key={l}
                            className={cn('text-xs px-2 py-0.5 rounded-full font-medium', scoreBg(v), scoreColor(v))}
                          >
                            {l}: {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap gap-3 justify-center pb-8"
        >
          <Link to="/interview/new">
            <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
              Start New Interview
            </Button>
          </Link>
          <Link to="/history">
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 gap-2">
              View History
            </Button>
          </Link>
        </motion.div>

      </div>
    </div>
  )
}
