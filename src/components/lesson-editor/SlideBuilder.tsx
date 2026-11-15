'use client'

import { useState } from 'react'

interface Slide {
  id: string
  title: string
  content: string
  layout: 'title' | 'content' | 'image' | 'split'
  backgroundColor: string
}

interface SlideBuilderProps {
  slides: any[]
  onChange: (slides: any[]) => void
}

const LAYOUTS = [
  { key: 'title', label: 'Titre', icon: '📄', description: 'Grande titre centré' },
  { key: 'content', label: 'Contenu', icon: '📝', description: 'Titre + contenu' },
  { key: 'image', label: 'Image', icon: '🖼️', description: 'Titre + image' },
  { key: 'split', label: 'Divisé', icon: '⚡', description: 'Deux colonnes' }
]

const BG_COLORS = [
  { key: 'white', label: 'Blanc', color: '#ffffff' },
  { key: 'blue', label: 'Bleu', color: '#dbeafe' },
  { key: 'purple', label: 'Violet', color: '#e9d5ff' },
  { key: 'green', label: 'Vert', color: '#d1fae5' },
  { key: 'yellow', label: 'Jaune', color: '#fef3c7' },
  { key: 'gray', label: 'Gris', color: '#f3f4f6' }
]

export function SlideBuilder({ slides, onChange }: SlideBuilderProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isPreview, setIsPreview] = useState(false)

  const currentSlide = slides[currentSlideIndex] as Slide | undefined

  // Add new slide
  const addSlide = () => {
    const newSlide: Slide = {
      id: Date.now().toString(),
      title: '',
      content: '',
      layout: 'content',
      backgroundColor: '#ffffff'
    }
    onChange([...slides, newSlide])
    setCurrentSlideIndex(slides.length)
  }

  // Remove slide
  const removeSlide = (index: number) => {
    const newSlides = slides.filter((_, i) => i !== index)
    onChange(newSlides)
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(Math.max(0, newSlides.length - 1))
    }
  }

  // Update slide
  const updateSlide = (field: keyof Slide, value: any) => {
    if (!currentSlide) return
    const newSlides = slides.map((slide, i) =>
      i === currentSlideIndex ? { ...slide, [field]: value } : slide
    )
    onChange(newSlides)
  }

  // Move slide
  const moveSlide = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= slides.length) return

    const newSlides = [...slides]
    ;[newSlides[fromIndex], newSlides[toIndex]] = [newSlides[toIndex], newSlides[fromIndex]]
    onChange(newSlides)
    setCurrentSlideIndex(toIndex)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <label style={{ fontWeight: '600', color: '#111418', fontSize: '15px' }}>
          Créateur de présentation <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          style={{
            padding: '8px 16px',
            backgroundColor: isPreview ? '#2b8cee' : '#f9fafb',
            color: isPreview ? 'white' : '#111418',
            border: '1px solid #dbe0e6',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {isPreview ? '✏️ Éditer' : '👁️ Aperçu'}
        </button>
      </div>

      {!isPreview ? (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px' }}>
          {/* Slide List */}
          <div style={{
            backgroundColor: 'white',
            border: '2px solid #dbe0e6',
            borderRadius: '8px',
            padding: '12px',
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <button
                type="button"
                onClick={addSlide}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#2b8cee',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                + Nouvelle slide
              </button>
            </div>

            {slides.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#617589', fontSize: '13px' }}>
                Aucune slide.
                <br />
                Cliquez ci-dessus pour commencer.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {slides.map((slide: Slide, index) => (
                  <div
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(index)}
                    style={{
                      padding: '12px',
                      backgroundColor: currentSlideIndex === index ? '#dbeafe' : 'white',
                      border: currentSlideIndex === index ? '2px solid #2b8cee' : '1px solid #dbe0e6',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#617589', marginBottom: '4px' }}>
                      Slide {index + 1}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#111418',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {slide.title || 'Sans titre'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Slide Editor */}
          <div style={{
            backgroundColor: 'white',
            border: '2px solid #dbe0e6',
            borderRadius: '8px',
            padding: '24px'
          }}>
            {!currentSlide ? (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: '#617589'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                  Aucune slide sélectionnée
                </h3>
                <p style={{ fontSize: '14px' }}>
                  Cliquez sur "Nouvelle slide" pour commencer
                </p>
              </div>
            ) : (
              <div>
                {/* Slide Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => moveSlide(currentSlideIndex, 'up')}
                      disabled={currentSlideIndex === 0}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #dbe0e6',
                        borderRadius: '6px',
                        cursor: currentSlideIndex === 0 ? 'not-allowed' : 'pointer',
                        opacity: currentSlideIndex === 0 ? 0.5 : 1
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(currentSlideIndex, 'down')}
                      disabled={currentSlideIndex === slides.length - 1}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #dbe0e6',
                        borderRadius: '6px',
                        cursor: currentSlideIndex === slides.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: currentSlideIndex === slides.length - 1 ? 0.5 : 1
                      }}
                    >
                      ↓
                    </button>
                  </div>
                  <div style={{ fontSize: '14px', color: '#617589' }}>
                    Slide {currentSlideIndex + 1} / {slides.length}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSlide(currentSlideIndex)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fca5a5',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    🗑️ Supprimer
                  </button>
                </div>

                {/* Title */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#111418' }}>
                    Titre de la slide
                  </label>
                  <input
                    type="text"
                    value={currentSlide.title}
                    onChange={(e) => updateSlide('title', e.target.value)}
                    placeholder="Ex: Introduction au chapitre 1"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #dbe0e6',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Layout */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#111418' }}>
                    Mise en page
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {LAYOUTS.map((layout) => (
                      <button
                        key={layout.key}
                        type="button"
                        onClick={() => updateSlide('layout', layout.key)}
                        title={layout.description}
                        style={{
                          padding: '12px 8px',
                          backgroundColor: currentSlide.layout === layout.key ? '#dbeafe' : 'white',
                          border: currentSlide.layout === layout.key ? '2px solid #2b8cee' : '1px solid #dbe0e6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>{layout.icon}</div>
                        <div style={{ fontSize: '11px', fontWeight: '500' }}>{layout.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Color */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#111418' }}>
                    Couleur de fond
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {BG_COLORS.map((bg) => (
                      <button
                        key={bg.key}
                        type="button"
                        onClick={() => updateSlide('backgroundColor', bg.color)}
                        title={bg.label}
                        style={{
                          width: '40px',
                          height: '40px',
                          backgroundColor: bg.color,
                          border: currentSlide.backgroundColor === bg.color ? '3px solid #2b8cee' : '2px solid #dbe0e6',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#111418' }}>
                    Contenu
                  </label>
                  <textarea
                    value={currentSlide.content}
                    onChange={(e) => updateSlide('content', e.target.value)}
                    placeholder="Écrivez le contenu de cette slide...&#10;&#10;Utilisez des listes à puces pour une meilleure lisibilité:&#10;- Point 1&#10;- Point 2&#10;- Point 3"
                    rows={8}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #dbe0e6',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Preview */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #dbe0e6' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#617589' }}>
                    Aperçu de la slide:
                  </div>
                  <div style={{
                    aspectRatio: '16/9',
                    backgroundColor: currentSlide.backgroundColor,
                    border: '2px solid #dbe0e6',
                    borderRadius: '8px',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: currentSlide.layout === 'title' ? 'center' : 'flex-start'
                  }}>
                    <div style={{
                      fontSize: currentSlide.layout === 'title' ? '32px' : '24px',
                      fontWeight: 'bold',
                      marginBottom: '16px',
                      textAlign: currentSlide.layout === 'title' ? 'center' : 'left'
                    }}>
                      {currentSlide.title || 'Titre de la slide'}
                    </div>
                    {currentSlide.layout !== 'title' && (
                      <div style={{
                        fontSize: '14px',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {currentSlide.content || 'Contenu de la slide...'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Full Preview Mode
        <div style={{
          backgroundColor: '#000',
          borderRadius: '8px',
          padding: '20px',
          minHeight: '500px'
        }}>
          {slides.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '100px 20px',
              color: '#999'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
              <p>Aucune slide à prévisualiser</p>
            </div>
          ) : (
            <div>
              {/* Navigation */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '20px',
                padding: '0 20px'
              }}>
                <button
                  type="button"
                  onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                  disabled={currentSlideIndex === 0}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: currentSlideIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentSlideIndex === 0 ? 0.3 : 1
                  }}
                >
                  ← Précédent
                </button>
                <div style={{ color: 'white', fontSize: '14px', alignSelf: 'center' }}>
                  {currentSlideIndex + 1} / {slides.length}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                  disabled={currentSlideIndex === slides.length - 1}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: currentSlideIndex === slides.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: currentSlideIndex === slides.length - 1 ? 0.3 : 1
                  }}
                >
                  Suivant →
                </button>
              </div>

              {/* Current Slide Preview */}
              {currentSlide && (
                <div style={{
                  aspectRatio: '16/9',
                  backgroundColor: currentSlide.backgroundColor,
                  borderRadius: '8px',
                  padding: '48px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: currentSlide.layout === 'title' ? 'center' : 'flex-start',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                }}>
                  <div style={{
                    fontSize: currentSlide.layout === 'title' ? '48px' : '36px',
                    fontWeight: 'bold',
                    marginBottom: '24px',
                    textAlign: currentSlide.layout === 'title' ? 'center' : 'left',
                    color: '#111418'
                  }}>
                    {currentSlide.title || 'Titre de la slide'}
                  </div>
                  {currentSlide.layout !== 'title' && (
                    <div style={{
                      fontSize: '18px',
                      lineHeight: '1.8',
                      whiteSpace: 'pre-wrap',
                      color: '#374151'
                    }}>
                      {currentSlide.content || 'Contenu de la slide...'}
                    </div>
                  )}
                </div>
              )}

              {/* Thumbnails */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '20px',
                padding: '0 20px',
                overflowX: 'auto'
              }}>
                {slides.map((slide: Slide, index) => (
                  <div
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(index)}
                    style={{
                      minWidth: '120px',
                      aspectRatio: '16/9',
                      backgroundColor: slide.backgroundColor,
                      border: currentSlideIndex === index ? '3px solid #2b8cee' : '2px solid #555',
                      borderRadius: '6px',
                      padding: '8px',
                      cursor: 'pointer',
                      fontSize: '8px',
                      opacity: currentSlideIndex === index ? 1 : 0.6
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      {slide.title}
                    </div>
                    <div style={{ fontSize: '6px', opacity: 0.7 }}>
                      {slide.content?.substring(0, 50)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {slides.length > 0 && (
        <p style={{ marginTop: '12px', fontSize: '12px', color: '#617589' }}>
          ✨ {slides.length} slide{slides.length > 1 ? 's' : ''} créée{slides.length > 1 ? 's' : ''} • Durée estimée: {slides.length} minute{slides.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
