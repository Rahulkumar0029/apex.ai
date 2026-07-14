import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Download, Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react'

import api from '@/lib/axios'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ─── useDebounce ──────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionReport {
  id: string
  overallScore: number
}

interface Session {
  id: string
  role: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  interviewType: string
  createdAt: string
  status: string
  report: SessionReport
}

interface HistoryData {
  sessions: Session[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_SESSIONS = Array.from({ length: 15 }, (_, i) => ({
  id: `session-${i + 1}`,
  role: ['Frontend Engineer', 'Full Stack Developer', 'React Developer', 'Node.js Developer', 'Senior Engineer'][i % 5],
  difficulty: (['Easy', 'Medium', 'Hard'] as const)[i % 3],
  interviewType: ['Technical', 'Behavioral', 'Mixed'][i % 3],
  createdAt: new Date(Date.now() - i * 2 * 86400000).toISOString(),
  status: 'completed',
  report: { id: `report-${i + 1}`, overallScore: 60 + (i * 3) % 40 },
}))

const MOCK_DATA: HistoryData = {
  sessions: MOCK_SESSIONS,
  total: 15,
  page: 1,
  pageSize: 20,
  totalPages: 1,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function difficultyClass(difficulty: string): string {
  switch (difficulty) {
    case 'Easy':   return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'Hard':   return 'bg-red-500/20 text-red-400 border-red-500/30'
    default:       return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

function typeClass(type: string): string {
  switch (type) {
    case 'Technical':   return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'Behavioral':  return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    case 'Mixed':       return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    default:            return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

function scoreChipClass(score: number): string {
  if (score >= 80) return 'bg-green-500/20 text-green-400'
  if (score >= 60) return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-red-500/20 text-red-400'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Animation variants ───────────────────────────────────────────────────────

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: i * 0.05, ease: 'easeOut' },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_80px_120px] gap-4 items-center px-6 py-4 border-b border-gray-800">
      <Skeleton className="h-4 w-24 bg-gray-800" />
      <Skeleton className="h-4 w-40 bg-gray-800" />
      <Skeleton className="h-5 w-20 bg-gray-800 rounded-full" />
      <Skeleton className="h-5 w-16 bg-gray-800 rounded-full" />
      <Skeleton className="h-6 w-10 bg-gray-800 rounded-full mx-auto" />
      <div className="flex gap-2 justify-end">
        <Skeleton className="h-8 w-8 bg-gray-800 rounded-md" />
        <Skeleton className="h-8 w-8 bg-gray-800 rounded-md" />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HistoryPage() {
  const queryClient = useQueryClient()

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [difficulty, setDifficulty] = useState('all')
  const [interviewType, setInterviewType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const search = useDebounce(searchInput, 300)

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1) }, [search, difficulty, interviewType, startDate, endDate])

  // ── Delete dialog state ───────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null)

  // ── Query ─────────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<HistoryData>({
    queryKey: ['history', page, search, difficulty, interviewType, startDate, endDate],
    queryFn: async () => {
      const params: Record<string, unknown> = { page }
      if (search)        params.search        = search
      if (difficulty !== 'all')      params.difficulty      = difficulty
      if (interviewType !== 'all')   params.interviewType   = interviewType
      if (startDate)     params.startDate     = startDate
      if (endDate)       params.endDate       = endDate
      const { data } = await api.get<HistoryData>('/history', { params })
      return data
    },
    initialData: MOCK_DATA,
    staleTime: 30_000,
  })

  // ── Delete mutation ───────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/history/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] })
      setDeleteTarget(null)
    },
  })

  // ── Download PDF ──────────────────────────────────────────────────────────────
  async function handleDownload(session: Session) {
    try {
      const response = await api.get(`/report/${session.report.id}/pdf`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `report-${session.role.replace(/\s+/g, '-')}-${session.id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      // silently fail — backend not connected in mock mode
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────────
  const sessions     = data?.sessions  ?? []
  const total        = data?.total     ?? 0
  const totalPages   = data?.totalPages ?? 1

  const hasFilters =
    searchInput !== '' ||
    difficulty !== 'all' ||
    interviewType !== 'all' ||
    startDate !== '' ||
    endDate !== ''

  function clearFilters() {
    setSearchInput('')
    setDifficulty('all')
    setInterviewType('all')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Interview History</h1>
            <p className="text-sm text-gray-400 mt-1">
              {isLoading ? (
                <Skeleton className="h-4 w-32 bg-gray-800 inline-block" />
              ) : (
                <>{total} session{total !== 1 ? 's' : ''} total</>
              )}
            </p>
          </div>
        </motion.div>

        {/* ── Filter bar ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: 'easeOut' }}
        >
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-end">

                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    placeholder="Search by role…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9 bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500 focus-visible:ring-violet-500"
                  />
                </div>

                {/* Difficulty */}
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700 text-gray-100">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>

                {/* Type */}
                <Select value={interviewType} onValueChange={setInterviewType}>
                  <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700 text-gray-100">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Behavioral">Behavioral</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date range */}
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[150px] bg-gray-800 border-gray-700 text-gray-100 focus-visible:ring-violet-500"
                    aria-label="Start date"
                  />
                  <span className="text-gray-500 text-sm">to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[150px] bg-gray-800 border-gray-700 text-gray-100 focus-visible:ring-violet-500"
                    aria-label="End date"
                  />
                </div>

                {/* Clear filters */}
                <AnimatePresence>
                  {hasFilters && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-gray-400 hover:text-white hover:bg-gray-700 gap-1"
                      >
                        <Filter className="h-3.5 w-3.5" />
                        Clear filters
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Table card ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.14, ease: 'easeOut' }}
        >
          <Card className="bg-gray-900 border-gray-800 overflow-hidden">

            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1fr_1.5fr_1fr_1fr_80px_128px] gap-4 px-6 py-3 border-b border-gray-800 bg-gray-900/80">
              {['Date', 'Role', 'Type', 'Difficulty', 'Score', 'Actions'].map((h) => (
                <span key={h} className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {h}
                </span>
              ))}
            </div>

            {/* Loading skeletons */}
            {isLoading && (
              <div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && sessions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
                <div className="p-4 rounded-full bg-gray-800">
                  <Search className="h-8 w-8 text-gray-500" />
                </div>
                <div>
                  <p className="text-gray-300 font-medium text-lg">No interviews found</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Try adjusting your filters.
                  </p>
                </div>
                {hasFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            {/* Rows */}
            {!isLoading && sessions.length > 0 && (
              <div>
                <AnimatePresence mode="wait">
                  {sessions.map((session, i) => (
                    <motion.div
                      key={session.id}
                      custom={i}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className={cn(
                        'group flex flex-col md:grid md:grid-cols-[1fr_1.5fr_1fr_1fr_80px_128px] gap-2 md:gap-4 items-start md:items-center',
                        'px-6 py-4 border-b border-gray-800 last:border-0',
                        'hover:bg-gray-800/40 transition-colors',
                      )}
                    >
                      {/* Date */}
                      <div>
                        <span className="md:hidden text-xs text-gray-500 mr-1">Date:</span>
                        <span className="text-sm text-gray-300">{formatDate(session.createdAt)}</span>
                      </div>

                      {/* Role */}
                      <div className="min-w-0">
                        <span className="md:hidden text-xs text-gray-500 mr-1">Role:</span>
                        <span className="text-sm font-medium text-white truncate block">{session.role}</span>
                      </div>

                      {/* Type badge */}
                      <div>
                        <span className="md:hidden text-xs text-gray-500 mr-1">Type:</span>
                        <Badge
                          variant="outline"
                          className={cn('text-xs font-medium border', typeClass(session.interviewType))}
                        >
                          {session.interviewType}
                        </Badge>
                      </div>

                      {/* Difficulty badge */}
                      <div>
                        <span className="md:hidden text-xs text-gray-500 mr-1">Difficulty:</span>
                        <Badge
                          variant="outline"
                          className={cn('text-xs font-medium border', difficultyClass(session.difficulty))}
                        >
                          {session.difficulty}
                        </Badge>
                      </div>

                      {/* Score chip */}
                      <div className="flex md:justify-center">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold min-w-[2.5rem]',
                            scoreChipClass(session.report.overallScore),
                          )}
                        >
                          {session.report.overallScore}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 justify-start md:justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(session)}
                          title="Download PDF report"
                          className="h-8 w-8 text-gray-400 hover:text-violet-400 hover:bg-violet-500/10"
                          aria-label={`Download report for ${session.role}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(session)}
                          title="Delete session"
                          className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                          aria-label={`Delete ${session.role} session`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && sessions.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
                <p className="text-sm text-gray-400">
                  Page <span className="text-white font-medium">{page}</span>{' '}
                  of <span className="text-white font-medium">{totalPages}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-40 gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-40 gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* ── Delete confirmation dialog ──────────────────────────────────────── */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-gray-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Interview Session</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete the{' '}
              <span className="text-gray-200 font-medium">
                {deleteTarget?.role}
              </span>{' '}
              session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
