import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/bottom-nav'

export default async function BookingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, teacher:users!bookings_teacher_id_fkey(*), student:users!bookings_student_id_fkey(*)')
    .eq('id', id)
    .single()

  if (!booking) {
    notFound()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { text: 'Confirmée', color: 'bg-green-100 text-green-600' }
      case 'pending':
        return { text: 'En attente', color: 'bg-yellow-100 text-yellow-600' }
      case 'cancelled':
        return { text: 'Annulée', color: 'bg-red-100 text-red-600' }
      default:
        return { text: status, color: 'bg-gray-100 text-gray-600' }
    }
  }

  const status = getStatusBadge(booking.status)

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-24">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100">
        <Link href="/student/schedule">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-[#1A365D]">Détails de Réservation</h1>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Teacher Card */}
        <div className="bg-white rounded-2xl p-6 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#F7F8FA] overflow-hidden">
            {booking.teacher?.avatar_url ? (
              <img src={booking.teacher.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">👨‍🏫</div>
            )}
          </div>
          <h2 className="text-xl font-bold text-[#1A365D]">{booking.teacher?.display_name}</h2>
          <p className="text-[#1A365D]">{booking.subject || 'Mathématiques'}</p>
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          {/* Date */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#E8F4FD] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <span className="text-[#1A365D] font-medium">{formatDate(booking.scheduled_at)}</span>
          </div>

          {/* Subject */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#E8F4FD] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <span className="text-[#1A365D]">{booking.notes || 'Révision du chapitre X'}</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#E8F4FD] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <span className="text-[#1A365D] font-medium">{booking.price || 50} TND</span>
          </div>

          {/* Status */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#E8F4FD] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#1A365D]">Statut:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                {status.text}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            disabled={booking.status !== 'confirmed'}
            className="w-full bg-gray-200 text-gray-500 py-4 rounded-xl font-semibold disabled:opacity-60"
          >
            Rejoindre le Cours
          </button>
          <p className="text-center text-sm text-[#1A365D]">
            Disponible 10 minutes avant le début du cours
          </p>

          <button className="w-full bg-[#E8F4FD] text-[#1A365D] py-4 rounded-xl font-semibold">
            Contacter le Professeur
          </button>

          <button className="w-full text-red-500 py-3 font-semibold">
            Annuler la Réservation
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}