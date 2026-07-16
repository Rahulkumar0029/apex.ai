import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  BarChart2, TrendingUp, Flame, Target, Plus, Lightbulb,
  Trophy, Zap, Star, ArrowRight, Clock, Brain, Code, Users,
  LayoutDashboard, User, Settings, LogOut, ArrowLeft, ChevronRight, CheckCircle2, Award, MessageSquare, AlertTriangle, ShieldAlert, Heart, Sparkles
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

// ─── Mock data fallback ───────────────────────────────────────────────────────

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
    { id: '1', role: 'Frontend Engineer', difficulty: 'Medium', completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2).toISOString(), overallScore: 78, company: 'Google', interviewType: 'Technical' },
    { id: '2', role: 'Full Stack Developer', difficulty: 'Hard', completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 4).toISOString(), overallScore: 65, company: 'Amazon', interviewType: 'System Design' },
    { id: '3', role: 'React Developer', difficulty: 'Easy', completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 6).toISOString(), overallScore: 88, company: 'Microsoft', interviewType: 'Behavioral' },
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

function scoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
  if (score >= 60) return 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
  return 'bg-red-500/15 text-red-400 border border-red-500/20'
}

const COMPANY_COLORS: Record<string, string> = {
  Google: '#4285F4', Amazon: '#FF9900', Microsoft: '#00BCF2',
  Meta: '#0866FF', Apple: '#A2AAAD', Netflix: '#E50914',
}

const PRACTICE_TYPES = [
  { label: '5-min Warm-up', desc: 'Behavioral basics', icon: Brain, color: 'from-blue-600/30 to-blue-700/20', accent: 'text-blue-400', border: 'border-blue-700/30', xp: '+50 XP', type: 'Behavioral' },
  { label: 'Technical Sprint', desc: 'Algorithm challenge', icon: Code, color: 'from-emerald-600/30 to-emerald-700/20', accent: 'text-emerald-400', border: 'border-emerald-700/30', xp: '+120 XP', type: 'Technical' },
  { label: 'Mock Interview', desc: 'Full simulation', icon: Users, color: 'from-violet-600/30 to-violet-700/20', accent: 'text-violet-400', border: 'border-violet-700/30', xp: '+200 XP', type: 'Technical' },
  { label: 'System Design', desc: 'Architect a solution', icon: Target, color: 'from-orange-600/30 to-orange-700/20', accent: 'text-orange-400', border: 'border-orange-700/30', xp: '+180 XP', type: 'System Design' },
]

const COMPANIES = ['Google', 'Amazon', 'Microsoft', 'Meta', 'Netflix', 'Apple']
const TYPES = [
  { value: 'Technical', label: 'Technical Sprint', desc: 'Algorithms & coding challenge', xp: 120 },
  { value: 'Behavioral', label: 'Behavioral Prep', desc: 'STAR method mock scenario', xp: 50 },
  { value: 'System Design', label: 'System Design', desc: 'Scalable system architecting', xp: 180 },
]

// ─── Streak flame component ───────────────────────────────────────────────────

