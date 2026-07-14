import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, X, Plus, Upload, ExternalLink } from 'lucide-react'

import api from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  email: string
  displayName: string
  photoUrl: string | null
  college: string | null
  yearsOfExperience: number
  skills: string[]
  resumeUrl: string | null
  planId: string
  googleId: string | null
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PROFILE: Profile = {
  id: 'user-1',
  email: 'john.doe@example.com',
  displayName: 'John Doe',
  photoUrl: null,
  college: 'MIT',
  yearsOfExperience: 3,
  skills: ['React', 'TypeScript', 'Node.js', 'Python'],
  resumeUrl: '',
  planId: 'free',
  googleId: null,
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100),
  college: z.string().max(200).optional(),
  yearsOfExperience: z.coerce.number().int().min(0).max(30),
  resumeUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
})

type ProfileForm = z.infer<typeof profileSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const storeUser = useAuthStore((s) => s.user)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Skills state
  const [skills, setSkills] = useState<string[]>(MOCK_PROFILE.skills)
  const [skillInput, setSkillInput] = useState('')

  // Photo upload state
  const [photoError, setPhotoError] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)

  // Form
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      college: '',
      yearsOfExperience: 0,
      resumeUrl: '',
    },
  })

  // Fetch profile
  const { data, isLoading } = useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: () => api.get<Profile>('/users/me').then((r) => r.data),
    initialData: MOCK_PROFILE,
  })
  const profile = data as Profile

  // Sync profile to form fields
  useEffect(() => {
    if (profile) {
      setValue('displayName', profile.displayName)
      setValue('college', profile.college ?? '')
      setValue('yearsOfExperience', profile.yearsOfExperience)
      setValue('resumeUrl', profile.resumeUrl ?? '')
      setSkills(profile.skills ?? [])
    }
  }, [profile, setValue])


  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data: ProfileForm & { skills: string[] }) =>
      api.put('/users/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast({ title: '✅ Profile updated successfully!' })
    },
    onError: () => {
      toast({ title: 'Failed to update profile', variant: 'destructive' })
    },
  })

  const onSubmit = (data: ProfileForm) => {
    updateMutation.mutate({ ...data, skills })
  }

  // Skills chip handlers
  const addSkill = (value: string) => {
    const trimmed = value.trim().replace(/,$/, '')
    if (trimmed && !skills.includes(trimmed) && skills.length < 20) {
      setSkills((prev) => [...prev, trimmed])
    }
    setSkillInput('')
  }

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSkill(skillInput)
    }
  }

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill))
  }

  // Photo upload
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo must be less than 5 MB.')
      return
    }

    setPhotoUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      await api.post('/users/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast({ title: '📸 Photo updated!' })
    } catch {
      toast({ title: 'Photo upload failed', variant: 'destructive' })
    } finally {
      setPhotoUploading(false)
    }
  }

  const planLabel = profile?.planId === 'pro' ? 'Pro' : 'Free'
  const planClass =
    profile?.planId === 'pro'
      ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
      : 'bg-gray-700/50 text-gray-300 border-gray-600/50'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Profile</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your personal information and account settings.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Profile card ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
          >
            <Card className="bg-gray-900 border-gray-800 sticky top-6">
              <CardContent className="pt-8 pb-6 flex flex-col items-center text-center gap-4">

                {/* Avatar */}
                <div className="relative group">
                  {isLoading ? (
                    <Skeleton className="h-24 w-24 rounded-full bg-gray-800" />
                  ) : (
                    <Avatar className="h-24 w-24 ring-2 ring-violet-500/30 ring-offset-2 ring-offset-gray-900">
                      <AvatarImage src={profile?.photoUrl ?? ''} alt={profile?.displayName} />
                      <AvatarFallback className="bg-violet-600 text-white text-xl font-bold">
                        {getInitials(profile?.displayName ?? storeUser?.displayName ?? 'U')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>

                {/* Change photo button */}
                <div className="flex flex-col items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 gap-2"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {photoUploading ? 'Uploading…' : 'Change Photo'}
                  </Button>
                  {photoError && (
                    <p className="text-xs text-red-400">{photoError}</p>
                  )}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <p className="text-xs text-gray-600">Max 5 MB</p>
                </div>

                {/* User info */}
                {isLoading ? (
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-6 w-36 mx-auto bg-gray-800" />
                    <Skeleton className="h-4 w-48 mx-auto bg-gray-800" />
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className="text-xl font-bold text-white">{profile?.displayName}</h2>
                      <div className="flex items-center justify-center gap-1.5 mt-1 text-sm text-gray-400">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[200px]">{profile?.email}</span>
                        <Lock className="h-3 w-3 text-gray-600" />
                      </div>
                    </div>

                    {/* Plan badge */}
                    <Badge
                      variant="outline"
                      className={cn('text-xs font-semibold border px-3 py-1', planClass)}
                    >
                      {planLabel} Plan
                    </Badge>

                    {/* Quick stats */}
                    <div className="w-full border-t border-gray-800 pt-4 grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">12</p>
                        <p className="text-xs text-gray-500 mt-0.5">Interviews</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">74</p>
                        <p className="text-xs text-gray-500 mt-0.5">Avg Score</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Right: Edit forms ───────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Edit Profile card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.12, ease: 'easeOut' }}
            >
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Edit Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Display Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="displayName" className="text-gray-300">Display Name</Label>
                        <Input
                          id="displayName"
                          {...register('displayName')}
                          className="bg-gray-800 border-gray-700 text-gray-100 focus-visible:ring-violet-500"
                          placeholder="Your name"
                        />
                        {errors.displayName && (
                          <p className="text-xs text-red-400">{errors.displayName.message}</p>
                        )}
                      </div>

                      {/* College */}
                      <div className="space-y-1.5">
                        <Label htmlFor="college" className="text-gray-300">College / Institution</Label>
                        <Input
                          id="college"
                          {...register('college')}
                          className="bg-gray-800 border-gray-700 text-gray-100 focus-visible:ring-violet-500"
                          placeholder="e.g. MIT"
                        />
                      </div>

                      {/* Years of Experience */}
                      <div className="space-y-1.5">
                        <Label htmlFor="yearsOfExperience" className="text-gray-300">Years of Experience</Label>
                        <Input
                          id="yearsOfExperience"
                          type="number"
                          min={0}
                          max={30}
                          {...register('yearsOfExperience')}
                          className="bg-gray-800 border-gray-700 text-gray-100 focus-visible:ring-violet-500"
                        />
                        {errors.yearsOfExperience && (
                          <p className="text-xs text-red-400">{errors.yearsOfExperience.message}</p>
                        )}
                      </div>

                      {/* Resume URL */}
                      <div className="space-y-1.5">
                        <Label htmlFor="resumeUrl" className="text-gray-300">Resume URL</Label>
                        <div className="relative">
                          <Input
                            id="resumeUrl"
                            {...register('resumeUrl')}
                            className="bg-gray-800 border-gray-700 text-gray-100 focus-visible:ring-violet-500 pr-8"
                            placeholder="https://..."
                          />
                          <ExternalLink className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                        </div>
                        {errors.resumeUrl && (
                          <p className="text-xs text-red-400">{errors.resumeUrl.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="space-y-2">
                      <Label className="text-gray-300">
                        Skills{' '}
                        <span className="text-gray-600 font-normal text-xs ml-1">
                          (press Enter or comma to add, max 20)
                        </span>
                      </Label>

                      {/* Chips */}
                      <div className="min-h-[2.5rem] flex flex-wrap gap-2 p-2 rounded-lg border border-gray-700 bg-gray-800">
                        <AnimatePresence>
                          {skills.map((skill) => (
                            <motion.div
                              key={skill}
                              layout
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.15 }}
                            >
                              <Badge
                                variant="outline"
                                className="bg-violet-500/15 text-violet-300 border-violet-500/30 gap-1 pr-1 text-xs"
                              >
                                {skill}
                                <button
                                  type="button"
                                  onClick={() => removeSkill(skill)}
                                  className="hover:text-white transition-colors ml-0.5"
                                  aria-label={`Remove ${skill}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {/* Skill input */}
                        {skills.length < 20 && (
                          <input
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyDown={handleSkillKeyDown}
                            onBlur={() => skillInput.trim() && addSkill(skillInput)}
                            placeholder={skills.length === 0 ? 'Add a skill…' : ''}
                            className="flex-1 min-w-[100px] bg-transparent text-sm text-gray-200 placeholder:text-gray-600 outline-none"
                          />
                        )}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting || updateMutation.isPending}
                      className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
                    >
                      {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Linked Accounts card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.18, ease: 'easeOut' }}
            >
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Linked Accounts</CardTitle>
                  <p className="text-sm text-gray-400">
                    Link accounts to enable additional sign-in options.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                    {/* Google logo + label */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Google</p>
                        <p className="text-xs text-gray-500">
                          {profile?.googleId ? 'Connected' : 'Not connected'}
                        </p>
                      </div>
                    </div>

                    {/* Action */}
                    {profile?.googleId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-red-400 hover:border-red-500/40"
                        onClick={() => {
                          toast({ title: 'Unlink feature coming soon', variant: 'destructive' })
                        }}
                      >
                        Unlink
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-700 text-gray-300 hover:bg-gray-800 gap-1.5"
                        onClick={() => {
                          window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/auth/google`
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Link Google
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  )
}
