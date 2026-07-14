import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react'

import api from '@/lib/axios'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Schema ────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  role: z.string().min(1, 'Role is required').max(100, 'Role must be 100 characters or less'),
  experienceYears: z
    .number({ invalid_type_error: 'Experience is required' })
    .int()
    .min(0, 'Minimum 0 years')
    .max(30, 'Maximum 30 years'),
  language: z.string().min(1, 'Language is required'),
  company: z.string().min(1, 'Select a target company'),
})

const step2Schema = z.object({
  difficulty: z.enum(['Intern', 'Fresher', 'Junior', 'Mid', 'Senior', 'Staff', 'Principal'], {
    required_error: 'Select a difficulty',
  }),
  interviewType: z.enum(['HR', 'Technical', 'SystemDesign', 'Behavioral', 'Coding', 'Managerial', 'Mixed'], {
    required_error: 'Select an interview type',
  }),
  personality: z.string().min(1, 'Select a recruiter personality'),
  questionCount: z
    .number({ invalid_type_error: 'Question count is required' })
    .int()
    .min(3, 'Minimum 3 questions')
    .max(20, 'Maximum 20 questions'),
})

const step3Schema = z.object({
  techStack: z.array(z.string()).min(1, 'Select at least one technology'),
})

const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema)

type FormData = z.infer<typeof fullSchema>

// ─── Constants ─────────────────────────────────────────────────────────────

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Hindi', 'Chinese', 'Japanese', 'Portuguese',
]

const COMPANIES = [
  'Google', 'Amazon', 'Microsoft', 'Adobe', 'Atlassian', 'Goldman Sachs', 'Deloitte', 'TCS', 'Infosys', 'Startup',
]

const PERSONALITIES = [
  'Friendly', 'Strict', 'Aggressive', 'FAANG Style', 'Startup Founder', 'Senior Eng Manager',
]

const DIFFICULTY_OPTIONS: Array<'Intern' | 'Fresher' | 'Junior' | 'Mid' | 'Senior' | 'Staff' | 'Principal'> = [
  'Intern', 'Fresher', 'Junior', 'Mid', 'Senior', 'Staff', 'Principal',
]

const TYPE_OPTIONS: Array<'HR' | 'Technical' | 'SystemDesign' | 'Behavioral' | 'Coding' | 'Managerial' | 'Mixed'> = [
  'HR', 'Technical', 'SystemDesign', 'Behavioral', 'Coding', 'Managerial', 'Mixed',
]

const TECH_OPTIONS = [
  'React', 'Vue', 'Angular', 'Next.js', 'TypeScript', 'JavaScript',
  'Node.js', 'Express', 'Python', 'FastAPI', 'Django', 'Java',
  'Spring', 'Go', 'Rust', 'PostgreSQL', 'MongoDB', 'Redis',
  'AWS', 'Docker', 'Kubernetes', 'GraphQL', 'REST API', 'System Design',
]

const STEP_LABELS = ['Basic Info', 'Interview Setup', 'Tech Stack']

// ─── Animation Variants ───────────────────────────────────────────────────

const getVariants = (direction: number) => ({
  enter: { x: direction > 0 ? 60 : -60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: direction > 0 ? -60 : 60, opacity: 0 },
})

// ─── Progress Indicator ───────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1
        const isCompleted = step < current
        const isActive = step === current
        return (
          <div key={step} className="flex items-center">
            {/* circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300',
                  isCompleted
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : isActive
                    ? 'bg-transparent border-violet-500 text-violet-400'
                    : 'bg-transparent border-gray-700 text-gray-600',
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  isActive ? 'text-violet-400' : isCompleted ? 'text-violet-500' : 'text-gray-600',
                )}
              >
                {label}
              </span>
            </div>
            {/* connector */}
            {i < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-16 sm:w-24 mx-2 mb-5 rounded-full transition-all duration-300',
                  isCompleted ? 'bg-violet-600' : 'bg-gray-800',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Field Error ──────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-xs text-red-400 mt-1">{message}</p>
  )
}

// ─── Step 1 ───────────────────────────────────────────────────────────────

