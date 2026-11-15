'use client'

import { useRouter } from 'next/navigation'
import ProgrammeWizard from '@/components/programme-wizard/ProgrammeWizard'
import { CreateProgrammeInput } from '@/types/programme'

export default function NewProgrammePage() {
  const router = useRouter()

  const handleCreateProgramme = async (programmeData: CreateProgrammeInput) => {
    try {
      const response = await fetch('/api/programmes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(programmeData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la création')
      }

      const { programme } = await response.json()

      // Redirect to the programme page
      router.push(`/teacher/programmes/${programme.id}`)
    } catch (error) {
      console.error('Error creating programme:', error)
      throw error
    }
  }

  return (
    <div className="container mx-auto py-8">
      <ProgrammeWizard onSubmit={handleCreateProgramme} />
    </div>
  )
}
