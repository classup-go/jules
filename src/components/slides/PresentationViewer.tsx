'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Presentation, Slide, SlideBlock } from '@/types/slides'

interface PresentationViewerProps {
  presentationId: string
  onComplete?: () => void
}

export function PresentationViewer({ presentationId, onComplete }: PresentationViewerProps) {
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [progress, setProgress] = useState<number[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const currentSlide = presentation?.slides?.[currentIndex]
  const totalSlides = presentation?.slides?.length || 0

  useEffect(() => {
    loadPresentation()
  }, [presentationId])

  useEffect(() => {
    // Raccourcis clavier
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Space':
        case 'Enter':
          nextSlide()
          break
        case 'ArrowLeft':
        case 'Backspace':
          prevSlide()
          break
        case 'Home':
          setCurrentIndex(0)
          break
        case 'End':
          setCurrentIndex(totalSlides - 1)
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'Escape':
          if (isFullscreen) toggleFullscreen()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, totalSlides, isFullscreen])

  const loadPresentation = async () => {
    try {
      const response = await fetch(`/api/presentations/${presentationId}`)
      if (!response.ok) throw new Error('Erreur chargement')
      const data = await response.json()
      setPresentation(data)
      setProgress(new Array(data.slides?.length || 0).fill(0))
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const nextSlide = useCallback(() => {
    if (currentIndex < totalSlides - 1) {
      // Marquer comme vu
      const newProgress = [...progress]
      newProgress[currentIndex] = 1
      setProgress(newProgress)
      setCurrentIndex(currentIndex + 1)
    } else if (currentIndex === totalSlides - 1) {
      // Dernière slide - marquer comme terminée
      const newProgress = [...progress]
      newProgress[currentIndex] = 1
      setProgress(newProgress)
      if (onComplete) onComplete()
    }
  }, [currentIndex, totalSlides, progress, onComplete])

  const prevSlide = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }, [currentIndex])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const completionPercentage = Math.round((progress.filter(p => p === 1).length / totalSlides) * 100)

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#1e1e2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#a0a0b0' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #3d3d4d',
            borderTopColor: '#8b5cf6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          Chargement...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!presentation || !currentSlide) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        Présentation non trouvée
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100vh',
        backgroundColor: '#1e1e2e',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        backgroundColor: '#2d2d3d',
        borderBottom: '1px solid #3d3d4d'
      }}>
        <div>
          <h1 style={{ color: 'white', fontSize: '18px', margin: 0 }}>{presentation.title}</h1>
          <p style={{ color: '#a0a0b0', fontSize: '13px', margin: 0 }}>
            Slide {currentIndex + 1} sur {totalSlides}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Barre de progression */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '150px',
              height: '6px',
              backgroundColor: '#3d3d4d',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${completionPercentage}%`,
                height: '100%',
                backgroundColor: '#10b981',
                borderRadius: '3px',
                transition: 'width 0.3s'
              }} />
            </div>
            <span style={{ color: '#a0a0b0', fontSize: '13px' }}>{completionPercentage}%</span>
          </div>

          <button
            onClick={toggleFullscreen}
            style={{
              padding: '8px 12px',
              backgroundColor: '#3d3d4d',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {isFullscreen ? '⛶ Quitter' : '⛶ Plein écran'}
          </button>
        </div>
      </header>

      {/* Contenu principal */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        position: 'relative'
      }}>
        {/* Navigation gauche */}
        <button
          onClick={prevSlide}
          disabled={currentIndex === 0}
          style={{
            position: 'absolute',
            left: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: currentIndex === 0 ? '#2d2d3d' : '#3d3d4d',
            border: 'none',
            color: currentIndex === 0 ? '#4d4d5d' : 'white',
            fontSize: '24px',
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          ←
        </button>

        {/* Slide */}
        <div style={{
          width: '960px',
          maxWidth: 'calc(100vw - 200px)',
          aspectRatio: presentation.aspect_ratio?.replace(':', '/') || '16/9',
          backgroundColor: currentSlide.background_color || '#ffffff',
          backgroundImage: currentSlide.background_image ? `url(${currentSlide.background_image})` : undefined,
          backgroundSize: 'cover',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          overflow: 'hidden'
        }}>
          <SlideContent slide={currentSlide} theme={presentation.theme} />
        </div>

        {/* Navigation droite */}
        <button
          onClick={nextSlide}
          style={{
            position: 'absolute',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: currentIndex === totalSlides - 1 ? '#10b981' : '#8b5cf6',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {currentIndex === totalSlides - 1 ? '✓' : '→'}
        </button>
      </main>

      {/* Footer - Miniatures */}
      <footer style={{
        padding: '16px 24px',
        backgroundColor: '#2d2d3d',
        borderTop: '1px solid #3d3d4d'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {presentation.slides?.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => setCurrentIndex(index)}
              style={{
                flexShrink: 0,
                width: '80px',
                aspectRatio: '16/9',
                backgroundColor: slide.background_color || '#ffffff',
                borderRadius: '6px',
                border: index === currentIndex ? '3px solid #8b5cf6' : '2px solid #3d3d4d',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Indicateur de progression */}
              {progress[index] === 1 && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: 'white'
                }}>
                  ✓
                </div>
              )}
              <span style={{
                position: 'absolute',
                bottom: '2px',
                left: '4px',
                fontSize: '10px',
                color: '#666',
                fontWeight: '600'
              }}>
                {index + 1}
              </span>
            </button>
          ))}
        </div>
      </footer>

      {/* Raccourcis */}
      <div style={{
        position: 'fixed',
        bottom: '100px',
        right: '24px',
        backgroundColor: '#2d2d3d',
        padding: '12px 16px',
        borderRadius: '12px',
        fontSize: '12px',
        color: '#a0a0b0'
      }}>
        <div>← → Navigation</div>
        <div>F Plein écran</div>
        <div>Espace Suivant</div>
      </div>
    </div>
  )
}

// Composant de rendu du contenu d'une slide
function SlideContent({ slide, theme }: { slide: Slide; theme: string }) {
  return (
    <div style={{
      padding: '48px',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Titre */}
      {slide.title && (
        <h2 style={{
          fontSize: '36px',
          fontWeight: '700',
          marginBottom: '16px',
          color: '#111827'
        }}>
          {slide.title}
        </h2>
      )}

      {slide.subtitle && (
        <h3 style={{
          fontSize: '20px',
          fontWeight: '400',
          marginBottom: '32px',
          color: '#6b7280'
        }}>
          {slide.subtitle}
        </h3>
      )}

      {/* Blocs */}
      <div style={{ flex: 1 }}>
        {slide.blocks?.map((block) => (
          <BlockViewer key={block.id} block={block} />
        ))}
      </div>
    </div>
  )
}

// Composant de rendu d'un bloc (version lecture)
function BlockViewer({ block }: { block: SlideBlock }) {
  const [solutionRevealed, setSolutionRevealed] = useState(false)

  switch (block.block_type) {
    case 'text':
      return (
        <div style={{ marginBottom: '16px', fontSize: '18px', lineHeight: '1.7', color: '#374151' }}>
          {block.content.text}
        </div>
      )

    case 'heading':
      const HeadingTag = `h${block.content.level || 2}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      const sizes = { 1: '32px', 2: '28px', 3: '24px', 4: '20px' }
      return (
        <HeadingTag style={{
          fontSize: sizes[block.content.level as keyof typeof sizes] || '24px',
          fontWeight: '700',
          marginBottom: '16px',
          color: '#111827'
        }}>
          {block.content.text}
        </HeadingTag>
      )

    case 'image':
      return block.content.url ? (
        <figure style={{ marginBottom: '24px', textAlign: 'center' }}>
          <img
            src={block.content.url}
            alt={block.content.alt}
            style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '12px' }}
          />
          {block.content.caption && (
            <figcaption style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
              {block.content.caption}
            </figcaption>
          )}
        </figure>
      ) : null

    case 'video':
      if (block.content.type === 'youtube' && block.content.url) {
        const videoId = block.content.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1]
        return videoId ? (
          <div style={{ marginBottom: '24px', aspectRatio: '16/9', borderRadius: '12px', overflow: 'hidden' }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}${block.content.startTime ? `?start=${block.content.startTime}` : ''}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : null
      }
      return null

    case 'math':
      // TODO: Intégrer KaTeX ou MathJax pour le rendu LaTeX
      return (
        <div style={{
          padding: '24px',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          marginBottom: '24px',
          textAlign: 'center',
          fontFamily: 'serif',
          fontSize: '24px'
        }}>
          {block.content.latex}
        </div>
      )

    case 'callout':
      const colors: Record<string, { bg: string; border: string; icon: string }> = {
        info: { bg: '#eff6ff', border: '#3b82f6', icon: 'ℹ️' },
        warning: { bg: '#fffbeb', border: '#f59e0b', icon: '⚠️' },
        tip: { bg: '#f0fdf4', border: '#10b981', icon: '💡' },
        danger: { bg: '#fef2f2', border: '#ef4444', icon: '🚨' },
        question: { bg: '#faf5ff', border: '#8b5cf6', icon: '❓' },
        success: { bg: '#f0fdf4', border: '#10b981', icon: '✅' }
      }
      const c = colors[block.content.type] || colors.info
      return (
        <div style={{
          padding: '20px 24px',
          backgroundColor: c.bg,
          borderLeft: `4px solid ${c.border}`,
          borderRadius: '0 12px 12px 0',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}>
            <span>{c.icon}</span>
            {block.content.title && <span>{block.content.title}</span>}
          </div>
          <div style={{ fontSize: '16px', lineHeight: '1.6' }}>{block.content.text}</div>
        </div>
      )

    case 'theorem':
      return (
        <div style={{
          padding: '24px',
          backgroundColor: '#faf5ff',
          border: '2px solid #8b5cf6',
          borderRadius: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ fontWeight: '700', color: '#7c3aed', marginBottom: '12px', fontSize: '18px' }}>
            📜 {block.content.type === 'theorem' ? 'Théorème' : block.content.type}
            {block.content.name && ` - ${block.content.name}`}
          </div>
          <div style={{ fontStyle: 'italic', fontSize: '17px', lineHeight: '1.6' }}>
            {block.content.statement}
          </div>
        </div>
      )

    case 'definition':
      return (
        <div style={{
          padding: '24px',
          backgroundColor: '#f0fdf4',
          border: '2px solid #10b981',
          borderRadius: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ fontWeight: '700', color: '#059669', marginBottom: '12px', fontSize: '18px' }}>
            📖 Définition: {block.content.term}
          </div>
          <div style={{ fontSize: '16px', lineHeight: '1.6' }}>{block.content.definition}</div>
        </div>
      )

    case 'example':
      return (
        <div style={{
          padding: '24px',
          backgroundColor: '#fffbeb',
          border: '2px solid #f59e0b',
          borderRadius: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ fontWeight: '700', color: '#d97706', marginBottom: '12px', fontSize: '18px' }}>
            💡 {block.content.title || 'Exemple'}
          </div>
          {block.content.steps?.map((step: any, i: number) => (
            <div key={i} style={{ marginBottom: '8px', fontSize: '16px', lineHeight: '1.6' }}>
              {step.text}
              {step.math && <div style={{ fontFamily: 'serif', marginTop: '8px' }}>{step.math}</div>}
            </div>
          ))}
        </div>
      )

    case 'exercise':
      return (
        <div style={{
          padding: '24px',
          backgroundColor: '#eff6ff',
          border: '2px solid #3b82f6',
          borderRadius: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ fontWeight: '700', color: '#2563eb', marginBottom: '12px', fontSize: '18px' }}>
            ✏️ Exercice
          </div>
          <div style={{ fontSize: '16px', lineHeight: '1.6' }}>{block.content.question}</div>
          {block.content.hints && block.content.hints.length > 0 && (
            <details style={{ marginTop: '16px' }}>
              <summary style={{ cursor: 'pointer', color: '#3b82f6', fontWeight: '500' }}>
                💡 Indices
              </summary>
              <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                {block.content.hints.map((hint: string, i: number) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{hint}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )

    case 'solution':
      return (
        <div style={{
          padding: '24px',
          backgroundColor: solutionRevealed ? '#f0fdf4' : '#f3f4f6',
          border: '2px dashed #10b981',
          borderRadius: '16px',
          marginBottom: '24px'
        }}>
          {block.content.hidden && !solutionRevealed ? (
            <button
              onClick={() => setSolutionRevealed(true)}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '16px'
              }}
            >
              🔓 Révéler la solution
            </button>
          ) : (
            <>
              <div style={{ fontWeight: '700', color: '#059669', marginBottom: '12px', fontSize: '18px' }}>
                🔓 Solution
              </div>
              {block.content.steps?.map((step: any, i: number) => (
                <div key={i} style={{ marginBottom: '12px', fontSize: '16px', lineHeight: '1.6' }}>
                  <div>{step.text}</div>
                  {step.math && <div style={{ fontFamily: 'serif', marginTop: '4px', fontSize: '18px' }}>{step.math}</div>}
                  {step.explanation && (
                    <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px', fontStyle: 'italic' }}>
                      → {step.explanation}
                    </div>
                  )}
                </div>
              ))}
              {block.content.finalAnswer && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  backgroundColor: '#dcfce7',
                  borderRadius: '8px',
                  fontWeight: '600',
                  color: '#166534'
                }}>
                  Réponse: {block.content.finalAnswer}
                </div>
              )}
            </>
          )}
        </div>
      )

    case 'mcq':
      return <MCQBlock block={block} />

    case 'divider':
      return (
        <hr style={{
          border: 'none',
          borderTop: `2px ${block.content.style || 'solid'} #e5e7eb`,
          margin: block.content.spacing === 'large' ? '40px 0' : block.content.spacing === 'small' ? '16px 0' : '24px 0'
        }} />
      )

    case 'quote':
      return (
        <blockquote style={{
          padding: '24px 32px',
          borderLeft: '4px solid #8b5cf6',
          backgroundColor: '#faf5ff',
          borderRadius: '0 12px 12px 0',
          marginBottom: '24px',
          fontStyle: 'italic',
          fontSize: '18px'
        }}>
          <p style={{ marginBottom: block.content.author ? '12px' : 0 }}>"{block.content.text}"</p>
          {block.content.author && (
            <cite style={{ fontStyle: 'normal', color: '#6b7280', fontSize: '14px' }}>
              — {block.content.author}
              {block.content.source && `, ${block.content.source}`}
            </cite>
          )}
        </blockquote>
      )

    default:
      return (
        <div style={{ padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px', marginBottom: '16px' }}>
          Bloc: {block.block_type}
        </div>
      )
  }
}

