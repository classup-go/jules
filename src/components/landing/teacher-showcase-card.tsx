import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { TeacherPreview } from '@/types/landing'

interface TeacherShowcaseCardProps {
  teacher: TeacherPreview
}

export function TeacherShowcaseCard({ teacher }: TeacherShowcaseCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 card-hover flex-shrink-0 w-72">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Avatar */}
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200">
          {/* Placeholder for now - will show teacher avatar or default */}
          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-[#1A365D] to-[#2B5A8E] text-white">
            {teacher.name.charAt(0)}
          </div>
        </div>

        {/* Name */}
        <h3 className="text-xl font-semibold text-[#1A365D]">
          {teacher.name}
        </h3>

        {/* Subject & Level Badges */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Badge variant="default" className="bg-[#1A365D]">
            {teacher.subject}
          </Badge>
          <Badge variant="secondary" className="bg-[#E8F4FD] text-[#1A365D]">
            {teacher.level}
          </Badge>
        </div>

        {/* Rating */}
        <div className="flex flex-col items-center space-y-1">
        
          <span className="text-sm text-gray-600">
            {teacher.rating}/5
          </span>
        </div>

        {/* Hourly Rate */}
        <div className="text-2xl font-bold text-[#F5A623]">
          {teacher.hourlyRate} TND<span className="text-sm text-gray-600">/h</span>
        </div>

        {/* CTA Button */}
        <Link href={`/teacher/${teacher.id}`} className="w-full">
          <Button variant="outline" className="w-full border-[#1A365D] text-[#1A365D] hover:bg-[#1A365D] hover:text-white">
            Voir profil
          </Button>
        </Link>
      </div>
    </div>
  )
}

// Section container component
export function TeacherShowcase() {
  const { featuredTeachers } = require('@/lib/landing-data')

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A365D] mb-4">
            Nos professeurs vedettes
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Découvrez nos meilleurs professeurs, vérifiés et hautement qualifiés
          </p>
        </div>

        {/* Horizontal Scroll Container */}
        <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
          {featuredTeachers.map((teacher: TeacherPreview) => (
            <TeacherShowcaseCard key={teacher.id} teacher={teacher} />
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-8">
          <Link href="/teachers">
            <Button size="lg" variant="outline" className="border-[#1A365D] text-[#1A365D] hover:bg-[#1A365D] hover:text-white">
              Voir tous les professeurs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
