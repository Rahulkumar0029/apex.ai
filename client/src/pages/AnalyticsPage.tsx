import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { BarChart2, Briefcase, Trophy } from 'lucide-react'

import api from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreTrendEntry {
  date: string
  overallScore: number
  role: string
}

interface RadarDataShape {
  technical: number
  communication: number
  confidence: number
  grammar: number
  problemSolving: number
}

interface ByRoleEntry {
  role: string
  avgScore: number
  count: number
}

interface AnalyticsData {
  totalSessions: number
  uniqueRoles: number
  scoreTrend: ScoreTrendEntry[]
  radarData: RadarDataShape
  byType: { Technical: number; Behavioral: number; Mixed: number }
  byRole: ByRoleEntry[]
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ANALYTICS: AnalyticsData = {
  totalSessions: 24,
  uniqueRoles: 6,
  scoreTrend: [
    { date: '2024-01-01', overallScore: 62, role: 'Frontend Engineer' },
    { date: '2024-01-05', overallScore: 68, role: 'React Developer' },
    { date: '2024-01-10', overallScore: 65, role: 'Frontend Engineer' },
    { date: '2024-01-15', overallScore: 72, role: 'Full Stack' },
    { date: '2024-01-20', overallScore: 75, role: 'Frontend Engineer' },
    { date: '2024-01-25', overallScore: 71, role: 'React Developer' },
    { date: '2024-02-01', overallScore: 78, role: 'Full Stack' },
    { date: '2024-02-10', overallScore: 80, role: 'Frontend Engineer' },
    { date: '2024-02-15', overallScore: 82, role: 'Senior Engineer' },
  ],
  radarData: {
    technical: 72,
    communication: 68,
    confidence: 75,
    grammar: 80,
    problemSolving: 65,
  },
  byType: { Technical: 14, Behavioral: 6, Mixed: 4 },
  byRole: [
    { role: 'Frontend Engineer', avgScore: 74, count: 8 },
    { role: 'Full Stack', avgScore: 70, count: 6 },
    { role: 'React Developer', avgScore: 78, count: 5 },
    { role: 'Senior Engineer', avgScore: 82, count: 3 },
    { role: 'Backend Engineer', avgScore: 65, count: 2 },
  ],
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#8b5cf6', '#6366f1', '#a855f7']

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.1, ease: 'easeOut' },
  }),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTick(dateStr: string): string {
  const d = new Date(dateStr)
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = d.getUTCDate().toString().padStart(2, '0')
  return `${month}/${day}`
}

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 70) return 'bg-yellow-500'
  return 'bg-red-500'
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32 bg-gray-800" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 bg-gray-800" />
        <Skeleton className="h-3 w-24 bg-gray-800 mt-2" />
      </CardContent>
    </Card>
  )
}

function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <Skeleton className="h-5 w-40 bg-gray-800" />
      </CardHeader>
      <CardContent>
        <Skeleton className={cn('w-full bg-gray-800 rounded-lg', height)} />
      </CardContent>
    </Card>
  )
}

// ─── Custom Tooltip for Line Chart ───────────────────────────────────────────

interface TrendTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: ScoreTrendEntry }>
  label?: string
}

function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-1">{label ? formatDateTick(label) : ''}</p>
      <p className="text-white font-semibold text-sm">Score: {entry.value}</p>
      <p className="text-violet-400 text-xs mt-0.5">{entry.payload.role}</p>
    </div>
  )
}

// ─── Custom Pie Legend ────────────────────────────────────────────────────────

interface PieLegendEntry {
  name: string
  value: number
  color: string
}