function StreakFlame({ streak }: { streak: number }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const today = new Date().getDay()
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
                'w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all',
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
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-violet-900/40 animate-pulse">
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

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' as any },
  }),
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  // Navigation view state
  const [view, setView] = useState<'dashboard' | 'new-interview' | 'history' | 'analytics' | 'profile' | 'settings' | 'report'>('dashboard')
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)

  // New Interview Form states
  const [formStep, setFormStep] = useState(1)
  const [role, setRole] = useState('')
  const [experience, setExperience] = useState('')
  const [company, setCompany] = useState(COMPANIES[0])
  const [type, setType] = useState(TYPES[0].value)
  const [difficulty, setDifficulty] = useState('Medium')
  const [isSimulating, setIsSimulating] = useState(false)

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
  }, [data?.streakMilestone, toast])

  const totalWeeklyInterviews = data?.weeklyChart.reduce((sum, d) => sum + d.count, 0) ?? 0

  const stats = [
    { label: 'Interviews Done', value: data?.totalInterviews ?? 0, icon: BarChart2, gradient: 'from-blue-600/20 to-blue-700/10', iconColor: 'text-blue-400', border: 'border-blue-700/20', sub: 'all time' },
    { label: 'Avg Score', value: `${data?.avgScore ?? 0}`, icon: TrendingUp, gradient: 'from-emerald-600/20 to-emerald-700/10', iconColor: 'text-emerald-400', border: 'border-emerald-700/20', sub: 'across sessions' },
    { label: 'Day Streak', value: `${data?.streak ?? 0} 🔥`, icon: Flame, gradient: 'from-orange-600/20 to-orange-700/10', iconColor: 'text-orange-400', border: 'border-orange-700/20', sub: 'keep it going!' },
    { label: 'This Week', value: `${totalWeeklyInterviews}`, icon: Target, gradient: 'from-violet-600/20 to-violet-700/10', iconColor: 'text-violet-400', border: 'border-violet-700/20', sub: 'interviews' },
  ]

  // Form next/back
  const isStep1Valid = role.trim() !== '' && experience.trim() !== ''
  const handleLaunch = async () => {
    setIsSimulating(true)
    const selectedType = TYPES.find((t) => t.value === type)
    const xpGained = selectedType ? selectedType.xp : 100

    try {
      await api.post('/interview/new', {
        role,
        difficulty,
        company,
        interviewType: type,
        xpGained,
      })

      // Invalidate queries to reload updated localStorage state
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })

      toast({
        title: '🎉 Practice Session Completed!',
        description: `Successfully simulated session for ${role}. Earned +${xpGained} XP!`,
      })
      
      // Reset form and go back to dashboard
      setRole('')
      setExperience('')
      setFormStep(1)
      setView('dashboard')
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Failed to complete interview simulation.',
      })
    } finally {
      setIsSimulating(false)
    }
  }

  // Navigation Items Config
  const sidebarLinks = [
    { label: 'Dashboard', value: 'dashboard', icon: LayoutDashboard },
    { label: 'New Interview', value: 'new-interview', icon: Plus },
    { label: 'History', value: 'history', icon: Clock },
    { label: 'Analytics', value: 'analytics', icon: BarChart2 },
    { label: 'Profile', value: 'profile', icon: User },
    { label: 'Settings', value: 'settings', icon: Settings },
  ]

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-6 py-6">
          {/* Logo brand */}
          <div className="px-6 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-blue-500/20">
              A
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">Apex.ai</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
              PRO
            </span>
          </div>

          {/* Navigation link items */}
          <nav className="px-3 space-y-1">
            {sidebarLinks.map((link) => {
              const active = view === link.value || (link.value === 'new-interview' && view === 'new-interview')
              return (
                <button
                  key={link.label}
                  onClick={() => {
                    setView(link.value as any)
                    if (link.value === 'new-interview') setFormStep(1)
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group cursor-pointer text-left',
                    active
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  )}
                >
                  <link.icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    )}
                  />
                  {link.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* User Block at bottom */}
        <div className="border-t border-slate-800 p-4 space-y-3">
          {user && (
            <div className="flex items-center gap-3 px-2 py-1.5">
              <div className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-violet-500/10 shrink-0">
                {user.displayName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate leading-none mb-1">{user.displayName}</p>
                <p className="text-[10px] text-slate-500 truncate leading-none">{user.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content view router ────────────────────────────────────────── */}
      <main className="flex-1 h-screen overflow-y-auto bg-slate-950 relative">
        <AnimatePresence mode="wait">
          {/* VIEW: DASHBOARD */}
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
            >
              {/* Hero Header */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-900/40 via-slate-900 to-slate-950 border border-violet-700/20 p-6 md:p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">{getGreeting()},</p>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                      {user?.displayName ?? 'Rudra'} 👋
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
                      onClick={() => {
                        setFormStep(1)
                        setView('new-interview')
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 gap-2 font-semibold cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      New Interview
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <StreakFlame streak={data?.streak ?? 0} />
                  </div>
                </div>
              </div>

              {/* Stats Row */}
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

              {/* Quick Practice + Achievements */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Quick Practice */}
                <div className="lg:col-span-2">
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
                          <button
                            key={pt.label}
                            onClick={() => {
                              setType(pt.type)
                              setFormStep(1)
                              setView('new-interview')
                            }}
                            className={cn(
                              `flex flex-col items-start gap-2 p-4 rounded-2xl bg-gradient-to-br ${pt.color} border ${pt.border} hover:scale-[1.02] transition-all duration-200 group text-left cursor-pointer`,
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
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Achievements */}
                <div>
                  <Card className="bg-slate-900 border-slate-800 h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-400" />
                        Achievements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Streak badge */}
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

                      {/* Badges list */}
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
                </div>
              </div>

              {/* Weekly Performance area chart */}
              <div>
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
                            formatter={(value: any) => [`${value}`, 'Avg Score']}
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
              </div>

              {/* Recent Sessions + AI coaching tips */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Recent sessions */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-slate-400" />
                        Recent Sessions
                      </CardTitle>
                      <button onClick={() => setView('history')} className="text-xs text-violet-400 hover:text-violet-300 transition-colors whitespace-nowrap cursor-pointer">
                        View all →
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="space-y-3 px-5 pb-5">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full bg-slate-800 rounded-xl" />)}
                      </div>
                    ) : !data?.recentSessions || data.recentSessions.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 py-10 text-center">
                        <span className="text-4xl">🎤</span>
                        <p className="text-slate-400 text-sm">No interviews yet.</p>
                        <Button size="sm" onClick={() => setView('new-interview')} className="bg-blue-600 hover:bg-blue-500">
                          Start your first one!
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800/70">
                        {data.recentSessions.slice(0, 3).map((session, i) => {
                          const companyColor = session.company ? (COMPANY_COLORS[session.company] ?? '#8B5CF6') : '#8B5CF6'
                          return (
                            <div
                              key={session.id}
                              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/50 transition-colors"
                            >
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: companyColor }} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-white truncate">{session.role}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {session.company && <span style={{ color: companyColor }}>{session.company} · </span>}
                                  {new Date(session.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', scoreBg(session.overallScore))}>
                                  {session.overallScore}
                                </span>
                                <button
                                  onClick={() => {
                                    setSelectedReportId(session.id)
                                    setView('report')
                                  }}
                                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  Report →
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* AI Coach tips */}
                <Card className="bg-slate-900 border-slate-800">
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
                    ) : !data?.suggestions || data.suggestions.length === 0 ? (
                      <p className="text-slate-500 text-sm">Complete more interviews to get suggestions.</p>
                    ) : (
                      data.suggestions.map((suggestion, i) => (
                        <div
                          key={i}
                          className="flex gap-3 p-4 rounded-2xl border border-amber-500/15 bg-gradient-to-r from-amber-500/5 to-transparent hover:border-amber-500/30 transition-colors"
                        >
                          <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-sm text-slate-300 leading-relaxed">{suggestion}</p>
                        </div>
                      ))
                    )}

                    <div className="pt-2">
                      <Button
                        onClick={() => {
                          setFormStep(1)
                          setView('new-interview')
                        }}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold gap-2 shadow-lg shadow-blue-900/30 cursor-pointer"
                      >
                        <Zap className="h-4 w-4" />
                        Start Practice Session
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* VIEW: NEW INTERVIEW */}
          {view === 'new-interview' && (
            <motion.div
              key="new-interview"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-3xl mx-auto py-10 px-4 md:px-8 space-y-8"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">New Interview</h1>
                <p className="text-slate-400 text-sm">Configure your AI-powered mock interview session</p>
              </div>

              {/* Progress nodes connecting line */}
              <div className="relative flex items-center justify-between max-w-md mx-auto px-4 py-2">
                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-800 -translate-y-1/2 z-0" />
                <div
                  className="absolute top-1/2 left-0 h-[2px] bg-blue-600 -translate-y-1/2 z-0 transition-all duration-300"
                  style={{ width: formStep === 1 ? '0%' : formStep === 2 ? '50%' : '100%' }}
                />

                {/* Node 1 */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border ${
                    formStep >= 1 ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}>
                    {formStep > 1 ? <CheckCircle2 className="h-4 w-4 text-white" /> : '1'}
                  </div>
                  <span className={`text-[10px] font-bold tracking-wider uppercase transition-colors duration-300 ${
                    formStep >= 1 ? 'text-blue-500' : 'text-slate-500'
                  }`}>Basic Info</span>
                </div>

                {/* Node 2 */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border ${
                    formStep >= 2 ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    {formStep > 2 ? <CheckCircle2 className="h-4 w-4 text-white" /> : '2'}
                  </div>
                  <span className={`text-[10px] font-bold tracking-wider uppercase transition-colors duration-300 ${
                    formStep >= 2 ? 'text-blue-500' : 'text-slate-500'
                  }`}>Interview Setup</span>
                </div>

                {/* Node 3 */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border ${
                    formStep >= 3 ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    3
                  </div>
                  <span className={`text-[10px] font-bold tracking-wider uppercase transition-colors duration-300 ${
                    formStep >= 3 ? 'text-blue-500' : 'text-slate-500'
                  }`}>Review</span>
                </div>
              </div>

              {/* Form card wizard content */}
              <Card className="border-slate-800 bg-slate-900 shadow-2xl relative overflow-hidden">
                {/* STEP 1 */}
                {formStep === 1 && (
                  <CardContent className="p-6 md:p-8 space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-white mb-1">Basic Information</h2>
                      <p className="text-slate-400 text-xs">Tell us about the role you're preparing for.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                          Role <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          placeholder="e.g. Senior Frontend Engineer"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-655 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                          Years of Experience <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={experience}
                          onChange={(e) => setExperience(e.target.value)}
                          placeholder="0 - 30"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-655 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                        <div className="w-2 h-2 rounded-full bg-slate-800" />
                        <div className="w-2 h-2 rounded-full bg-slate-800" />
                      </div>
                      <Button
                        onClick={() => setFormStep(2)}
                        disabled={!isStep1Valid}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-1.5 shadow-md shadow-blue-500/10 px-6 py-2.5 rounded-xl cursor-pointer"
                      >
                        Next <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                )}

                {/* STEP 2 */}
                {formStep === 2 && (
                  <CardContent className="p-6 md:p-8 space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-white mb-1">Interview Setup</h2>
                      <p className="text-slate-400 text-xs">Customize focus areas, target company, and difficulty level.</p>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300">Target Company</label>
                        <div className="flex flex-wrap gap-2">
                          {COMPANIES.map((c) => (
                            <button
                              key={c}
                              onClick={() => setCompany(c)}
                              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                                company === c
                                  ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                                  : 'bg-slate-955 border-slate-800 text-slate-400 hover:bg-slate-800'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300">Interview Type</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {TYPES.map((t) => (
                            <button
                              key={t.value}
                              onClick={() => setType(t.value)}
                              className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                                type === t.value
                                  ? 'bg-blue-955/20 border-blue-500 text-white shadow-md'
                                  : 'bg-slate-955 border-slate-800 text-slate-400 hover:border-slate-800'
                              }`}
                            >
                              <span className="text-xs font-bold text-white">{t.label}</span>
                              <span className="text-[10px] text-slate-500 leading-normal">{t.desc}</span>
                              <span className="text-[9px] font-bold mt-2 px-2 py-0.5 rounded-full bg-slate-900 text-blue-400 self-start">
                                +{t.xp} XP
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300">Difficulty</label>
                        <div className="flex gap-2">
                          {['Easy', 'Medium', 'Hard'].map((d) => (
                            <button
                              key={d}
                              onClick={() => setDifficulty(d)}
                              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                difficulty === d
                                  ? d === 'Easy'
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                    : d === 'Medium'
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                    : 'bg-red-500/20 border-red-500 text-red-400'
                                  : 'bg-slate-955 border-slate-800 text-slate-400 hover:bg-slate-800'
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
                      <Button
                        onClick={() => setFormStep(1)}
                        variant="outline"
                        className="border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold px-5 py-2.5 rounded-xl cursor-pointer"
                      >
                        Back
                      </Button>
                      <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-800" />
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                        <div className="w-2 h-2 rounded-full bg-slate-800" />
                      </div>
                      <Button
                        onClick={() => setFormStep(3)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-1.5 shadow-md shadow-blue-500/10 px-6 py-2.5 rounded-xl cursor-pointer"
                      >
                        Next <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                )}

                {/* STEP 3 */}
                {formStep === 3 && (
                  <CardContent className="p-6 md:p-8 space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-white mb-1">Review Configuration</h2>
                      <p className="text-slate-400 text-xs">Verify your mock session settings before starting.</p>
                    </div>

                    <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 divide-y divide-slate-800/60 space-y-4">
                      <div className="flex justify-between items-center pb-3">
                        <span className="text-xs text-slate-400 font-medium">Target Role</span>
                        <span className="text-sm font-semibold text-white">{role}</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-xs text-slate-400 font-medium">Experience</span>
                        <span className="text-sm font-semibold text-white">{experience} years</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-xs text-slate-400 font-medium">Target Company</span>
                        <span className="text-sm font-semibold text-white">{company}</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-xs text-slate-400 font-medium">Interview Type</span>
                        <span className="text-sm font-semibold text-white">
                          {TYPES.find((t) => t.value === type)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3">
                        <span className="text-xs text-slate-400 font-medium">Difficulty Level</span>
                        <span className={cn(
                          'text-xs font-bold px-2.5 py-0.5 rounded-md border',
                          difficulty === 'Easy' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                          difficulty === 'Medium' && 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                          difficulty === 'Hard' && 'bg-red-500/10 border-red-500/20 text-red-400'
                        )}>
                          {difficulty}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
                      <Button
                        onClick={() => setFormStep(2)}
                        variant="outline"
                        className="border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold px-5 py-2.5 rounded-xl cursor-pointer"
                        disabled={isSimulating}
                      >
                        Back
                      </Button>
                      <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-800" />
                        <div className="w-2 h-2 rounded-full bg-slate-800" />
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                      </div>
                      <Button
                        onClick={handleLaunch}
                        disabled={isSimulating}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-1.5 shadow-md shadow-blue-500/10 px-6 py-2.5 rounded-xl cursor-pointer"
                      >
                        {isSimulating ? (
                          <>
                            <Zap className="h-4 w-4 animate-bounce text-yellow-400" />
                            Simulating...
                          </>
                        ) : (
                          <>
                            Launch Session <Sparkles className="h-4 w-4 text-yellow-400" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          )}

          {/* VIEW: HISTORY */}
          {view === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-4xl mx-auto py-10 px-4 space-y-6"
            >
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setView('dashboard')} className="gap-2 text-slate-400 hover:text-white cursor-pointer">
                  <ArrowLeft className="h-4 w-4" /> Dashboard
                </Button>
                <Button size="sm" onClick={() => { setFormStep(1); setView('new-interview') }} className="bg-blue-600 hover:bg-blue-500 text-white font-medium cursor-pointer">
                  Start New Practice
                </Button>
              </div>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="border-b border-slate-800/60 pb-5">
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-violet-400" />
                    Interview Practice History
                  </CardTitle>
                  <p className="text-slate-400 text-sm">Review scores and feedback reports of all your past attempts</p>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-6 space-y-4">
                      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full bg-slate-800 rounded-2xl" />)}
                    </div>
                  ) : !data?.recentSessions || data.recentSessions.length === 0 ? (
                    <div className="text-center py-16 space-y-4">
                      <span className="text-5xl block">🎓</span>
                      <p className="text-slate-400 font-medium">No completed practice sessions yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/60">
                      {data.recentSessions.map((session, i) => {
                        const companyColor = session.company ? (COMPANY_COLORS[session.company] ?? '#8B5CF6') : '#8B5CF6'
                        return (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 hover:bg-slate-800/40 transition-colors"
                          >
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex items-center gap-2.5">
                                <span className="font-semibold text-white text-base truncate">{session.role}</span>
                                {session.company && (
                                  <span
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                                    style={{ backgroundColor: `${companyColor}20`, color: companyColor }}
                                  >
                                    {session.company}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
                                <span className="text-slate-300">Type: {session.interviewType || 'Technical'}</span>
                                <span className="text-slate-600">•</span>
                                <span className={cn(
                                  'font-bold',
                                  session.difficulty === 'Easy' && 'text-emerald-400',
                                  session.difficulty === 'Medium' && 'text-amber-400',
                                  session.difficulty === 'Hard' && 'text-red-400'
                                )}>
                                  {session.difficulty}
                                </span>
                                <span className="text-slate-600">•</span>
                                <span className="text-slate-500">
                                  {new Date(session.completedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Score:</span>
                                <span className={cn('text-sm font-extrabold px-3 py-1 rounded-full', scoreBg(session.overallScore))}>
                                  {session.overallScore} / 100
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedReportId(session.id)
                                  setView('report')
                                }}
                                className="inline-flex items-center justify-center border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold gap-1 cursor-pointer transition-colors"
                              >
                                Report <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* VIEW: REPORT DETAILS */}
          {view === 'report' && selectedReportId && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-4xl mx-auto py-10 px-4 space-y-6"
            >
              {/* Report Header */}
              {(() => {
                const session = data?.recentSessions.find((s) => s.id === selectedReportId)
                if (!session) return <p className="text-red-400">Report details not found.</p>
                const communicationScore = Math.min(100, session.overallScore + 4)
                const problemSolvingScore = Math.max(0, session.overallScore - 3)
                const technicalScore = Math.min(100, session.overallScore + 1)

                return (
                  <>
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" onClick={() => setView('dashboard')} className="gap-2 text-slate-400 hover:text-white cursor-pointer">
                        <ArrowLeft className="h-4 w-4" /> Dashboard
                      </Button>
                      <span className="text-xs text-slate-500 font-medium">Session ID: #{session.id}</span>
                    </div>

                    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-900/35 via-slate-900 to-slate-950 border border-violet-700/20 p-6 md:p-8">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300">
                            {session.interviewType || 'Technical'} Mock
                          </span>
                          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-3">{session.role}</h1>
                          <p className="text-sm text-slate-400 mt-2">
                            Simulated for <span className="text-white font-semibold">{session.company || 'Tech General'}</span> ·{' '}
                            {session.difficulty} Difficulty
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Completed on {new Date(session.completedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className={cn('text-4xl md:text-5xl font-extrabold w-24 h-24 rounded-full flex items-center justify-center border-2', scoreBg(session.overallScore))}>
                            {session.overallScore}
                          </div>
                          <span className="text-xs text-slate-400 font-medium mt-2 block">Overall Score</span>
                        </div>
                      </div>
                    </div>

                    {/* Score breakdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <Card className="bg-slate-900 border-slate-800/80">
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-300">Communication</span>
                            <span className="text-sm font-extrabold text-violet-400">{communicationScore}/100</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500" style={{ width: `${communicationScore}%` }} />
                          </div>
                          <p className="text-xs text-slate-400">Pacing, structure of answers, and clarity of articulating thoughts.</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-900 border-slate-800/80">
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-300">Problem Solving</span>
                            <span className="text-sm font-extrabold text-emerald-400">{problemSolvingScore}/100</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${problemSolvingScore}%` }} />
                          </div>
                          <p className="text-xs text-slate-400">Structured analysis, architectural trade-offs, and edge case thinking.</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-900 border-slate-800/80">
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-300">Technical Depth</span>
                            <span className="text-sm font-extrabold text-blue-400">{technicalScore}/100</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${technicalScore}%` }} />
                          </div>
                          <p className="text-xs text-slate-400">Accuracy of technical statements, details of technologies used, and patterns.</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* AI Coach Detailed Feedback */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-3 border-b border-slate-800/50">
                          <CardTitle className="text-white text-base flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            Key Strengths
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                          <div className="flex gap-3">
                            <Award className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-slate-200">Strong System Scoping</p>
                              <p className="text-xs text-slate-400 mt-0.5">You accurately identified core requirements and constraints before driving into implementation.</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <MessageSquare className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-slate-200">Clear STAR Structure</p>
                              <p className="text-xs text-slate-400 mt-0.5">Answers to behavioral prompts cleanly followed the Situation, Task, Action, Result framework.</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-3 border-b border-slate-800/50">
                          <CardTitle className="text-white text-base flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-400" />
                            Areas for Improvement
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                          <div className="flex gap-3">
                            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-slate-200">Address Edge Cases Sooner</p>
                              <p className="text-xs text-slate-400 mt-0.5">Try to discuss system failure modes and rate limit strategies earlier in design tasks.</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Heart className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-slate-200">Watch Answer Pacing</p>
                              <p className="text-xs text-slate-400 mt-0.5">Brief pauses to organize thoughts are fine; avoid rushing into complex technical descriptions.</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )
              })()}
            </motion.div>
          )}

          {/* VIEW: ANALYTICS (stub) */}
          {view === 'analytics' && (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-8 space-y-3">
              <BarChart2 className="h-10 w-10 text-blue-500 animate-bounce" />
              <h2 className="text-xl font-bold text-white">Analytics Dashboard</h2>
              <p className="text-sm text-slate-500 max-w-sm text-center">Interactive progress stats, mock-by-mock breakdown, and weak-point analyzer graphs will load here.</p>
            </div>
          )}

          {/* VIEW: PROFILE (stub) */}
          {view === 'profile' && (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold uppercase shadow-lg shadow-blue-500/20">
                {user?.displayName.charAt(0) || 'R'}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">{user?.displayName || 'Rudra'}</h2>
                <p className="text-xs text-slate-500 mt-1">{user?.email || 'rudra10082005@gmail.com'}</p>
              </div>
              <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Subscription Status:</span><span className="font-semibold text-blue-400">Apex Pro</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Level Rank:</span><span className="font-semibold text-violet-400">Elite Level {data?.level}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Total Practice XP:</span><span className="font-semibold text-white">{data?.xp} XP</span></div>
              </div>
            </div>
          )}

          {/* VIEW: SETTINGS (stub) */}
          {view === 'settings' && (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-8 space-y-3">
              <Settings className="h-10 w-10 text-slate-500 animate-spin" style={{ animationDuration: '6s' }} />
              <h2 className="text-xl font-bold text-white">System Settings</h2>
              <p className="text-sm text-slate-500 max-w-sm text-center">Configure default interview roles, microphone setup, local camera feeds, and custom AI coach difficulty levels.</p>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
