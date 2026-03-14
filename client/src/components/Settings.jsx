import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { Save, CheckCircle, Bot, Mail } from 'lucide-react'
import { Switch } from './ui/switch'

export default function Settings() {
  const [config, setConfig] = useState({
    claudePath: '',
    smtp: {
      host: '',
      port: 587,
      secure: false,
      user: '',
      password: '',
    },
    defaultFrom: '',
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => setConfig(data))
      .catch(console.error)
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  const updateSmtp = (field, value) => {
    setConfig(prev => ({
      ...prev,
      smtp: { ...prev.smtp, [field]: value }
    }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure claudecron preferences</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Claude CLI</CardTitle>
            </div>
            <CardDescription>Path to the Claude CLI executable</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="claudePath">Claude Path</Label>
              <Input
                id="claudePath"
                placeholder="/usr/local/bin/claude"
                value={config.claudePath || ''}
                onChange={e => setConfig(prev => ({ ...prev, claudePath: e.target.value }))}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Leave empty to use system default</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Email / SMTP</CardTitle>
            </div>
            <CardDescription>Configure outbound email for prompt results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  placeholder="smtp.gmail.com"
                  value={config.smtp?.host || ''}
                  onChange={e => updateSmtp('host', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtpPort">Port</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  placeholder="587"
                  value={config.smtp?.port || ''}
                  onChange={e => updateSmtp('port', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="smtpUser">Username</Label>
                <Input
                  id="smtpUser"
                  placeholder="you@gmail.com"
                  value={config.smtp?.user || ''}
                  onChange={e => updateSmtp('user', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtpPass">Password</Label>
                <Input
                  id="smtpPass"
                  type="password"
                  placeholder="App password"
                  value={config.smtp?.password || ''}
                  onChange={e => updateSmtp('password', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>SSL/TLS</Label>
                <p className="text-xs text-muted-foreground">Enable for port 465, disable for port 587 (STARTTLS)</p>
              </div>
              <Switch
                checked={config.smtp?.secure || false}
                onCheckedChange={val => updateSmtp('secure', val)}
              />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="defaultFrom">Default From Address</Label>
              <Input
                id="defaultFrom"
                type="email"
                placeholder="claudecron@yourdomain.com"
                value={config.defaultFrom || ''}
                onChange={e => setConfig(prev => ({ ...prev, defaultFrom: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Used as the sender for all outgoing emails
              </p>
            </div>

            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Gmail setup</p>
              <p>Use <code className="bg-background px-1 rounded">smtp.gmail.com</code> port 587 with an App Password (requires 2FA).</p>
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Generate app password ↗
              </a>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              Saved
            </div>
          )}
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  )
}
