import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface FeatureSectionProps {
  title: string
  description?: string
  points: string[]
  ctaText: string
  ctaLink: string
  imageSide: 'left' | 'right'
  illustration: string
  background?: string
}

export function FeatureSection({
  title,
  description,
  points,
  ctaText,
  ctaLink,
  imageSide,
  illustration,
  background = 'bg-white'
}: FeatureSectionProps) {
  const imageContent = (
    <div className="flex items-center justify-center">
      <div className="text-8xl md:text-9xl animate-pulse">
        {illustration}
      </div>
    </div>
  )

  const textContent = (
    <div className="space-y-6">
      <h2 className="text-3xl md:text-4xl font-bold text-[#1A365D]">
        {title}
      </h2>
      {description && (
        <p className="text-lg text-gray-600">
          {description}
        </p>
      )}
      <ul className="space-y-4">
        {points.map((point, index) => (
          <li
            key={index}
            className="flex items-start space-x-3 animate-fadeIn"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E8F4FD] flex items-center justify-center mt-1">
              <Check className="w-4 h-4 text-[#1A365D]" />
            </div>
            <span className="text-gray-700 text-lg">{point}</span>
          </li>
        ))}
      </ul>
      <Link href={ctaLink}>
        <Button size="lg" className="bg-[#1A365D] hover:bg-[#2B5A8E] text-white">
          {ctaText}
        </Button>
      </Link>
    </div>
  )

  return (
    <section className={`py-16 md:py-20 ${background}`}>
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {imageSide === 'left' ? (
            <>
              {imageContent}
              {textContent}
            </>
          ) : (
            <>
              {textContent}
              {imageContent}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
