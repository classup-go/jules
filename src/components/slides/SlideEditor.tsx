'use client'

import { useState, useCallback, useEffect } from 'react'
import { 
  Presentation, 
  Slide, 
  SlideBlock, 
  SlideBlockType,
  SlideLayout,
  BLOCK_TOOLBAR_ITEMS,
  TEMPLATE_CATEGORIES,
  SlideTemplate
} from '@/types/slides'

interface SlideEditorProps {
  presentationId?: string
  courseId?: string
  lessonId?: string
  onSave?: (presentation: Presentation) => void
}

// ═══════════════════════════════════════════════════════════════════════════
// Composant principal de l'éditeur de slides
// ═══════════════════════════════════════════════════════════════════════════

export function SlideEditor({ presentationId, courseId, lessonId, onSave }: SlideEditorProps) {
  // État principal
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showBlockPalette, setShowBlockPalette] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [zoom, setZoom] = useState(100)

  // Slide actuel
  const currentSlide = presentation?.slides?.[selectedSlideIndex]

  // Initialisation
  useEffect(() => {
    if (presentationId) {
      loadPresentation(presentationId)
    } else {
      // Nouvelle présentation
      setPresentation(createEmptyPresentation())
    }
  }, [presentationId])

  const createEmptyPresentation = (): Presentation => ({
    id: crypto.randomUUID(),
    teacher_id: '', // À remplir
    title: 'Nouvelle présentation',
    theme: 'default',
    transition: 'slide',
    aspect_ratio: '16:9',
    total_slides: 1,
    is_published: false,
    is_template: false,
    view_count: 0,
    avg_completion_rate: 0,
    slides: [createEmptySlide(0)]
  })

  const createEmptySlide = (index: number): Slide => ({
    id: crypto.randomUUID(),
    presentation_id: presentation?.id || '',
    order_index: index,
    layout: 'default',
    blocks: []
  })

  const loadPresentation = async (id: string) => {
    // TODO: Charger depuis l'API
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Actions sur les slides
  // ═══════════════════════════════════════════════════════════════════════════

  const addSlide = (afterIndex?: number) => {
    if (!presentation) return
    
    const insertIndex = afterIndex !== undefined ? afterIndex + 1 : presentation.slides!.length
    const newSlide = createEmptySlide(insertIndex)
    
    const newSlides = [...(presentation.slides || [])]
    newSlides.splice(insertIndex, 0, newSlide)
    
    // Réindexer
    newSlides.forEach((s, i) => s.order_index = i)
    
    setPresentation({ ...presentation, slides: newSlides, total_slides: newSlides.length })
    setSelectedSlideIndex(insertIndex)
  }

  const duplicateSlide = (index: number) => {
    if (!presentation?.slides) return
    
    const slideToCopy = presentation.slides[index]
    const newSlide: Slide = {
      ...JSON.parse(JSON.stringify(slideToCopy)),
      id: crypto.randomUUID(),
      order_index: index + 1
    }
    
    // Copier les blocs avec nouveaux IDs
    if (newSlide.blocks) {
      newSlide.blocks = newSlide.blocks.map(b => ({
        ...b,
        id: crypto.randomUUID(),
        slide_id: newSlide.id
      }))
    }
    
    const newSlides = [...presentation.slides]
    newSlides.splice(index + 1, 0, newSlide)
    newSlides.forEach((s, i) => s.order_index = i)
    
    setPresentation({ ...presentation, slides: newSlides, total_slides: newSlides.length })
    setSelectedSlideIndex(index + 1)
  }

  const deleteSlide = (index: number) => {
    if (!presentation?.slides || presentation.slides.length <= 1) return
    
    const newSlides = presentation.slides.filter((_, i) => i !== index)
    newSlides.forEach((s, i) => s.order_index = i)
    
    setPresentation({ ...presentation, slides: newSlides, total_slides: newSlides.length })
    setSelectedSlideIndex(Math.min(index, newSlides.length - 1))
  }

  const moveSlide = (fromIndex: number, toIndex: number) => {
    if (!presentation?.slides) return
    
    const newSlides = [...presentation.slides]
    const [removed] = newSlides.splice(fromIndex, 1)
    newSlides.splice(toIndex, 0, removed)
    newSlides.forEach((s, i) => s.order_index = i)
    
    setPresentation({ ...presentation, slides: newSlides })
    setSelectedSlideIndex(toIndex)
  }

  const updateSlide = (slideId: string, updates: Partial<Slide>) => {
    if (!presentation?.slides) return
    
    const newSlides = presentation.slides.map(s => 
      s.id === slideId ? { ...s, ...updates } : s
    )
    
    setPresentation({ ...presentation, slides: newSlides })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Actions sur les blocs
  // ═══════════════════════════════════════════════════════════════════════════

  const addBlock = (type: SlideBlockType, afterBlockId?: string) => {
    if (!currentSlide) return
    
    const newBlock: SlideBlock = {
      id: crypto.randomUUID(),
      slide_id: currentSlide.id,
      block_type: type,
      order_index: currentSlide.blocks?.length || 0,
      column_index: 0,
      content: getDefaultContent(type)
    }
    
    const newBlocks = [...(currentSlide.blocks || []), newBlock]
    updateSlide(currentSlide.id, { blocks: newBlocks })
    setSelectedBlockId(newBlock.id)
    setShowBlockPalette(false)
  }

  const updateBlock = (blockId: string, updates: Partial<SlideBlock>) => {
    if (!currentSlide?.blocks) return
    
    const newBlocks = currentSlide.blocks.map(b =>
      b.id === blockId ? { ...b, ...updates } : b
    )
    
    updateSlide(currentSlide.id, { blocks: newBlocks })
  }

  const deleteBlock = (blockId: string) => {
    if (!currentSlide?.blocks) return
    
    const newBlocks = currentSlide.blocks.filter(b => b.id !== blockId)
    newBlocks.forEach((b, i) => b.order_index = i)
    
    updateSlide(currentSlide.id, { blocks: newBlocks })
    setSelectedBlockId(null)
  }

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    if (!currentSlide?.blocks) return
    
    const index = currentSlide.blocks.findIndex(b => b.id === blockId)
    if (index === -1) return
    
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= currentSlide.blocks.length) return
    
    const newBlocks = [...currentSlide.blocks]
    const [removed] = newBlocks.splice(index, 1)
    newBlocks.splice(newIndex, 0, removed)
    newBlocks.forEach((b, i) => b.order_index = i)
    
    updateSlide(currentSlide.id, { blocks: newBlocks })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Contenu par défaut selon le type
  // ═══════════════════════════════════════════════════════════════════════════

  const getDefaultContent = (type: SlideBlockType): Record<string, any> => {
    switch (type) {
      case 'text':
        return { text: '', format: 'markdown' }
      case 'heading':
        return { text: 'Titre', level: 2, align: 'left' }
      case 'image':
        return { url: '', alt: '' }
      case 'video':
        return { url: '', type: 'youtube' }
      case 'math':
        return { latex: '', displayMode: true }
      case 'code':
        return { code: '', language: 'javascript', showLineNumbers: true }
      case 'graph':
        return { type: 'bar', data: { labels: [], datasets: [] } }
      case 'table':
        return { headers: ['Colonne 1', 'Colonne 2'], rows: [['', '']] }
      case 'callout':
        return { type: 'info', title: '', text: '' }
      case 'theorem':
        return { type: 'theorem', name: '', statement: '' }
      case 'proof':
        return { type: 'direct', steps: [] }
      case 'definition':
        return { term: '', definition: '' }
      case 'example':
        return { title: 'Exemple', steps: [] }
      case 'exercise':
        return { question: '', questionType: 'text', hints: [] }
      case 'solution':
        return { steps: [], hidden: true }
      case 'mcq':
        return { question: '', options: [], multiSelect: false }
      case 'fill_blank':
        return { text: '', blanks: [] }
      case 'matching':
        return { pairs: [], shuffled: true }
      case 'flashcard':
        return { front: { text: '' }, back: { text: '' } }
      case 'timeline':
        return { events: [], orientation: 'vertical' }
      case 'quote':
        return { text: '', author: '' }
      case 'note':
        return { type: 'note', text: '' }
      case 'divider':
        return { style: 'solid', spacing: 'medium' }
      case 'columns':
        return { columns: 2, gap: '24px' }
      default:
        return {}
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Sauvegarde
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSave = async () => {
    if (!presentation) return
    
    setIsSaving(true)
    try {
      // TODO: Sauvegarder via API
      if (onSave) {
        onSave(presentation)
      }
    } catch (error) {
      console.error('Erreur de sauvegarde:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendu
  // ═══════════════════════════════════════════════════════════════════════════

  if (!presentation) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Chargement...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1e1e2e' }}>
      {/* Header */}
      <EditorHeader 
        presentation={presentation}
        onTitleChange={(title) => setPresentation({ ...presentation, title })}
        onSave={handleSave}
        isSaving={isSaving}
        isPreviewMode={isPreviewMode}
        onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Panneau latéral gauche - Liste des slides */}
        <SlideSidebar
          slides={presentation.slides || []}
          selectedIndex={selectedSlideIndex}
          onSelect={setSelectedSlideIndex}
          onAdd={addSlide}
          onDuplicate={duplicateSlide}
          onDelete={deleteSlide}
          onMove={moveSlide}
        />

        {/* Zone principale - Éditeur de slide */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {currentSlide && (
            <SlideCanvas
              slide={currentSlide}
              selectedBlockId={selectedBlockId}
              zoom={zoom}
              isPreviewMode={isPreviewMode}
              onBlockSelect={setSelectedBlockId}
              onBlockUpdate={updateBlock}
              onBlockDelete={deleteBlock}
              onBlockMove={moveBlock}
              onAddBlock={() => setShowBlockPalette(true)}
            />
          )}
        </div>

        {/* Panneau latéral droit - Propriétés */}
        <PropertyPanel
          slide={currentSlide}
          selectedBlock={currentSlide?.blocks?.find(b => b.id === selectedBlockId)}
          onSlideUpdate={(updates) => currentSlide && updateSlide(currentSlide.id, updates)}
          onBlockUpdate={(updates) => selectedBlockId && updateBlock(selectedBlockId, updates)}
        />
      </div>

      {/* Palette de blocs (modal) */}
      {showBlockPalette && (
        <BlockPalette
          onSelect={addBlock}
          onClose={() => setShowBlockPalette(false)}
        />
      )}

      {/* Templates (modal) */}
      {showTemplates && (
        <TemplateGallery
          onSelect={(template) => {
            // Appliquer le template
            setShowTemplates(false)
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Composants secondaires
// ═══════════════════════════════════════════════════════════════════════════

function EditorHeader({ 
  presentation, 
  onTitleChange, 
  onSave, 
  isSaving, 
  isPreviewMode,
  onTogglePreview,
  zoom,
  onZoomChange
}: {
  presentation: Presentation
  onTitleChange: (title: string) => void
  onSave: () => void
  isSaving: boolean
  isPreviewMode: boolean
  onTogglePreview: () => void
  zoom: number
  onZoomChange: (zoom: number) => void
}) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      backgroundColor: '#2d2d3d',
      borderBottom: '1px solid #3d3d4d'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button style={{ background: 'none', border: 'none', color: '#a0a0b0', cursor: 'pointer', fontSize: '20px' }}>
          ← Retour
        </button>
        <input
          type="text"
          value={presentation.title}
          onChange={(e) => onTitleChange(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '18px',
            fontWeight: '600',
            color: 'white',
            width: '300px'
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#3d3d4d', borderRadius: '8px', padding: '4px 12px' }}>
          <button onClick={() => onZoomChange(Math.max(50, zoom - 10))} style={{ background: 'none', border: 'none', color: '#a0a0b0', cursor: 'pointer' }}>−</button>
          <span style={{ color: 'white', fontSize: '13px', minWidth: '45px', textAlign: 'center' }}>{zoom}%</span>
          <button onClick={() => onZoomChange(Math.min(150, zoom + 10))} style={{ background: 'none', border: 'none', color: '#a0a0b0', cursor: 'pointer' }}>+</button>
        </div>

        {/* Preview toggle */}
        <button
          onClick={onTogglePreview}
          style={{
            padding: '8px 16px',
            backgroundColor: isPreviewMode ? '#8b5cf6' : '#3d3d4d',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          {isPreviewMode ? '✏️ Éditer' : '👁️ Aperçu'}
        </button>

        {/* Save */}
        <button
          onClick={onSave}
          disabled={isSaving}
          style={{
            padding: '8px 20px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isSaving ? '⏳' : '💾'} Sauvegarder
        </button>
      </div>
    </header>
  )
}

function SlideSidebar({
  slides,
  selectedIndex,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMove
}: {
  slides: Slide[]
  selectedIndex: number
  onSelect: (index: number) => void
  onAdd: (afterIndex?: number) => void
  onDuplicate: (index: number) => void
  onDelete: (index: number) => void
  onMove: (from: number, to: number) => void
}) {
  return (
    <aside style={{
      width: '200px',
      backgroundColor: '#2d2d3d',
      borderRight: '1px solid #3d3d4d',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '12px', borderBottom: '1px solid #3d3d4d' }}>
        <button
          onClick={() => onAdd()}
          style={{
            width: '100%',
            padding: '10px',
            background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          ➕ Nouvelle slide
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            onClick={() => onSelect(index)}
            style={{
              position: 'relative',
              marginBottom: '12px',
              cursor: 'pointer'
            }}
          >
            {/* Miniature */}
            <div style={{
              aspectRatio: '16/9',
              backgroundColor: slide.background_color || '#ffffff',
              borderRadius: '8px',
              border: selectedIndex === index ? '3px solid #8b5cf6' : '2px solid #3d3d4d',
              overflow: 'hidden',
              transition: 'all 0.2s'
            }}>
              <SlidePreviewMini slide={slide} />
            </div>
            
            {/* Numéro */}
            <div style={{
              position: 'absolute',
              bottom: '-4px',
              left: '8px',
              backgroundColor: selectedIndex === index ? '#8b5cf6' : '#4d4d5d',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              {index + 1}
            </div>

            {/* Actions */}
            {selectedIndex === index && (
              <div style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                display: 'flex',
                gap: '2px'
              }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onDuplicate(index) }}
                  style={{ padding: '4px', backgroundColor: '#4d4d5d', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                  title="Dupliquer"
                >
                  📋
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(index) }}
                  style={{ padding: '4px', backgroundColor: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}

function SlidePreviewMini({ slide }: { slide: Slide }) {
  return (
    <div style={{ transform: 'scale(0.15)', transformOrigin: 'top left', width: '667%', height: '667%', padding: '20px' }}>
      {slide.title && (
        <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>{slide.title}</h3>
      )}
      {slide.blocks?.slice(0, 3).map((block, i) => (
        <div key={i} style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
          {block.block_type === 'text' && block.content.text?.substring(0, 50)}
          {block.block_type === 'heading' && <strong>{block.content.text}</strong>}
          {block.block_type === 'image' && '🖼️ Image'}
          {block.block_type === 'math' && '∑ Formule'}
        </div>
      ))}
    </div>
  )
}

function SlideCanvas({
  slide,
  selectedBlockId,
  zoom,
  isPreviewMode,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onBlockMove,
  onAddBlock
}: {
  slide: Slide
  selectedBlockId: string | null
  zoom: number
  isPreviewMode: boolean
  onBlockSelect: (id: string | null) => void
  onBlockUpdate: (id: string, updates: Partial<SlideBlock>) => void
  onBlockDelete: (id: string) => void
  onBlockMove: (id: string, direction: 'up' | 'down') => void
  onAddBlock: () => void
}) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      overflow: 'auto',
      backgroundColor: '#1e1e2e'
    }}>
      <div style={{
        width: `${960 * zoom / 100}px`,
        aspectRatio: '16/9',
        backgroundColor: slide.background_color || '#ffffff',
        backgroundImage: slide.background_image ? `url(${slide.background_image})` : undefined,
        backgroundSize: 'cover',
        borderRadius: '8px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        position: 'relative'
      }}
      onClick={() => onBlockSelect(null)}
      >
        <div style={{ padding: '48px', height: '100%', boxSizing: 'border-box' }}>
          {/* Titre de la slide */}
          {slide.title && (
            <h2 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '24px', color: '#111827' }}>
              {slide.title}
            </h2>
          )}

          {/* Blocs */}
          {slide.blocks?.map((block) => (
            <BlockRenderer
              key={block.id}
              block={block}
              isSelected={selectedBlockId === block.id}
              isPreviewMode={isPreviewMode}
              onSelect={() => onBlockSelect(block.id)}
              onUpdate={(updates) => onBlockUpdate(block.id, updates)}
              onDelete={() => onBlockDelete(block.id)}
              onMove={(dir) => onBlockMove(block.id, dir)}
            />
          ))}

          {/* Bouton ajouter bloc */}
          {!isPreviewMode && (!slide.blocks || slide.blocks.length === 0) && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddBlock() }}
              style={{
                width: '100%',
                padding: '40px',
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                color: '#6b7280'
              }}
            >
              <span style={{ fontSize: '40px' }}>➕</span>
              <span style={{ fontWeight: '500' }}>Ajouter un bloc</span>
            </button>
          )}
        </div>

        {/* Bouton flottant pour ajouter */}
        {!isPreviewMode && slide.blocks && slide.blocks.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddBlock() }}
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
            }}
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}

function BlockRenderer({
  block,
  isSelected,
  isPreviewMode,
  onSelect,
  onUpdate,
  onDelete,
  onMove
}: {
  block: SlideBlock
  isSelected: boolean
  isPreviewMode: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<SlideBlock>) => void
  onDelete: () => void
  onMove: (direction: 'up' | 'down') => void
}) {
  // Rendu selon le type de bloc
  const renderContent = () => {
    switch (block.block_type) {
      case 'text':
        return (
          <div 
            contentEditable={!isPreviewMode}
            suppressContentEditableWarning
            onBlur={(e) => onUpdate({ content: { ...block.content, text: e.currentTarget.textContent } })}
            style={{ minHeight: '24px', outline: 'none' }}
          >
            {block.content.text || 'Cliquez pour écrire...'}
          </div>
        )
      case 'heading':
        const HeadingTag = `h${block.content.level || 2}` as keyof JSX.IntrinsicElements
        return (
          <HeadingTag
            contentEditable={!isPreviewMode}
            suppressContentEditableWarning
            onBlur={(e) => onUpdate({ content: { ...block.content, text: e.currentTarget.textContent } })}
            style={{ margin: 0, outline: 'none' }}
          >
            {block.content.text || 'Titre'}
          </HeadingTag>
        )
      case 'image':
        return block.content.url ? (
          <img src={block.content.url} alt={block.content.alt} style={{ maxWidth: '100%', borderRadius: '8px' }} />
        ) : (
          <div style={{ padding: '40px', backgroundColor: '#f3f4f6', borderRadius: '8px', textAlign: 'center' }}>
            🖼️ Cliquez pour ajouter une image
          </div>
        )
      case 'math':
        return (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f8fafc', 
            borderRadius: '8px', 
            fontFamily: 'serif',
            fontSize: '20px',
            textAlign: 'center'
          }}>
            {block.content.latex || '\\int_a^b f(x)dx'}
          </div>
        )
      case 'callout':
        const calloutColors: Record<string, { bg: string; border: string; icon: string }> = {
          info: { bg: '#eff6ff', border: '#3b82f6', icon: 'ℹ️' },
          warning: { bg: '#fffbeb', border: '#f59e0b', icon: '⚠️' },
          tip: { bg: '#f0fdf4', border: '#10b981', icon: '💡' },
          danger: { bg: '#fef2f2', border: '#ef4444', icon: '🚨' },
          question: { bg: '#faf5ff', border: '#8b5cf6', icon: '❓' }
        }
        const colors = calloutColors[block.content.type] || calloutColors.info
        return (
          <div style={{
            padding: '16px 20px',
            backgroundColor: colors.bg,
            borderLeft: `4px solid ${colors.border}`,
            borderRadius: '0 8px 8px 0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span>{colors.icon}</span>
              <strong>{block.content.title || block.content.type}</strong>
            </div>
            <div>{block.content.text}</div>
          </div>
        )
      case 'theorem':
        return (
          <div style={{
            padding: '20px',
            backgroundColor: '#faf5ff',
            border: '2px solid #8b5cf6',
            borderRadius: '12px'
          }}>
            <div style={{ fontWeight: '700', color: '#7c3aed', marginBottom: '8px' }}>
              📜 {block.content.type === 'theorem' ? 'Théorème' : block.content.type} {block.content.name && `- ${block.content.name}`}
            </div>
            <div style={{ fontStyle: 'italic' }}>{block.content.statement}</div>
          </div>
        )
      case 'definition':
        return (
          <div style={{
            padding: '20px',
            backgroundColor: '#f0fdf4',
            border: '2px solid #10b981',
            borderRadius: '12px'
          }}>
            <div style={{ fontWeight: '700', color: '#059669', marginBottom: '8px' }}>
              📖 Définition: {block.content.term}
            </div>
            <div>{block.content.definition}</div>
          </div>
        )
      case 'example':
        return (
          <div style={{
            padding: '20px',
            backgroundColor: '#fffbeb',
            border: '2px solid #f59e0b',
            borderRadius: '12px'
          }}>
            <div style={{ fontWeight: '700', color: '#d97706', marginBottom: '12px' }}>
              💡 {block.content.title || 'Exemple'}
            </div>
            {block.content.steps?.map((step: any, i: number) => (
              <div key={i} style={{ marginBottom: '8px' }}>{step.text}</div>
            ))}
          </div>
        )
      case 'exercise':
        return (
          <div style={{
            padding: '20px',
            backgroundColor: '#eff6ff',
            border: '2px solid #3b82f6',
            borderRadius: '12px'
          }}>
            <div style={{ fontWeight: '700', color: '#2563eb', marginBottom: '12px' }}>
              ✏️ Exercice
            </div>
            <div>{block.content.question}</div>
          </div>
        )
      case 'solution':
        return (
          <div style={{
            padding: '20px',
            backgroundColor: block.content.hidden ? '#f3f4f6' : '#f0fdf4',
            border: '2px dashed #10b981',
            borderRadius: '12px'
          }}>
            <div style={{ fontWeight: '700', color: '#059669', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔓 Solution
              {block.content.hidden && <span style={{ fontSize: '12px', color: '#6b7280' }}>(masquée pour les étudiants)</span>}
            </div>
            {block.content.steps?.map((step: any, i: number) => (
              <div key={i} style={{ marginBottom: '8px' }}>{step.text}</div>
            ))}
          </div>
        )
      default:
        return (
          <div style={{ padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
            Bloc: {block.block_type}
          </div>
        )
    }
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      style={{
        position: 'relative',
        marginBottom: '16px',
        borderRadius: '8px',
        border: isSelected && !isPreviewMode ? '2px solid #8b5cf6' : '2px solid transparent',
        transition: 'all 0.2s'
      }}
    >
      {renderContent()}

      {/* Toolbar du bloc */}
      {isSelected && !isPreviewMode && (
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '0',
          display: 'flex',
          gap: '4px',
          backgroundColor: '#2d2d3d',
          padding: '4px 8px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <button onClick={() => onMove('up')} style={toolbarButtonStyle}>↑</button>
          <button onClick={() => onMove('down')} style={toolbarButtonStyle}>↓</button>
          <button onClick={onDelete} style={{ ...toolbarButtonStyle, backgroundColor: '#ef4444' }}>🗑️</button>
        </div>
      )}
    </div>
  )
}

const toolbarButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  backgroundColor: '#4d4d5d',
  border: 'none',
  borderRadius: '4px',
  color: 'white',
  cursor: 'pointer',
  fontSize: '12px'
}

function PropertyPanel({
  slide,
  selectedBlock,
  onSlideUpdate,
  onBlockUpdate
}: {
  slide?: Slide
  selectedBlock?: SlideBlock
  onSlideUpdate: (updates: Partial<Slide>) => void
  onBlockUpdate: (updates: Partial<SlideBlock>) => void
}) {
  return (
    <aside style={{
      width: '280px',
      backgroundColor: '#2d2d3d',
      borderLeft: '1px solid #3d3d4d',
      overflow: 'auto'
    }}>
      <div style={{ padding: '16px' }}>
        <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '16px' }}>
          {selectedBlock ? '🧩 Propriétés du bloc' : '📄 Propriétés de la slide'}
        </h3>

        {selectedBlock ? (
          <BlockProperties block={selectedBlock} onUpdate={onBlockUpdate} />
        ) : slide ? (
          <SlideProperties slide={slide} onUpdate={onSlideUpdate} />
        ) : null}
      </div>
    </aside>
  )
}

function SlideProperties({ slide, onUpdate }: { slide: Slide; onUpdate: (updates: Partial<Slide>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>Titre de la slide</label>
        <input
          type="text"
          value={slide.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          style={inputStyle}
          placeholder="Titre optionnel"
        />
      </div>

      <div>
        <label style={labelStyle}>Layout</label>
        <select
          value={slide.layout}
          onChange={(e) => onUpdate({ layout: e.target.value as SlideLayout })}
          style={inputStyle}
        >
          <option value="default">Par défaut</option>
          <option value="title">Titre centré</option>
          <option value="two-column">Deux colonnes</option>
          <option value="image-left">Image à gauche</option>
          <option value="image-right">Image à droite</option>
          <option value="full-image">Image pleine page</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>Couleur de fond</label>
        <input
          type="color"
          value={slide.background_color || '#ffffff'}
          onChange={(e) => onUpdate({ background_color: e.target.value })}
          style={{ ...inputStyle, height: '40px', padding: '4px' }}
        />
      </div>

      <div>
        <label style={labelStyle}>Notes du présentateur</label>
        <textarea
          value={slide.speaker_notes || ''}
          onChange={(e) => onUpdate({ speaker_notes: e.target.value })}
          style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
          placeholder="Notes visibles uniquement par vous..."
        />
      </div>
    </div>
  )
}

function BlockProperties({ block, onUpdate }: { block: SlideBlock; onUpdate: (updates: Partial<SlideBlock>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ padding: '12px', backgroundColor: '#3d3d4d', borderRadius: '8px' }}>
        <span style={{ color: '#a0a0b0', fontSize: '12px' }}>Type de bloc</span>
        <div style={{ color: 'white', fontWeight: '600', marginTop: '4px' }}>
          {BLOCK_TOOLBAR_ITEMS.find(b => b.type === block.block_type)?.label || block.block_type}
        </div>
      </div>

      {/* Propriétés spécifiques selon le type */}
      {block.block_type === 'heading' && (
        <div>
          <label style={labelStyle}>Niveau</label>
          <select
            value={block.content.level || 2}
            onChange={(e) => onUpdate({ content: { ...block.content, level: parseInt(e.target.value) } })}
            style={inputStyle}
          >
            <option value={1}>H1 - Très grand</option>
            <option value={2}>H2 - Grand</option>
            <option value={3}>H3 - Moyen</option>
            <option value={4}>H4 - Petit</option>
          </select>
        </div>
      )}

      {block.block_type === 'image' && (
        <div>
          <label style={labelStyle}>URL de l'image</label>
          <input
            type="text"
            value={block.content.url || ''}
            onChange={(e) => onUpdate({ content: { ...block.content, url: e.target.value } })}
            style={inputStyle}
            placeholder="https://..."
          />
        </div>
      )}

      {block.block_type === 'math' && (
        <div>
          <label style={labelStyle}>Formule LaTeX</label>
          <textarea
            value={block.content.latex || ''}
            onChange={(e) => onUpdate({ content: { ...block.content, latex: e.target.value } })}
            style={{ ...inputStyle, fontFamily: 'monospace', minHeight: '80px' }}
            placeholder="\int_a^b f(x)dx"
          />
        </div>
      )}

      {block.block_type === 'callout' && (
        <div>
          <label style={labelStyle}>Type d'encadré</label>
          <select
            value={block.content.type || 'info'}
            onChange={(e) => onUpdate({ content: { ...block.content, type: e.target.value } })}
            style={inputStyle}
          >
            <option value="info">ℹ️ Information</option>
            <option value="warning">⚠️ Attention</option>
            <option value="tip">💡 Astuce</option>
            <option value="danger">🚨 Danger</option>
            <option value="question">❓ Question</option>
          </select>
        </div>
      )}

      {/* Animation */}
      <div>
        <label style={labelStyle}>Animation</label>
        <select
          value={block.animation || ''}
          onChange={(e) => onUpdate({ animation: e.target.value || undefined })}
          style={inputStyle}
        >
          <option value="">Aucune</option>
          <option value="fadeIn">Fondu</option>
          <option value="slideUp">Glisser vers le haut</option>
          <option value="slideLeft">Glisser depuis la gauche</option>
          <option value="zoomIn">Zoom</option>
          <option value="bounce">Rebond</option>
        </select>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#a0a0b0',
  fontSize: '12px',
  marginBottom: '6px'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#3d3d4d',
  border: '1px solid #4d4d5d',
  borderRadius: '8px',
  color: 'white',
  fontSize: '14px',
  boxSizing: 'border-box'
}

function BlockPalette({
  onSelect,
  onClose
}: {
  onSelect: (type: SlideBlockType) => void
  onClose: () => void
}) {
  const [activeCategory, setActiveCategory] = useState<string>('text')
  
  const categories = [
    { id: 'text', label: 'Texte', icon: '📝' },
    { id: 'media', label: 'Média', icon: '🖼️' },
    { id: 'science', label: 'Sciences', icon: '🔬' },
    { id: 'interactive', label: 'Interactif', icon: '🎮' },
    { id: 'layout', label: 'Mise en page', icon: '📐' }
  ]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}
    onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '700px',
          maxHeight: '80vh',
          backgroundColor: '#2d2d3d',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid #3d3d4d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: 'white', margin: 0 }}>➕ Ajouter un bloc</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a0a0b0', fontSize: '24px', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex' }}>
          {/* Catégories */}
          <div style={{ width: '180px', borderRight: '1px solid #3d3d4d', padding: '16px' }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: activeCategory === cat.id ? '#8b5cf6' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Blocs */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', maxHeight: '400px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {BLOCK_TOOLBAR_ITEMS
                .filter(item => item.category === activeCategory)
                .map((item) => (
                  <button
                    key={item.type}
                    onClick={() => onSelect(item.type)}
                    style={{
                      padding: '20px 16px',
                      backgroundColor: '#3d3d4d',
                      border: '2px solid transparent',
                      borderRadius: '12px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                  >
                    <span style={{ fontSize: '28px' }}>{item.icon}</span>
                    <span style={{ fontSize: '13px' }}>{item.label}</span>
                    {item.shortcut && (
                      <span style={{ fontSize: '10px', color: '#6b7280' }}>{item.shortcut}</span>
                    )}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TemplateGallery({
  onSelect,
  onClose
}: {
  onSelect: (template: SlideTemplate) => void
  onClose: () => void
}) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  
  // TODO: Charger les templates depuis l'API
  const templates: SlideTemplate[] = []

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}
    onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '900px',
          maxHeight: '80vh',
          backgroundColor: '#2d2d3d',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid #3d3d4d' }}>
          <h2 style={{ color: 'white', margin: 0 }}>📚 Galerie de templates</h2>
        </div>

        <div style={{ display: 'flex', gap: '8px', padding: '16px', borderBottom: '1px solid #3d3d4d' }}>
          <button 
            onClick={() => setActiveCategory('all')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeCategory === 'all' ? '#8b5cf6' : '#3d3d4d',
              border: 'none',
              borderRadius: '20px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Tous
          </button>
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '8px 16px',
                backgroundColor: activeCategory === cat.id ? cat.color : '#3d3d4d',
                border: 'none',
                borderRadius: '20px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', maxHeight: '500px' }}>
          {templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📭</span>
              <p>Les templates seront bientôt disponibles !</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {/* Template cards */}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SlideEditor