function Step1({ control, errors }: { control: any; errors: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Basic Information</h2>
        <p className="text-sm text-gray-400">Tell us about the role you're preparing for.</p>
      </div>

      {/* Role */}
      <div className="space-y-1.5">
        <Label htmlFor="role" className="text-gray-300">
          Role <span className="text-red-400">*</span>
        </Label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="role"
              placeholder="e.g. Senior Frontend Engineer"
              maxLength={100}
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 focus-visible:ring-violet-500"
            />
          )}
        />
        <FieldError message={errors.role?.message} />
      </div>

      {/* Experience */}
      <div className="space-y-1.5">
        <Label htmlFor="experienceYears" className="text-gray-300">
          Years of Experience <span className="text-red-400">*</span>
        </Label>
        <Controller
          name="experienceYears"
          control={control}
          render={({ field }) => (
            <Input
              id="experienceYears"
              type="number"
              min={0}
              max={30}
              placeholder="0 – 30"
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 focus-visible:ring-violet-500"
              value={field.value === undefined ? '' : field.value}
              onChange={(e) => {
                const val = e.target.value
                field.onChange(val === '' ? undefined : Number(val))
              }}
            />
          )}
        />
        <FieldError message={errors.experienceYears?.message} />
      </div>

      {/* Language */}
      <div className="space-y-1.5">
        <Label htmlFor="language" className="text-gray-300">
          Interview Language <span className="text-red-400">*</span>
        </Label>
        <Controller
          name="language"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger
                id="language"
                className="bg-gray-900 border-gray-700 text-white focus:ring-violet-500"
              >
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                {LANGUAGES.map((lang) => (
                  <SelectItem
                    key={lang}
                    value={lang}
                    className="focus:bg-violet-600/30 focus:text-white"
                  >
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.language?.message} />
      </div>

      {/* Company */}
      <div className="space-y-1.5">
        <Label htmlFor="company" className="text-gray-300">
          Target Company <span className="text-red-400">*</span>
        </Label>
        <Controller
          name="company"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger
                id="company"
                className="bg-gray-900 border-gray-700 text-white focus:ring-violet-500"
              >
                <SelectValue placeholder="Select target company" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                {COMPANIES.map((comp) => (
                  <SelectItem
                    key={comp}
                    value={comp}
                    className="focus:bg-violet-600/30 focus:text-white"
                  >
                    {comp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.company?.message} />
      </div>
    </div>
  )
}

function Step2({ control, errors }: { control: any; errors: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Interview Setup</h2>
        <p className="text-sm text-gray-400">Configure the format and difficulty of your session.</p>
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <Label className="text-gray-300">
          Difficulty <span className="text-red-400">*</span>
        </Label>
        <Controller
          name="difficulty"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => field.onChange(opt)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
                    field.value === opt
                      ? 'bg-violet-600/25 border-violet-500 text-violet-300 shadow-[0_0_8px_rgba(139,92,246,0.2)]'
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        />
        <FieldError message={errors.difficulty?.message} />
      </div>

      {/* Interview Type */}
      <div className="space-y-2">
        <Label className="text-gray-300">
          Interview Type <span className="text-red-400">*</span>
        </Label>
        <Controller
          name="interviewType"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => field.onChange(opt)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
                    field.value === opt
                      ? 'bg-violet-600/25 border-violet-500 text-violet-300 shadow-[0_0_8px_rgba(139,92,246,0.2)]'
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        />
        <FieldError message={errors.interviewType?.message} />
      </div>

      {/* Personality */}
      <div className="space-y-2">
        <Label className="text-gray-300">
          Interviewer Personality <span className="text-red-400">*</span>
        </Label>
        <Controller
          name="personality"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {PERSONALITIES.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => field.onChange(opt)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
                    field.value === opt
                      ? 'bg-violet-600/25 border-violet-500 text-violet-300 shadow-[0_0_8px_rgba(139,92,246,0.2)]'
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        />
        <FieldError message={errors.personality?.message} />
      </div>

      {/* Question Count */}
      <div className="space-y-2">
        <Label htmlFor="questionCount" className="text-gray-300">
          Number of Questions <span className="text-gray-500 text-xs font-normal">(3 – 20)</span>
        </Label>
        <Controller
          name="questionCount"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-4">
              <input
                id="questionCount"
                type="range"
                min={3}
                max={20}
                step={1}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className="flex-1 accent-violet-500 h-2 cursor-pointer bg-gray-800"
              />
              <span className="w-10 text-center text-white font-semibold tabular-nums">
                {field.value}
              </span>
            </div>
          )}
        />
        <FieldError message={errors.questionCount?.message} />
      </div>
    </div>
  )
}

// ─── Step 3 ───────────────────────────────────────────────────────────────

function Step3({ control, errors }: { control: any; errors: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Tech Stack</h2>
        <p className="text-sm text-gray-400">Select the technologies relevant to your interview.</p>
      </div>

      <Controller
        name="techStack"
        control={control}
        render={({ field }) => {
          const selected: string[] = field.value ?? []
          const toggle = (tech: string) => {
            if (selected.includes(tech)) {
              field.onChange(selected.filter((t) => t !== tech))
            } else {
              field.onChange([...selected, tech])
            }
          }
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {TECH_OPTIONS.map((tech) => {
                  const isSelected = selected.includes(tech)
                  return (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => toggle(tech)}
                      className={cn(
                        'px-2 py-2 rounded-lg text-xs font-medium border transition-all duration-150 text-center',
                        isSelected
                          ? 'bg-violet-600/25 border-violet-500 text-violet-300 shadow-[0_0_8px_rgba(139,92,246,0.3)]'
                          : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300',
                      )}
                    >
                      {tech}
                    </button>
                  )
                })}
              </div>

              {/* Selected count */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                <span className="text-xs text-gray-500">
                  {selected.length === 0
                    ? 'No technologies selected'
                    : `${selected.length} technolog${selected.length === 1 ? 'y' : 'ies'} selected`}
                </span>
                {selected.length > 0 && (
                  <button
                    type="button"
                    onClick={() => field.onChange([])}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )
        }}
      />
      <FieldError message={errors.techStack?.message} />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function CreateInterviewPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)

  const {
    control,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      role: '',
      experienceYears: undefined,
      language: '',
      company: '',
      difficulty: undefined,
      interviewType: undefined,
      personality: '',
      questionCount: 8,
      techStack: [],
    },
    mode: 'onTouched',
  })

  // ── Mutation ──────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post<{ sessionId: string }>('/interview/create', data).then((r) => r.data),
    onSuccess: ({ sessionId }) => {
      navigate(`/interview/${sessionId}/lobby`)
    },
  })

  // ── Step validation fields ────────────────────────────────────────────
  const STEP_FIELDS: Record<number, Array<keyof FormData>> = {
    1: ['role', 'experienceYears', 'language', 'company'],
    2: ['difficulty', 'interviewType', 'personality', 'questionCount'],
    3: ['techStack'],
  }

  const handleNext = async () => {
    const valid = await trigger(STEP_FIELDS[step])
    if (!valid) return
    if (step < 3) {
      setDirection(1)
      setStep((s) => s + 1)
    } else {
      // Final step — submit
      const valid = await trigger()
      if (!valid) return
      createMutation.mutate(getValues())
    }
  }

  const handleBack = () => {
    setDirection(-1)
    setStep((s) => s - 1)
  }

  const variants = getVariants(direction)

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">New Interview</h1>
          <p className="text-gray-400 mt-1 text-sm">Configure your AI-powered mock interview session</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator current={step} />

        {/* Card */}
        <Card className="bg-gray-900 border-gray-800 shadow-2xl overflow-hidden">
          <CardContent className="p-6 sm:p-8 min-h-[380px] flex flex-col">
            {/* Animated step content */}
            <div className="flex-1 relative overflow-hidden">
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="absolute inset-0 overflow-y-auto"
                >
                  {step === 1 && <Step1 control={control} errors={errors} />}
                  {step === 2 && <Step2 control={control} errors={errors} />}
                  {step === 3 && <Step3 control={control} errors={errors} />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* API error */}
            {createMutation.isError && (
              <div className="mt-4 px-3 py-2 rounded-md bg-red-900/30 border border-red-800 text-red-400 text-sm">
                {(createMutation.error as any)?.response?.data?.message ??
                  'Failed to create interview. Please try again.'}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-800">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={step === 1}
                className="text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-0 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>

              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={cn(
                      'rounded-full transition-all duration-300',
                      s === step ? 'w-5 h-1.5 bg-violet-500' : 'w-1.5 h-1.5 bg-gray-700',
                    )}
                  />
                ))}
              </div>

              <Button
                type="button"
                onClick={handleNext}
                disabled={createMutation.isPending}
                className={cn(
                  'font-semibold transition-all duration-200',
                  step === 3
                    ? 'bg-violet-600 hover:bg-violet-500 text-white px-6'
                    : 'bg-violet-600 hover:bg-violet-500 text-white',
                )}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : step === 3 ? (
                  <>
                    Start Interview
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer hint */}
        <p className="text-center text-xs text-gray-600 mt-4">
          Step {step} of 3 — {STEP_LABELS[step - 1]}
        </p>
      </div>
    </div>
  )
}
