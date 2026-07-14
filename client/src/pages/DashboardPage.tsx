import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  BarChart2, TrendingUp, Flame, Target, Plus, Lightbulb,
  Trophy, Zap, Star, ArrowRight, Clock, Brain, Code, Users,
} from 'lucide-react'

import api from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeeklyChartEntry {
  date: string
  avgScore: number
  count: number
}

interface RecentSession {
  id: string
  role: string
  difficulty: string
  completedAt: string
  overallScore: number
  company?: string
  interviewType?: string
}

interface DashboardData {
  totalInterviews: number
  avgScore: number
  streak: number
  weeklyChart: WeeklyChartEntry[]
  recentSessions: RecentSession[]
  suggestions: string[]
  streakMilestone: boolean
  xp?: number
  level?: number
  nextLevelXp?: number
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_DATA: DashboardData = {
  totalInterviews: 12,
  avgScore: 74,
  streak: 5,
  xp: 1240,
  level: 8,
  nextLevelXp: 1500,
  weeklyChart: [
    { date: 'Mon', avgScore: 65, count: 1 },
    { date: 'Tue', avgScore: 70, count: 2 },
    { date: 'Wed', avgScore: 68, count: 1 },
    { date: 'Thu', avgScore: 75, count: 1 },
    { date: 'Fri', avgScore: 80, count: 2 },
    { date: 'Sat', avgScore: 72, count: 1 },
    { date: 'Sun', avgScore: 78, count: 1 },
  ],
  recentSessions: [
    { id: '1', role: 'Frontend Engineer', difficulty: 'Medium', completedAt: new Date().toISOString(), overallScore: 78, company: 'Google', interviewType: 'Technical' },
    { id: '2', role: 'Full Stack Developer', difficulty: 'Hard', completedAt: new Date().toISOString(), overallScore: 65, company: 'Amazon', interviewType: 'SystemDesign' },
    { id: '3', role: 'React Developer', difficulty: 'Easy', completedAt: new Date().toISOString(), overallScore: 88, company: 'Microsoft', interviewType: 'Behavioral' },
  ],
  suggestions: [
    'Practice system design questions for senior-level interviews',
    'Work on explaining your thought process out loud',
    'Review common React patterns and hooks',
  ],
  streakMilestone: false,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// scoreColor removed

function scoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-500/15 text-emerald-400'
  if (score >= 60) return 'bg-yellow-500/15 text-yellow-400'
  return 'bg-red-500/15 text-red-400'
}

const COMPANY_COLORS: Record<string, string> = {
  Google: '#4285F4', Amazon: '#FF9900', Microsoft: '#00BCF2',
  Meta: '#0866FF', Apple: '#A2AAAD', Netflix: '#E50914',
}

// ─── Streak flame component ───────────────────────────────────────────────────

function StreakFlame({ streak }: { streak: number }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const today = new Date().getDay()
  // Convert Sunday=0 to Monday=0 index
  const todayIdx = (today + 6) % 7

  return (
    <div className="flex items-end gap-1.5">
      {days.map((day, i) => {
        const isActive = i <= todayIdx && i >= Math.max(0, todayIdx - streak + 1)
        const isToday = i === todayIdx
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 300 }}
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all',
                isActive
                  ? isToday
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-orange-500/30 text-orange-400 border border-orange-500/30'
                  : 'bg-slate-800/60 text-slate-600 border border-slate-700/30',
              )}
            >
              {isActive ? (isToday ? '🔥' : '✓') : '○'}
            </motion.div>
            <span className={`text-[9px] font-medium ${isActive ? 'text-orange-400' : 'text-slate-600'}`}>{day}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── XP Progress Bar ──────────────────────────────────────────────────────────

function XPBar({ xp, nextLevelXp, level }: { xp: number; nextLevelXp: number; level: number }) {
  const progress = Math.min(100, (xp / nextLevelXp) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-violet-900/40">
          {level}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-400">Level {level}</span>
          <span className="text-xs text-violet-400 font-medium">{xp} / {nextLevelXp} XP</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
      </div>
      <div className="shrink-0">
        <Zap className="h-4 w-4 text-violet-400" />
      </div>
    </div>
  )
}

// ─── Quick Practice Cards ─────────────────────────────────────────────────────

const PRACTICE_TYPES = [
  { label: '5-min Warm-up', desc: 'Behavioral basics', icon: Brain, color: 'from-blue-600/30 to-blue-700/20', accent: 'text-blue-400', border: 'border-blue-700/30', xp: '+50 XP' },
  { label: 'Technical Sprint', desc: 'Algorithm challenge', icon: Code, color: 'from-emerald-600/30 to-emerald-700/20', accent: 'text-emerald-400', border: 'border-emerald-700/30', xp: '+120 XP' },
  { label: 'Mock Interview', desc: 'Full simulation', icon: Users, color: 'from-violet-600/30 to-violet-700/20', accent: 'text-violet-400', border: 'border-violet-700/30', xp: '+200 XP' },
  { label: 'System Design', desc: 'Architect a solution', icon: Target, color: 'from-orange-600/30 to-orange-700/20', accent: 'text-orange-400', border: 'border-orange-700/30', xp: '+180 XP' },
]

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
  }),
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get<DashboardData>('/dashboard')
      return data
    },
    initialData: MOCK_DATA,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (data?.streakMilestone) {
      toast({ title: '🔥 Amazing! 7-day streak!', description: "Keep up the great work! You're on a roll." })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">Failed to load dashboard data.</p>
          <Button variant="outline" onClick={() => navigate(0)}>Retry</Button>
        </div>
      </div>
    )
  }

  const totalWeeklyInterviews = data?.weeklyChart.reduce((sum, d) => sum + d.count, 0) ?? 0

  const stats = [
    { label: 'Interviews Done', value: data?.totalInterviews ?? 0, icon: BarChart2, gradient: 'from-blue-600/20 to-blue-700/10', iconColor: 'text-blue-400', border: 'border-blue-700/20', sub: 'all time' },
    { label: 'Avg Score', value: `${data?.avgScore ?? 0}`, icon: TrendingUp, gradient: 'from-emerald-600/20 to-emerald-700/10', iconColor: 'text-emerald-400', border: 'border-emerald-700/20', sub: 'across sessions' },
    { label: 'Day Streak', value: `${data?.streak ?? 0} 🔥`, icon: Flame, gradient: 'from-orange-600/20 to-orange-700/10', iconColor: 'text-orange-400', border: 'border-orange-700/20', sub: 'keep it going!' },
    { label: 'This Week', value: `${totalWeeklyInterviews}`, icon: Target, gradient: 'from-violet-600/20 to-violet-700/10', iconColor: 'text-violet-400', border: 'border-violet-700/20', sub: 'interviews' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Hero Header ──────────────────────────────────────────────────────── */}
        <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}
          className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-900/40 via-slate-900 to-slate-950 border border-violet-700/20 p-6 md:p-8"
        >
          {/* BG glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-slate-400 text-sm mb-1">{getGreeting()},</p>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {user?.displayName ?? 'Candidate'} 👋
              </h1>
              <p className="text-slate-400 mt-1.5 text-sm max-w-md">
                You've done <span className="text-violet-300 font-semibold">{data?.totalInterviews ?? 0} interviews</span> so far.
                Keep pushing — your dream job is closer than you think.
              </p>

              {/* XP bar */}
              <div className="mt-4 max-w-xs">
                <XPBar xp={data?.xp ?? 0} nextLevelXp={data?.nextLevelXp ?? 1000} level={data?.level ?? 1} />
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-4">
              <Button
                onClick={() => navigate('/interview/new')}
                className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40 gap-2 font-semibold"
              >
                <Plus className="h-4 w-4" />
                New Interview
                <ArrowRight className="h-4 w-4" />
              </Button>
              {/* Streak calendar */}
              <StreakFlame streak={data?.streak ?? 0} />
            </div>
          </div>
        </motion.div>

        {/* ── Stats Row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-slate-900 border-slate-800">
                  <CardContent className="p-5"><Skeleton className="h-14 w-full bg-slate-800" /></CardContent>
                </Card>
              ))
            : stats.map((stat, i) => (
                <motion.div key={stat.label} initial="hidden" animate="visible" custom={i + 1} variants={fadeUp}>
                  <Card className={cn(`bg-gradient-to-br ${stat.gradient} border ${stat.border} hover:border-opacity-60 transition-all cursor-default`)}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <stat.icon className={cn('h-5 w-5', stat.iconColor)} />
                      </div>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-slate-400 mt-1 font-medium">{stat.label}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{stat.sub}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
          }
        </div>

        {/* ── Quick Practice + Streak Achievement ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Quick Practice */}
          <motion.div initial="hidden" animate="visible" custom={5} variants={fadeUp} className="lg:col-span-2">
            <Card className="bg-slate-900 border-slate-800 h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-violet-400" />
                    Quick Practice
                  </CardTitle>
                  <span className="text-xs text-slate-500">Earn XP for every session</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {PRACTICE_TYPES.map((pt, i) => (
                    <motion.button
                      key={pt.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      onClick={() => navigate('/interview/new')}
                      className={cn(
                        `flex flex-col items-start gap-2 p-4 rounded-2xl bg-gradient-to-br ${pt.color} border ${pt.border} hover:scale-[1.02] transition-all duration-200 group text-left`,
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <pt.icon className={cn('h-5 w-5', pt.accent)} />
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/20', pt.accent)}>{pt.xp}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{pt.label}</p>
                        <p className="text-xs text-slate-400">{pt.desc}</p>
                      </div>
                      <ArrowRight className={cn('h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity', pt.accent)} />
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Streak + Achievement */}
          <motion.div initial="hidden" animate="visible" custom={6} variants={fadeUp}>
            <Card className="bg-slate-900 border-slate-800 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-400" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Streak banner */}
                <div className={cn(
                  'rounded-2xl p-4 flex items-center gap-4',
                  (data?.streak ?? 0) >= 7
                    ? 'bg-gradient-to-r from-orange-600/30 to-red-600/20 border border-orange-700/30'
                    : 'bg-slate-800/60 border border-slate-700/30'
                )}>
                  <span className="text-4xl">🔥</span>
                  <div>
                    <p className="text-white font-bold text-xl leading-none">{data?.streak ?? 0} days</p>
                    <p className="text-xs text-slate-400 mt-1">Current Streak</p>
                    {(data?.streak ?? 0) < 7 && (
                      <p className="text-xs text-orange-400 mt-0.5">{7 - (data?.streak ?? 0)} more for milestone!</p>
                    )}
                  </div>
                </div>

                {/* Achievement badges */}
                {[
                  { icon: '🎯', label: 'First Interview', earned: (data?.totalInterviews ?? 0) >= 1 },
                  { icon: '⚡', label: '5 Sessions Done', earned: (data?.totalInterviews ?? 0) >= 5 },
                  { icon: '🏆', label: 'Score 80+', earned: (data?.avgScore ?? 0) >= 80 },
                  { icon: '🔥', label: '7-Day Streak', earned: (data?.streak ?? 0) >= 7 },
                ].map((badge) => (
                  <div
                    key={badge.label}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl transition-all',
                      badge.earned
                        ? 'bg-violet-500/10 border border-violet-500/20'
                        : 'bg-slate-800/40 border border-slate-700/20 opacity-50',
                    )}
                  >
                    <span className={`text-xl ${badge.earned ? '' : 'grayscale'}`}>{badge.icon}</span>
                    <span className={`text-sm font-medium ${badge.earned ? 'text-white' : 'text-slate-500'}`}>{badge.label}</span>
                    {badge.earned && <Star className="h-3.5 w-3.5 text-amber-400 ml-auto" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── Weekly Progress Chart ────────────────────────────────────────── */}
        <motion.div initial="hidden" animate="visible" custom={7} variants={fadeUp}>
          {isLoading ? (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6"><Skeleton className="h-56 w-full bg-slate-800 rounded-lg" /></CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-lg">Weekly Performance</CardTitle>
                    <p className="text-sm text-slate-400 mt-0.5">Average score over the last 7 days</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                    <span className="text-xs text-slate-400">Avg Score</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data?.weeklyChart ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 12 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 12 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc' }}
                      labelStyle={{ color: '#94a3b8' }}
                      formatter={(value: number) => [`${value}`, 'Avg Score']}
                    />
                    <Area type="monotone" dataKey="avgScore" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#scoreGradient)"
                      dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 5 }} activeDot={{ r: 7, fill: '#a78bfa' }}
                      isAnimationActive animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* ── Recent Interviews + AI Suggestions ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Recent Interviews */}
          <motion.div initial="hidden" animate="visible" custom={8} variants={fadeUp}>
            <Card className="bg-slate-900 border-slate-800 h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-slate-400" />
                    Recent Sessions
                  </CardTitle>
                  <Link to="/history" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">View all →</Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-3 px-5 pb-5">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full bg-slate-800 rounded-xl" />)}
                  </div>
                ) : data?.recentSessions?.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <span className="text-4xl">🎤</span>
                    <p className="text-slate-400 text-sm">No interviews yet.</p>
                    <Button size="sm" onClick={() => navigate('/interview/new')} className="bg-violet-600 hover:bg-violet-500">
                      Start your first one!
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/70">
                    {data?.recentSessions?.map((session, i) => {
                      const companyColor = session.company ? (COMPANY_COLORS[session.company] ?? '#8B5CF6') : '#8B5CF6'
                      return (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.08 }}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/50 transition-colors"
                        >
                          {/* Company dot */}
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: companyColor }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{session.role}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {session.company && <span style={{ color: companyColor }}>{session.company} · </span>}
                              {new Date(session.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <AnimatePresence>
                              <motion.span
                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.5 + i * 0.08 }}
                                className={cn('text-xs font-bold px-2.5 py-1 rounded-full', scoreBg(session.overallScore))}
                              >
                                {session.overallScore}
                              </motion.span>
                            </AnimatePresence>
                            <Link to={`/report/${session.id}`} className="text-xs text-violet-400 hover:text-violet-300 transition-colors whitespace-nowrap">
                              Report →
                            </Link>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Suggestions */}
          <motion.div initial="hidden" animate="visible" custom={9} variants={fadeUp}>
            <Card className="bg-slate-900 border-slate-800 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-400" />
                  AI Coach Tips
                </CardTitle>
                <p className="text-sm text-slate-400">Personalized suggestions to improve</p>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full bg-slate-800 rounded-xl" />)
                ) : data?.suggestions?.length === 0 ? (
                  <p className="text-slate-500 text-sm">Complete more interviews to get suggestions.</p>
                ) : (
                  data?.suggestions?.map((suggestion, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                      className="flex gap-3 p-4 rounded-2xl border border-amber-500/15 bg-gradient-to-r from-amber-500/5 to-transparent hover:border-amber-500/30 transition-colors"
                    >
                      <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-300 leading-relaxed">{suggestion}</p>
                    </motion.div>
                  ))
                )}

                {/* Start practice CTA */}
                <div className="pt-2">
                  <Button
                    onClick={() => navigate('/interview/new')}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold gap-2 shadow-lg shadow-violet-900/30"
                  >
                    <Zap className="h-4 w-4" />
                    Start Practice Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
