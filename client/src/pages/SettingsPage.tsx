import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Moon, Sun, Monitor, Bell, Mail, Mic, LogOut, Trash2 } from 'lucide-react'

import api from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    prefersDark ? root.classList.add('dark') : root.classList.remove('dark')
  }
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.08, ease: 'easeOut' },
  }),
}

const AI_VOICES = [
  { label: 'Default', value: 'default' },
  { label: 'Neutral Female', value: 'aura-asteria-en' },
  { label: 'Neutral Male', value: 'aura-orion-en' },
  { label: 'British Female', value: 'aura-luna-en' },
  { label: 'British Male', value: 'aura-zeus-en' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const { toast } = useToast()

  // Settings state
  const [theme, setTheme] = useState<Theme>('system')
  const [notifInApp, setNotifInApp] = useState(true)
  const [notifEmail, setNotifEmail] = useState(false)
  const [aiVoice, setAiVoice] = useState('default')

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function persistSettings(patch: Record<string, unknown>) {
    try {
      await api.put('/users/settings', patch)
    } catch {
      // Silently fail — settings are already applied locally
    }
  }

  function handleThemeChange(t: Theme) {
    setTheme(t)
    applyTheme(t)
    persistSettings({ themePreference: t })
    toast({ title: `Theme set to ${t}` })
  }

  function handleNotifInApp(val: boolean) {
    setNotifInApp(val)
    persistSettings({ notificationPrefs: { inApp: val, email: notifEmail } })
  }

  function handleNotifEmail(val: boolean) {
    setNotifEmail(val)
    persistSettings({ notificationPrefs: { inApp: notifInApp, email: val } })
  }

  function handleVoiceChange(val: string) {
    setAiVoice(val)
    persistSettings({ aiVoicePreference: val })
    toast({ title: 'Voice preference saved' })
  }

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  async function handleDeleteAccount() {
    if (deleteInput !== 'DELETE') return
    setDeleting(true)
    try {
      await api.delete('/users/account')
      clearAuth()
      navigate('/')
    } catch {
      toast({ title: 'Failed to delete account', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Settings</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your preferences and account.</p>
        </motion.div>

        {/* 1. Appearance */}
        <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp}>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Monitor className="h-4 w-4 text-violet-400" /> Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300 text-sm mb-3 block">Theme</Label>
                <div className="flex flex-wrap gap-3">
                  {themeOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => handleThemeChange(value)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                        theme === value
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 2. Notifications */}
        <motion.div initial="hidden" animate="visible" custom={2} variants={fadeUp}>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-violet-400" /> Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notif-inapp" className="text-gray-200 text-sm font-medium">
                    In-App Notifications
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Receive notifications inside the app</p>
                </div>
                <Switch
                  id="notif-inapp"
                  checked={notifInApp}
                  onCheckedChange={handleNotifInApp}
                  className="data-[state=checked]:bg-violet-600"
                />
              </div>

              <div className="flex items-center justify-between border-t border-gray-800 pt-4">
                <div>
                  <Label htmlFor="notif-email" className="text-gray-200 text-sm font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    Email Notifications
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Get updates sent to your email</p>
                </div>
                <Switch
                  id="notif-email"
                  checked={notifEmail}
                  onCheckedChange={handleNotifEmail}
                  className="data-[state=checked]:bg-violet-600"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 3. Interview Preferences */}
        <motion.div initial="hidden" animate="visible" custom={3} variants={fadeUp}>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Mic className="h-4 w-4 text-violet-400" /> Interview Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <Label className="text-gray-200 text-sm font-medium">AI Voice</Label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Choose the voice used for AI question narration
                  </p>
                </div>
                <Select value={aiVoice} onValueChange={handleVoiceChange}>
                  <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700 text-gray-100 focus:ring-violet-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                    {AI_VOICES.map((v) => (
                      <SelectItem key={v.value} value={v.value} className="focus:bg-gray-700">
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 4. Account Actions */}
        <motion.div initial="hidden" animate="visible" custom={4} variants={fadeUp}>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full sm:w-auto border-gray-700 text-gray-300 hover:bg-gray-800 gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* 5. Danger Zone */}
        <motion.div initial="hidden" animate="visible" custom={5} variants={fadeUp}>
          <Card className="bg-gray-900 border-red-900/40">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2 text-base">
                <Trash2 className="h-4 w-4" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-400">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                className="bg-red-600/80 hover:bg-red-600 text-white gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteInput('') }}>
        <DialogContent className="bg-gray-900 border-gray-800 text-gray-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Account</DialogTitle>
            <DialogDescription className="text-gray-400">
              This will permanently delete all your data including interviews, reports, and history.
              <br /><br />
              Type <span className="text-red-400 font-mono font-bold">DELETE</span> to confirm.
            </DialogDescription>
          </DialogHeader>

          <Input
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            placeholder='Type "DELETE" to confirm'
            className="bg-gray-800 border-gray-700 text-gray-100 focus-visible:ring-red-500 font-mono"
          />

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setDeleteOpen(false); setDeleteInput('') }}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteInput !== 'DELETE' || deleting}
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting…' : 'Delete My Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
