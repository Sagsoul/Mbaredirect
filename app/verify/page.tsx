'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Step = 1 | 2 | 3

const STEPS = [
  { num: 1, label: 'Pay' },
  { num: 2, label: 'Upload ID' },
  { num: 3, label: 'Done' },
]

export default function VerifyPage() {
  const supabase = createClient()

  const [step, setStep] = useState<Step>(1)
  const [ecocashRef, setEcocashRef] = useState('')
  const [ecocashName, setEcocashName] = useState('')
  const [idFile, setIdFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ecocashRef.trim() || !ecocashName.trim()) {
      setError('Please fill in both fields.')
      return
    }
    setError('')
    setStep(2)
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!idFile || !selfieFile) {
      setError('Please upload both your National ID and selfie.')
      return
    }

    if (idFile.size > 5 * 1024 * 1024 || selfieFile.size > 5 * 1024 * 1024) {
      setError('Each file must be under 5 MB.')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be signed in.')
      setLoading(false)
      return
    }

    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png']

    const idExt = (idFile.name.split('.').pop() ?? '').toLowerCase()
    const selfieExt = (selfieFile.name.split('.').pop() ?? '').toLowerCase()

    if (!ALLOWED_EXTENSIONS.includes(idExt) || !ALLOWED_EXTENSIONS.includes(selfieExt)) {
      setError('Only JPG and PNG images are accepted.')
      setLoading(false)
      return
    }

    const idPath = `${user.id}/national_id_${Date.now()}.${idExt}`
    const selfiePath = `${user.id}/selfie_${Date.now()}.${selfieExt}`

    const [idUpload, selfieUpload] = await Promise.all([
      supabase.storage.from('verifications').upload(idPath, idFile, { upsert: true }),
      supabase.storage.from('verifications').upload(selfiePath, selfieFile, { upsert: true }),
    ])

    if (idUpload.error || selfieUpload.error) {
      setError(idUpload.error?.message ?? selfieUpload.error?.message ?? 'Upload failed.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ecocash_ref: ecocashRef,
        ecocash_name: ecocashName,
        national_id_url: idUpload.data.path,
        selfie_url: selfieUpload.data.path,
        status: 'pending',
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Record subscription
    await supabase.from('subscriptions').insert({
      user_id: user.id,
      ecocash_ref: ecocashRef,
      status: 'pending',
    })

    setLoading(false)
    setStep(3)
  }

  return (
    <div className="max-w-sm mx-auto mt-8 space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= s.num
                  ? 'bg-green-700 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </div>
            <span
              className={`ml-1 text-xs font-medium ${step >= s.num ? 'text-green-700' : 'text-slate-400'}`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px mx-2 ${step > s.num ? 'bg-green-700' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — Pay */}
      {step === 1 && (
        <form onSubmit={handlePaymentSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">💸 Pay $10 via EcoCash</h2>
            <p className="text-sm text-slate-500 mt-1">
              Send <strong>USD $10</strong> to <strong>0771 234 567</strong> (Mbare Direct).<br />
              Then enter your EcoCash transaction reference below.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{error}</div>
          )}

          <div className="space-y-1">
            <label htmlFor="ecocashName" className="block text-sm font-medium text-slate-700">
              EcoCash Registered Name
            </label>
            <input
              id="ecocashName"
              type="text"
              required
              value={ecocashName}
              onChange={(e) => setEcocashName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
              placeholder="As shown on your EcoCash account"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="ecocashRef" className="block text-sm font-medium text-slate-700">
              EcoCash Transaction Reference
            </label>
            <input
              id="ecocashRef"
              type="text"
              required
              value={ecocashRef}
              onChange={(e) => setEcocashRef(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
              placeholder="e.g. ECO240101ABCD12"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-700 text-white rounded-lg px-4 py-2.5 font-semibold text-sm hover:bg-green-600"
          >
            Continue to Upload →
          </button>
        </form>
      )}

      {/* Step 2 — Upload ID */}
      {step === 2 && (
        <form onSubmit={handleUploadSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">📄 Upload Your ID</h2>
            <p className="text-sm text-slate-500 mt-1">
              Upload a clear photo of your National ID and a selfie. JPG or PNG, max 5 MB each.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{error}</div>
          )}

          <div className="space-y-1">
            <label htmlFor="nationalId" className="block text-sm font-medium text-slate-700">
              National ID Photo
            </label>
            <input
              id="nationalId"
              type="file"
              accept="image/jpeg,image/png"
              required
              onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-green-50 file:text-green-700 file:font-semibold file:text-xs"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="selfie" className="block text-sm font-medium text-slate-700">
              Selfie (hold your ID)
            </label>
            <input
              id="selfie"
              type="file"
              accept="image/jpeg,image/png"
              required
              onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-green-50 file:text-green-700 file:font-semibold file:text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white rounded-lg px-4 py-2.5 font-semibold text-sm hover:bg-green-600 disabled:opacity-60"
          >
            {loading ? 'Uploading…' : 'Submit for Verification'}
          </button>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full border border-green-700 text-green-700 rounded-lg px-4 py-2.5 font-semibold text-sm hover:bg-green-50"
          >
            ← Back
          </button>
        </form>
      )}

      {/* Step 3 — Pending */}
      {step === 3 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-slate-900">Submitted!</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Our team will verify your details within <strong>24 hours</strong>.<br />
            We check your EcoCash payment and match your ID name.
          </p>
          <a
            href="/"
            className="inline-block bg-green-700 text-white rounded-lg px-5 py-2 font-semibold text-sm hover:bg-green-600"
          >
            Browse the Feed →
          </a>
        </div>
      )}
    </div>
  )
}
