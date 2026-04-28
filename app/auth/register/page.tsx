'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

export default function RegisterPage() {
  const supabase = createClient()
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [dialCode, setDialCode] = useState('+263')
  const [localPhone, setLocalPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!localPhone.trim()) {
      setError('Please enter your phone number.')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const phone = dialCode + localPhone.replace(/^0+/, '')
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        phone,
        role,
        status: 'unverified',
      })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    router.push('/verify')
    router.refresh()
  }

  return (
    <div className="max-w-sm mx-auto mt-8 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Join Mbare Direct</h1>
        <p className="text-slate-500 text-sm mt-1">Create your account · $10/year membership</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
            placeholder="Tendai Moyo"
          />
        </div>

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
              required
              pattern="[0-9\s\-]+"
              value={localPhone}
              onChange={(e) => setLocalPhone(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
              placeholder="77 123 4567"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
            placeholder="At least 8 characters"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">I am a…</label>
          <div className="flex gap-3">
            {(['buyer', 'seller'] as const).map((r) => (
              <label
                key={r}
                className={`flex-1 border rounded-lg px-3 py-2 text-sm font-medium cursor-pointer text-center ${
                  role === r
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-slate-200 text-slate-600 hover:border-green-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="sr-only"
                />
                {r === 'buyer' ? '🛒 Buyer' : '📢 Seller'}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 text-white rounded-lg px-4 py-2.5 font-semibold text-sm hover:bg-green-600 disabled:opacity-60"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <a href="/auth/login" className="text-green-700 font-semibold hover:underline">
          Sign In
        </a>
      </p>
    </div>
  )
}
