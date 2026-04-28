'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const DIAL_CODES = [
  { code: '+263', label: '🇿🇼 +263 Zimbabwe' },
  { code: '+27', label: '🇿🇦 +27 South Africa' },
  { code: '+260', label: '🇿🇲 +260 Zambia' },
  { code: '+267', label: '🇧🇼 +267 Botswana' },
  { code: '+258', label: '🇲🇿 +258 Mozambique' },
  { code: '+255', label: '🇹🇿 +255 Tanzania' },
  { code: '+254', label: '🇰🇪 +254 Kenya' },
  { code: '+234', label: '🇳🇬 +234 Nigeria' },
  { code: '+233', label: '🇬🇭 +233 Ghana' },
  { code: '+44', label: '🇬🇧 +44 UK' },
  { code: '+1', label: '🇺🇸 +1 USA/Canada' },
  { code: '+61', label: '🇦🇺 +61 Australia' },
  { code: '+971', label: '🇦🇪 +971 UAE' },
]

interface Profile {
  id: string
  full_name: string
  phone: string | null
  role: string
  status: string
  avatar_url: string | null
  ecocash_name: string | null
  ecocash_ref: string | null
  created_at: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function parsePhone(phone: string | null): { dialCode: string; local: string } {
  if (!phone) return { dialCode: '+263', local: '' }
  const sorted = [...DIAL_CODES].sort((a, b) => b.code.length - a.code.length)
  for (const d of sorted) {
    if (phone.startsWith(d.code)) {
      return { dialCode: d.code, local: phone.slice(d.code.length) }
    }
  }
  return { dialCode: '+263', local: phone }
}

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function ProfileClient({
  user,
  profile,
}: {
  user: User
  profile: Profile | null
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parsed = parsePhone(profile?.phone ?? null)
  const [dialCode, setDialCode] = useState(parsed.dialCode)
  const [localPhone, setLocalPhone] = useState(parsed.local)
  const [ecocashName, setEcocashName] = useState(profile?.ecocash_name ?? '')
  const [ecocashRef, setEcocashRef] = useState(profile?.ecocash_ref ?? '')

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarPath, setAvatarPath] = useState<string | null>(profile?.avatar_url ?? null)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [avatarSuccess, setAvatarSuccess] = useState('')

  // Public URL for existing avatar
  const existingAvatarUrl = avatarPath
    ? supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl
    : null

  const displayAvatarUrl = avatarPreview ?? existingAvatarUrl

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB.')
      return
    }

    setError('')
    setAvatarSuccess('')
    setUploading(true)

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const storagePath = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setError(uploadError.message)
      setAvatarPreview(null)
      setUploading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: storagePath })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setAvatarPath(storagePath)
      setAvatarSuccess('✅ Photo updated!')
    }

    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const phone = dialCode + localPhone.replace(/^0+/, '')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        phone,
        ecocash_name: ecocashName || null,
        ecocash_ref: ecocashRef || null,
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Profile updated successfully.')
    }

    setSaving(false)
  }

  const fullName = profile?.full_name ?? 'Unknown'
  const role = profile?.role ?? 'buyer'
  const status = profile?.status ?? 'unverified'
  const createdAt = profile?.created_at ?? new Date().toISOString()

  return (
    <div className="max-w-sm mx-auto mt-8 space-y-6">
      <div className="text-center">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--charcoal)' }}
        >
          My Profile
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Update your details below
        </p>
      </div>

      {/* Avatar section */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: 'var(--green)', border: '3px solid var(--amber)' }}
        >
          {displayAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayAvatarUrl}
              alt={fullName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontWeight: 700,
                fontSize: '2rem',
                color: '#fff',
              }}
            >
              {getInitials(fullName)}
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60"
          style={{
            backgroundColor: 'var(--amber)',
            color: 'var(--charcoal)',
            fontFamily: 'var(--font-ui)',
          }}
        >
          {uploading ? 'Uploading…' : 'Change photo'}
        </button>
        {avatarSuccess && (
          <p className="text-xs font-medium" style={{ color: '#065f46' }}>{avatarSuccess}</p>
        )}
      </div>

      {/* Info panel */}
      <div
        className="rounded-xl p-4 flex gap-6 justify-center text-sm"
        style={{ backgroundColor: 'var(--green-pale)', border: '1px solid var(--green-light)' }}
      >
        <div className="text-center">
          <p className="font-semibold" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Role
          </p>
          <p className="font-bold mt-0.5" style={{ color: 'var(--charcoal)' }}>
            {role === 'buyer' ? '🛒 Buyer' : role === 'seller' ? '📢 Seller' : '🛡 Admin'}
          </p>
        </div>
        <div className="text-center">
          <p className="font-semibold" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Status
          </p>
          <p className="font-bold mt-0.5">
            {status === 'verified' ? (
              <span style={{ color: '#065f46' }}>✅ Verified</span>
            ) : status === 'pending' ? (
              <span style={{ color: '#92400e' }}>⏳ Pending</span>
            ) : (
              <span style={{ color: '#991b1b' }}>⚠ Unverified</span>
            )}
          </p>
        </div>
        <div className="text-center">
          <p className="font-semibold" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Member since
          </p>
          <p className="font-bold mt-0.5" style={{ color: 'var(--charcoal)' }}>
            {formatMemberSince(createdAt)}
          </p>
        </div>
      </div>

      {/* Edit form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-2 text-sm">
            {success}
          </div>
        )}

        {/* Full Name — read-only */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700 flex items-center gap-1">
            Full Name <span title="Cannot be changed">🔒</span>
          </label>
          <input
            type="text"
            value={fullName}
            readOnly
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
          />
          <p className="text-xs text-slate-400">Your legal name cannot be changed after registration.</p>
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
            Phone Number
          </label>
          <div className="flex gap-2">
            <select
              value={dialCode}
              onChange={(e) => setDialCode(e.target.value)}
              className="border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10 bg-white"
            >
              {DIAL_CODES.map((d) => (
                <option key={d.code} value={d.code}>{d.label}</option>
              ))}
            </select>
            <input
              id="phone"
              type="tel"
              pattern="[0-9\s\-]+"
              value={localPhone}
              onChange={(e) => setLocalPhone(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
              placeholder="77 123 4567"
            />
          </div>
        </div>

        {/* EcoCash Name */}
        <div className="space-y-1">
          <label htmlFor="ecocashName" className="block text-sm font-medium text-slate-700">
            EcoCash Name
          </label>
          <input
            id="ecocashName"
            type="text"
            value={ecocashName}
            onChange={(e) => setEcocashName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
            placeholder="Name on EcoCash account"
          />
        </div>

        {/* EcoCash Ref */}
        <div className="space-y-1">
          <label htmlFor="ecocashRef" className="block text-sm font-medium text-slate-700">
            EcoCash Reference
          </label>
          <input
            id="ecocashRef"
            type="text"
            value={ecocashRef}
            onChange={(e) => setEcocashRef(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
            placeholder="e.g. EC12345678"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-green-700 text-white rounded-lg px-4 py-2.5 font-semibold text-sm hover:bg-green-600 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
