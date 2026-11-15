'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useGeoLocation } from '@/lib/payment/useGeoLocation'
import { convertPrice, formatPrice } from '@/lib/payment/config'
import Link from 'next/link'

interface Teacher {
  id: string
  name: string
  hourly_rate: number
}

interface TimeSlot {
  date: string
  time: string
  available: boolean
}

export default function BookingPage({ params }: { params: { teacherId: string } }) {
  const router = useRouter()
  const { paymentConfig, loading: geoLoading } = useGeoLocation()

  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [duration, setDuration] = useState<number>(60)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Charger les disponibilités
  useEffect(() => {
    async function fetchAvailability() {
      const supabase = createClient()

      try {
        const response = await fetch(`/api/teachers/${params.teacherId}/availability`)
        const data = await response.json()

        if (response.ok) {
          setTeacher(data.teacher)
          setSlots(data.slots)
        } else {
          setError(data.error || 'Erreur lors du chargement')
        }
      } catch (err) {
        console.error('Error fetching availability:', err)
        setError('Erreur de connexion')
      } finally {
        setLoading(false)
      }
    }

    fetchAvailability()
  }, [params.teacherId])

  // Calculer le prix
  const calculatePrice = () => {
    if (!teacher || !paymentConfig) return 0
    const priceEur = (teacher.hourly_rate * duration) / 60
    return convertPrice(priceEur, paymentConfig)
  }

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !paymentConfig || !teacher) {
      setError('Veuillez sélectionner une date et une heure')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Construire la date complète
      const [hours, minutes] = selectedTime.split(':')
      const scheduledDate = new Date(selectedDate)
      scheduledDate.setHours(parseInt(hours), parseInt(minutes || '0'), 0, 0)

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: params.teacherId,
          scheduled_at: scheduledDate.toISOString(),
          duration,
          student_notes: notes,
          currency: paymentConfig.currency,
          exchangeRate: paymentConfig.exchangeRate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la réservation')
      }

      // Rediriger vers Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Booking error:', err)
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setProcessing(false)
    }
  }

  // Grouper les créneaux par date
  const slotsByDate: Record<string, TimeSlot[]> = {}
  slots.forEach((slot) => {
    const date = new Date(slot.date).toLocaleDateString('fr-FR')
    if (!slotsByDate[date]) {
      slotsByDate[date] = []
    }
    slotsByDate[date].push(slot)
  })

  const availableDates = Object.keys(slotsByDate).slice(0, 14) // Les 14 premiers jours

  if (loading || geoLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '4px solid #e5e7eb', borderTopColor: '#2b8cee', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <p style={{ color: '#617589' }}>Chargement des disponibilités...</p>
        </div>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center', padding: '0 20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
          Professeur non trouvé
        </h1>
        <Link href="/search" style={{ color: '#2b8cee' }}>
          Retour à la recherche
        </Link>
      </div>
    )
  }

  const localPrice = calculatePrice()
  const formattedPrice = paymentConfig ? formatPrice(localPrice, paymentConfig) : `${localPrice}€`

  return (
    <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px' }}>
      <Link href="/search" style={{ color: '#617589', fontSize: '14px', marginBottom: '24px', display: 'inline-block' }}>
        ← Retour
      </Link>

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '32px' }}>
        Réserver une session avec {teacher.name}
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }}>
        {/* Gauche: Sélection */}
        <div>
          {/* Sélection de durée */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Durée de la session</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[30, 60, 90, 120].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: duration === d ? '2px solid #2b8cee' : '2px solid #e5e7eb',
                    backgroundColor: duration === d ? '#eff6ff' : 'white',
                    cursor: 'pointer',
                    fontWeight: duration === d ? '600' : '400',
                    color: duration === d ? '#2b8cee' : '#111418',
                  }}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Sélection de date */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Choisir une date</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
              {availableDates.map((date) => {
                const hasAvailable = slotsByDate[date].some((s) => s.available)
                return (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDate(slotsByDate[date][0].date.split('T')[0])
                      setSelectedTime(null)
                    }}
                    disabled={!hasAvailable}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '8px',
                      border: selectedDate === slotsByDate[date][0].date.split('T')[0] ? '2px solid #2b8cee' : '2px solid #e5e7eb',
                      backgroundColor: !hasAvailable ? '#f9fafb' : selectedDate === slotsByDate[date][0].date.split('T')[0] ? '#eff6ff' : 'white',
                      cursor: hasAvailable ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: selectedDate === slotsByDate[date][0].date.split('T')[0] ? '600' : '400',
                      color: !hasAvailable ? '#9ca3af' : '#111418',
                    }}
                  >
                    {date}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sélection d'heure */}
          {selectedDate && (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Choisir une heure</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {slotsByDate[new Date(selectedDate).toLocaleDateString('fr-FR')]
                  ?.filter((s) => s.available)
                  .slice(0, 16)
                  .map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedTime(slot.time)}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: selectedTime === slot.time ? '2px solid #2b8cee' : '2px solid #e5e7eb',
                        backgroundColor: selectedTime === slot.time ? '#eff6ff' : 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: selectedTime === slot.time ? '600' : '400',
                        color: '#111418',
                      }}
                    >
                      {slot.time}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Notes (optionnel)</h2>
            <p style={{ fontSize: '14px', color: '#617589', marginBottom: '12px' }}>
              Précisez ce que vous souhaitez apprendre lors de cette session
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Je souhaite revoir les équations du second degré..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        {/* Droite: Récapitulatif */}
        <div>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', position: 'sticky', top: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Récapitulatif</h2>

            <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f3f4f6' }}>
              <p style={{ fontSize: '14px', color: '#617589', marginBottom: '8px' }}>Professeur</p>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111418' }}>{teacher.name}</p>
            </div>

            <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f3f4f6' }}>
              <p style={{ fontSize: '14px', color: '#617589', marginBottom: '8px' }}>Durée</p>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111418' }}>{duration} minutes</p>
            </div>

            {selectedDate && selectedTime && (
              <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: '14px', color: '#617589', marginBottom: '8px' }}>Date & Heure</p>
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#111418' }}>
                  {new Date(selectedDate).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
                </p>
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#111418' }}>{selectedTime}</p>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#617589' }}>Tarif horaire</span>
                <span>{teacher.hourly_rate}€/h</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 'bold', color: '#2b8cee' }}>
                <span>Total</span>
                <span>{formattedPrice}</span>
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', color: '#dc2626' }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleBooking}
              disabled={!selectedDate || !selectedTime || processing}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: !selectedDate || !selectedTime || processing ? '#9ca3af' : '#2b8cee',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: !selectedDate || !selectedTime || processing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {processing ? (
                <>
                  <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  Traitement...
                </>
              ) : (
                `Réserver et payer ${formattedPrice}`
              )}
            </button>

            <p style={{ fontSize: '12px', color: '#617589', textAlign: 'center', marginTop: '12px' }}>
              🔒 Paiement sécurisé par Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
