interface StarRatingProps {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  showNumber?: boolean
}

export default function StarRating({ rating, size = 'md', showNumber = true }: StarRatingProps) {
  const stars = []
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  }

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<span key={i} className="text-yellow-400">★</span>)
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<span key={i} className="text-yellow-400">★</span>)
    } else {
      stars.push(<span key={i} className="text-gray-300">★</span>)
    }
  }

  return (
    <div className={`flex items-center gap-1 ${sizeClasses[size]}`}>
      <span className="flex">{stars}</span>
      {showNumber && (
        <span className="text-[#6B7280] text-sm ml-1">({rating.toFixed(1)})</span>
      )}
    </div>
  )
}