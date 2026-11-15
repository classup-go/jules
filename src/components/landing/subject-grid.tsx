import { SubjectCard } from './subject-card'
import { popularSubjects } from '@/lib/landing-data'

export function SubjectGrid() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A365D] mb-4">
            Matières populaires
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Trouvez le professeur parfait parmi nos spécialistes dans toutes les matières
          </p>
        </div>

        {/* Grid of Subject Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {popularSubjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      </div>
    </section>
  )
}
