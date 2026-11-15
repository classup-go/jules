import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { SubjectCard as SubjectCardType } from '@/types/landing'

interface SubjectCardProps {
  subject: SubjectCardType
}

export function SubjectCard({ subject }: SubjectCardProps) {
  return (
    <Link
      href={`/subjects/${subject.slug}`}
      className="block bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 card-hover border border-gray-100"
    >
      <div className="flex flex-col items-center text-center space-y-3">
        {/* Icon */}
        <div className="text-5xl">{subject.icon}</div>

        {/* Subject Name */}
        <h3 className="text-lg font-semibold text-[#1A365D]">
          {subject.name}
        </h3>

        {/* Teacher Count Badge */}
        <Badge variant="secondary" className="bg-[#E8F4FD] text-[#1A365D]">
          {subject.teacherCount} professeurs
        </Badge>
      </div>
    </Link>
  )
}
