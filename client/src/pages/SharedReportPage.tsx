import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts'
import {
  CheckCircle2, XCircle, Lightbulb, Trophy, Brain, Award, Sparkles
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import api from '@/lib/axios'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionData { text: string }
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
  recruiterName?: string
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 80) return 'text-emerald-400'
  if (s >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

function decisionStyle(d?: string) {
  if (!d) return { bg: 'bg-slate-700', text: 'text-slate-300' }
  if (d === 'Strong Hire') return { bg: 'bg-emerald-900/60', text: 'text-emerald-300' }
  if (d === 'Hire')        return { bg: 'bg-green-900/60',   text: 'text-green-300' }
  if (d === 'Lean Hire')   return { bg: 'bg-yellow-900/60',  text: 'text-yellow-300' }
  if (d === 'Lean No Hire') return { bg: 'bg-orange-900/60', text: 'text-orange-300' }
  return { bg: 'bg-red-900/60', text: 'text-red-300' }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    api.get<ReportData>(`/shared/${token}`)
      .then(r => setReport(r.data))
      .catch(err => {
        const msg = err?.response?.data?.message || 'Report not found or link has expired.'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [token])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <XCircle className="text-red-400 w-16 h-16" />
        <h1 className="text-2xl font-bold text-white">Link Expired or Invalid</h1>
        <p className="text-slate-400 max-w-sm">{error}</p>
        <Link to="/" className="mt-4 px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors">
          Go to APEX.AI
        </Link>
      </div>
    )
  }

  const { session } = report
  const radarData = [
    { subject: 'Technical',    value: report.technicalScore },
    { subject: 'Communication', value: report.communicationScore },
    { subject: 'Confidence',   value: report.confidenceScore },
    { subject: 'Grammar',      value: report.grammarScore },
    { subject: 'Problem Solving', value: report.problemSolvingScore },
  ]
  const decStyle = decisionStyle(report.hiringDecision)

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0d1326]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="text-violet-400 w-6 h-6" />
            <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              APEX.AI
            </span>
            <span className="text-slate-500 text-sm ml-2">Shared Interview Report</span>
          </div>
          <Link to="/" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
            Try APEX.AI →
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Title block */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-1">
            {session.role} Interview Report
          </h1>
          <p className="text-slate-400 text-sm">
            {session.company && `${session.company} · `}
            {session.difficulty} · {session.interviewType}
            {session.completedAt && ` · ${new Date(session.completedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}`}
          </p>
        </motion.div>

        {/* Overall score + hiring decision */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-[#0d1326] border-white/10">
            <CardContent className="pt-6 text-center">
              <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <div className={cn('text-6xl font-black', scoreColor(report.overallScore))}>
                {report.overallScore}
                <span className="text-2xl text-slate-400">/100</span>
              </div>
              <p className="text-slate-400 mt-1 text-sm">Overall Score</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0d1326] border-white/10">
            <CardContent className="pt-6">
              <div className={cn('rounded-lg px-4 py-3 mb-3', decStyle.bg)}>
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-5 h-5" />
                  <span className={cn('font-bold text-lg', decStyle.text)}>
                    {report.hiringDecision ?? 'N/A'}
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed line-clamp-4">
                  {report.decisionExplanation}
                </p>
              </div>
              {session.recruiterName && (
                <p className="text-slate-500 text-xs">— {session.recruiterName}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Radar chart */}
        <Card className="bg-[#0d1326] border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-sm font-semibold">Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} />
                <Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
            {/* Score pills */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
              {[
                { label: 'Technical', val: report.technicalScore },
                { label: 'Communication', val: report.communicationScore },
                { label: 'Confidence', val: report.confidenceScore },
                { label: 'Grammar', val: report.grammarScore },
                { label: 'Problem Solving', val: report.problemSolvingScore },
              ].map(({ label, val }) => (
                <div key={label} className="text-center bg-white/5 rounded-lg py-2 px-1">
                  <div className={cn('text-2xl font-bold', scoreColor(val))}>{val}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Strengths / Weaknesses / Suggestions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#0d1326] border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-emerald-400 text-sm font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {report.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400 mt-0.5">•</span> {s}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-[#0d1326] border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-400 text-sm font-semibold flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Weaknesses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {report.weaknesses.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-red-400 mt-0.5">•</span> {w}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-[#0d1326] border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-400 text-sm font-semibold flex items-center gap-1">
                <Lightbulb className="w-4 h-4" /> Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {report.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-yellow-400 mt-0.5">•</span> {s}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Q&A Timeline */}
        {session.responses.length > 0 && (
          <Card className="bg-[#0d1326] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" /> Q&amp;A Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {session.responses.map((r, i) => (
                <div key={i} className="border border-white/5 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-slate-300 text-sm font-medium">Q{i + 1}: {r.question.text}</p>
                    <Badge variant="outline" className={cn('shrink-0', scoreColor(r.technicalScore))}>
                      {Math.round((r.technicalScore + r.communicationScore + r.problemSolvingScore + r.grammarScore) / 4)}/100
                    </Badge>
                  </div>
                  <p className="text-slate-500 text-xs italic mb-2 line-clamp-3">"{r.transcript}"</p>
                  {r.aiNotes && (
                    <p className="text-xs text-violet-400/80">{r.aiNotes}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Footer CTA */}
        <div className="text-center pt-4 pb-8">
          <p className="text-slate-500 text-sm mb-3">Want to practice interviews with AI?</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white rounded-xl font-semibold transition-all shadow-lg"
          >
            <Brain className="w-4 h-4" />
            Try APEX.AI for Free
          </Link>
        </div>
      </div>
    </div>
  )
}