// Composant QCM interactif
function MCQBlock({ block }: { block: SlideBlock }) {
  const [selected, setSelected] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)

  const handleSelect = (index: number) => {
    if (submitted) return
    
    if (block.content.multiSelect) {
      setSelected(prev =>
        prev.includes(index)
          ? prev.filter(i => i !== index)
          : [...prev, index]
      )
    } else {
      setSelected([index])
    }
  }

  const handleSubmit = () => {
    setSubmitted(true)
  }

  const isCorrect = (index: number) => block.content.options[index]?.isCorrect

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#f8fafc',
      borderRadius: '16px',
      marginBottom: '24px'
    }}>
      <div style={{ fontWeight: '700', marginBottom: '16px', fontSize: '18px' }}>
        ☑️ {block.content.question}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {block.content.options?.map((option: any, index: number) => {
          const isSelected = selected.includes(index)
          const showResult = submitted
          const correct = isCorrect(index)
          
          let bgColor = 'white'
          let borderColor = '#e5e7eb'
          
          if (showResult) {
            if (correct) {
              bgColor = '#dcfce7'
              borderColor = '#10b981'
            } else if (isSelected && !correct) {
              bgColor = '#fef2f2'
              borderColor = '#ef4444'
            }
          } else if (isSelected) {
            bgColor = '#eff6ff'
            borderColor = '#3b82f6'
          }
          
          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={submitted}
              style={{
                padding: '16px 20px',
                backgroundColor: bgColor,
                border: `2px solid ${borderColor}`,
                borderRadius: '12px',
                textAlign: 'left',
                cursor: submitted ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: block.content.multiSelect ? '6px' : '50%',
                border: `2px solid ${isSelected ? '#3b82f6' : '#d1d5db'}`,
                backgroundColor: isSelected ? '#3b82f6' : 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                flexShrink: 0
              }}>
                {isSelected && '✓'}
              </div>
              <span style={{ flex: 1 }}>{option.text}</span>
              {showResult && (
                <span style={{ fontSize: '18px' }}>
                  {correct ? '✅' : isSelected ? '❌' : ''}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {!submitted && selected.length > 0 && (
        <button
          onClick={handleSubmit}
          style={{
            marginTop: '16px',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Valider ma réponse
        </button>
      )}

      {submitted && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          backgroundColor: selected.every((i) => isCorrect(i)) && selected.length === block.content.options.filter((o: any) => o.isCorrect).length
            ? '#dcfce7'
            : '#fef2f2',
          borderRadius: '8px'
        }}>
          {selected.every((i) => isCorrect(i)) && selected.length === block.content.options.filter((o: any) => o.isCorrect).length
            ? '🎉 Bravo ! Bonne réponse !'
            : '😕 Ce n\'est pas la bonne réponse.'}
        </div>
      )}
    </div>
  )
}

export default PresentationViewer