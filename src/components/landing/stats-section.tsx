import { stats } from '@/lib/landing-data'

export function StatsSection() {
  return (
    <section className="py-20 bg-gradient-to-r from-[#1A365D] via-[#2B5A8E] to-[#1A365D] relative overflow-hidden">
      {/* Decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F5A623] rounded-full filter blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center animate-fadeIn"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Icon */}
              <div className="text-6xl mb-4">{stat.icon}</div>

              {/* Value */}
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                {stat.value}
              </div>

              {/* Label */}
              <div className="text-lg text-white/80">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