function PieCustomLegend({ entries }: { entries: PieLegendEntry[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {entries.map((e) => (
        <div key={e.name} className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-gray-400 text-xs">{e.name}</span>
          <span className="text-white text-xs font-semibold">{e.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: ['analytics', startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get<AnalyticsData>('/analytics', {
        params: {
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      })
      return data
    },
    initialData: MOCK_ANALYTICS,
    staleTime: 30_000,
  })

  // ── Derived values ────────────────────────────────────────────────────────
  const bestScore = data?.scoreTrend?.length
    ? Math.max(...data.scoreTrend.map((s) => s.overallScore))
    : 0

  const radarChartData = data?.radarData
    ? [
        { subject: 'Technical', value: data.radarData.technical, fullMark: 100 },
        { subject: 'Communication', value: data.radarData.communication, fullMark: 100 },
        { subject: 'Confidence', value: data.radarData.confidence, fullMark: 100 },
        { subject: 'Grammar', value: data.radarData.grammar, fullMark: 100 },
        { subject: 'Problem Solving', value: data.radarData.problemSolving, fullMark: 100 },
      ]
    : []

  const pieData = data?.byType
    ? Object.entries(data.byType).map(([name, value], i) => ({
        name,
        value,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
    : []

  const sortedByRole = data?.byRole
    ? [...data.byRole].sort((a, b) => b.avgScore - a.avgScore)
    : []

  // ── Stats config ──────────────────────────────────────────────────────────
  const stats = [
    {
      label: 'Total Sessions',
      value: data?.totalSessions ?? 0,
      icon: BarChart2,
      iconColor: 'text-violet-400',
      iconBg: 'bg-violet-500/10',
      sub: 'all time',
    },
    {
      label: 'Unique Roles',
      value: data?.uniqueRoles ?? 0,
      icon: Briefcase,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10',
      sub: 'practiced',
    },
    {
      label: 'Best Score',
      value: bestScore,
      icon: Trophy,
      iconColor: 'text-yellow-400',
      iconBg: 'bg-yellow-500/10',
      sub: 'personal best',
    },
  ]

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-red-400 text-lg">Failed to load analytics data.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0}
          variants={fadeUp}
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Analytics</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
                {data?.totalSessions ?? 0} sessions
              </span>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {data?.uniqueRoles ?? 0} roles
              </span>
            </div>
          </div>

          {/* Date range filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="startDate" className="text-xs text-gray-400 whitespace-nowrap">
                From
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent [color-scheme:dark]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="endDate" className="text-xs text-gray-400 whitespace-nowrap">
                To
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent [color-scheme:dark]"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate('') }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
            : stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial="hidden"
                  animate="visible"
                  custom={i + 1}
                  variants={fadeUp}
                >
                  <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-sm font-medium text-gray-400">
                        {stat.label}
                      </CardTitle>
                      <div className={cn('p-2 rounded-lg', stat.iconBg)}>
                        <stat.icon className={cn('h-4 w-4', stat.iconColor)} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
        </div>

        {/* ── Score Trend Chart ───────────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={4}
          variants={fadeUp}
        >
          {isLoading ? (
            <ChartSkeleton height="h-64" />
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Score Trend</CardTitle>
                <p className="text-sm text-gray-400">Overall score across your sessions over time</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={data?.scoreTrend ?? []}
                    margin={{ top: 10, right: 16, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateTick}
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={{ stroke: '#374151' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={{ stroke: '#374151' }}
                      tickLine={false}
                    />
                    <Tooltip content={<TrendTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="overallScore"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, fill: '#a78bfa', strokeWidth: 0 }}
                      isAnimationActive={true}
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* ── Radar + Pie row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Radar Chart */}
          <motion.div initial="hidden" animate="visible" custom={5} variants={fadeUp}>
            {isLoading ? (
              <ChartSkeleton height="h-72" />
            ) : (
              <Card className="bg-gray-900 border-gray-800 h-full">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Skill Breakdown</CardTitle>
                  <p className="text-sm text-gray-400">Performance across key competency areas</p>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarChartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        axisLine={false}
                      />
                      <Radar
                        name="Score"
                        dataKey="value"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.3}
                        strokeWidth={2}
                        isAnimationActive={true}
                        animationDuration={800}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Pie Chart */}
          <motion.div initial="hidden" animate="visible" custom={6} variants={fadeUp}>
            {isLoading ? (
              <ChartSkeleton height="h-72" />
            ) : (
              <Card className="bg-gray-900 border-gray-800 h-full">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Interview Type Distribution</CardTitle>
                  <p className="text-sm text-gray-400">Breakdown by interview category</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111827',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f9fafb',
                        }}
                        formatter={(value: number, name: string) => [value, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <PieCustomLegend entries={pieData} />
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>

        {/* ── Role Performance Table ──────────────────────────────────────── */}
        <motion.div initial="hidden" animate="visible" custom={7} variants={fadeUp}>
          {isLoading ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <Skeleton className="h-5 w-48 bg-gray-800" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full bg-gray-800 rounded-lg" />
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Performance by Role</CardTitle>
                <p className="text-sm text-gray-400">Average scores and session counts per role</p>
              </CardHeader>
              <CardContent className="p-0">
                {/* Table header */}
                <div className="grid grid-cols-12 px-6 py-2 border-b border-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="col-span-4">Role</span>
                  <span className="col-span-2 text-center">Sessions</span>
                  <span className="col-span-2 text-center">Avg Score</span>
                  <span className="col-span-4">Progress</span>
                </div>

                {/* Table rows */}
                <div className="divide-y divide-gray-800/60">
                  {sortedByRole.map((row, i) => (
                    <motion.div
                      key={row.role}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.3 + i * 0.06, ease: 'easeOut' }}
                      className="grid grid-cols-12 items-center px-6 py-3.5 hover:bg-gray-800/40 transition-colors"
                    >
                      <span className="col-span-4 text-sm font-medium text-white truncate pr-2">
                        {row.role}
                      </span>
                      <span className="col-span-2 text-center text-sm text-gray-400">
                        {row.count}
                      </span>
                      <span className="col-span-2 text-center text-sm font-semibold text-white">
                        {row.avgScore}
                      </span>
                      <div className="col-span-4 flex items-center gap-2">
                        <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                          <motion.div
                            className={cn('h-full rounded-full', scoreColor(row.avgScore))}
                            initial={{ width: 0 }}
                            animate={{ width: `${row.avgScore}%` }}
                            transition={{ duration: 0.6, delay: 0.4 + i * 0.06, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{row.avgScore}%</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

      </div>
    </div>
  )
}
