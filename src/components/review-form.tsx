'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ReviewFormProps {
  teacherId: string
  classroomId?: string
  onSuccess?: () => void
}

export default function ReviewForm({ teacherId, classroomId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Veuillez sélectionner une note')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Vous devez être connecté')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('reviews')
      .insert({
        teacher_id: teacherId,
        student_id: user.id,
        classroom_id: classroomId,
        rating,
        comment,
      })

    if (insertError) {
      if (insertError.code === '23505') {
        setError('Vous avez déjà laissé un avis')
      } else {
        setError('Erreur lors de l\'envoi')
      }
      setLoading(false)
      return
    }

    // Update teacher average rating
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('teacher_id', teacherId)

    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      await supabase
        .from('teacher_profiles')
        .update({ rating: Math.round(avgRating * 10) / 10 })
        .eq('user_id', teacherId)
    }

    // Create notification for teacher
    await supabase.rpc('create_notification', {
      p_user_id: teacherId,
      p_type: 'message',
      p_title: 'Nouvel avis reçu',
      p_message: `Vous avez reçu une note de ${rating}/5`,
    })

    setSuccess(true)
    setLoading(false)
    onSuccess?.()
  }

  if (success) {
    return (
      <div className="bg-green-50 rounded-2xl p-6 text-center">
        <span className="text-4xl block mb-2">✅</span>
        <p className="font-semibold text-green-700">Merci pour votre avis !</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6">
      <h3 className="font-bold text-[#1A1A2E] mb-4">Laisser un avis</h3>

      {/* Star Rating */}
      <div className="mb-4">
        <p className="text-sm text-[#6B7280] mb-2">Votre note</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="text-3xl transition-transform hover:scale-110"
            >
              {star <= (hoverRating || rating) ? '⭐' : '☆'}
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="mb-4">
        <p className="text-sm text-[#6B7280] mb-2">Votre commentaire (optionnel)</p>
        <textarea
          placeholder="Partagez votre expérience..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#F5F7FA] focus:outline-none focus:border-[#1E6DD1]"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 mb-4">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="w-full bg-[#F5A623] text-white py-3 rounded-full font-semibold disabled:opacity-50"
      >
        {loading ? 'Envoi...' : 'Envoyer mon avis'}
      </button>
    </form>
  )
}