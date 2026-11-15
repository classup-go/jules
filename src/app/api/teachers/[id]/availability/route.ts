import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface TimeSlot {
  date: string
  time: string
  available: boolean
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: teacherId } = await params

    // Vérifier que le prof existe
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, display_name, hourly_rate, is_available')
      .eq('id', teacherId)
      .eq('role', 'teacher')
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json(
        { error: 'Professeur non trouvé' },
        { status: 404 }
      )
    }

    if (!teacher.is_available) {
      return NextResponse.json({
        slots: [],
        message: 'Ce professeur n\'est pas disponible pour le moment',
      })
    }

    // Récupérer les disponibilités du professeur
    // Note: la table teacher_availability peut avoir une structure différente
    // Nous générons des créneaux simples pour les 30 prochains jours

    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 30)

    // Récupérer les bookings existants
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('scheduled_at, duration')
      .eq('teacher_id', teacherId)
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .gte('scheduled_at', startDate.toISOString())
      .lte('scheduled_at', endDate.toISOString())

    // Générer les créneaux disponibles (simplifiés)
    // Dans une vraie implémentation, cela devrait utiliser teacher_availability
    const slots: TimeSlot[] = []
    const bookedSlots = new Set(
      existingBookings?.map((b) => new Date(b.scheduled_at).toISOString()) || []
    )

    // Générer des créneaux de 9h à 18h pour chaque jour
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      // Ignorer les dimanches (jour 0)
      if (d.getDay() === 0) continue

      for (let hour = 9; hour < 18; hour++) {
        const slotDate = new Date(d)
        slotDate.setHours(hour, 0, 0, 0)

        // Ignorer les créneaux passés
        if (slotDate <= new Date()) continue

        const slotISO = slotDate.toISOString()
        const isBooked = bookedSlots.has(slotISO)

        slots.push({
          date: slotDate.toISOString(),
          time: `${hour}:00`,
          available: !isBooked,
        })
      }
    }

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        name: teacher.display_name,
        hourly_rate: teacher.hourly_rate,
      },
      slots,
    })
  } catch (error) {
    console.error('Availability API error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des disponibilités' },
      { status: 500 }
    )
  }
}
