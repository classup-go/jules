'use client'

import { useState, useRef, useEffect } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
}

type FormatType = 'bold' | 'italic' | 'underline' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'code' | 'formula'

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [isPreview, setIsPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Format text
  const applyFormat = (format: FormatType) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const beforeText = value.substring(0, start)
    const afterText = value.substring(end)

    let newText = ''
    let newCursorPos = start

    switch (format) {
      case 'bold':
        newText = `${beforeText}**${selectedText || 'texte en gras'}**${afterText}`
        newCursorPos = start + 2
        break
      case 'italic':
        newText = `${beforeText}*${selectedText || 'texte en italique'}*${afterText}`
        newCursorPos = start + 1
        break
      case 'underline':
        newText = `${beforeText}__${selectedText || 'texte souligné'}__${afterText}`
        newCursorPos = start + 2
        break
      case 'h1':
        newText = `${beforeText}\n# ${selectedText || 'Titre 1'}\n${afterText}`
        newCursorPos = start + 3
        break
      case 'h2':
        newText = `${beforeText}\n## ${selectedText || 'Titre 2'}\n${afterText}`
        newCursorPos = start + 4
        break
      case 'h3':
        newText = `${beforeText}\n### ${selectedText || 'Titre 3'}\n${afterText}`
        newCursorPos = start + 5
        break
      case 'ul':
        newText = `${beforeText}\n- ${selectedText || 'Élément de liste'}\n${afterText}`
        newCursorPos = start + 3
        break
      case 'ol':
        newText = `${beforeText}\n1. ${selectedText || 'Premier élément'}\n${afterText}`
        newCursorPos = start + 4
        break
      case 'code':
        newText = `${beforeText}\`\`\`\n${selectedText || 'code ici'}\n\`\`\`${afterText}`
        newCursorPos = start + 4
        break
      case 'formula':
        newText = `${beforeText}$$${selectedText || 'x^2 + y^2 = z^2'}$$${afterText}`
        newCursorPos = start + 2
        break
    }

    onChange(newText)

    // Restore cursor position
    setTimeout(() => {
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // Insert special element
  const insertElement = (type: 'image' | 'link' | 'table' | 'quote') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const beforeText = value.substring(0, start)
    const afterText = value.substring(start)

    let newText = ''
    let newCursorPos = start

    switch (type) {
      case 'image':
        newText = `${beforeText}\n![Description de l'image](url-de-l-image)\n${afterText}`
        newCursorPos = start + 3
        break
      case 'link':
        newText = `${beforeText}[texte du lien](https://exemple.com)${afterText}`
        newCursorPos = start + 1
        break
      case 'table':
        newText = `${beforeText}\n| Colonne 1 | Colonne 2 | Colonne 3 |\n|-----------|-----------|-----------||\n| Cellule 1 | Cellule 2 | Cellule 3 |\n${afterText}`
        newCursorPos = start + 3
        break
      case 'quote':
        newText = `${beforeText}\n> Citation ou note importante\n${afterText}`
        newCursorPos = start + 3
        break
    }

    onChange(newText)

    setTimeout(() => {
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // Render markdown preview
  const renderPreview = () => {
    // Simple markdown to HTML conversion
    let html = value
      // Headers
      .replace(/^### (.+)$/gm, '<h3 style="font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem 0;">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size: 1.5rem; font-weight: 700; margin: 1.5rem 0 0.75rem 0;">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 style="font-size: 2rem; font-weight: 800; margin: 2rem 0 1rem 0;">$1</h1>')
      // Bold, italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<u>$1</u>')
      // Lists
      .replace(/^\- (.+)$/gm, '<li style="margin-left: 1.5rem;">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left: 1.5rem;" value="$1">$2</li>')
      // Code blocks
      .replace(/```\n?([\s\S]*?)\n?```/g, '<pre style="background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0;"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="background: #f3f4f6; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-family: monospace;">$1</code>')
      // Math formulas
      .replace(/\$\$(.+?)\$\$/g, '<span style="background: #eff6ff; padding: 0.5rem; border-radius: 0.25rem; font-family: serif; font-style: italic; color: #1e40af;">$1</span>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #2b8cee; text-decoration: underline;">$1</a>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0;" />')
      // Blockquotes
      .replace(/^> (.+)$/gm, '<blockquote style="border-left: 4px solid #2b8cee; padding-left: 1rem; margin: 1rem 0; color: #617589; font-style: italic;">$1</blockquote>')
      // Line breaks
      .replace(/\n/g, '<br />')

    return html
  }

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px', color: '#111418', fontSize: '15px' }}>
          Contenu de la leçon <span style={{ color: '#dc2626' }}>*</span>
        </label>

        {/* Toolbar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          padding: '12px',
          backgroundColor: 'white',
          border: '2px solid #dbe0e6',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0'
        }}>
          {/* Text formatting */}
          <div style={{ display: 'flex', gap: '4px', paddingRight: '8px', borderRight: '1px solid #dbe0e6' }}>
            <button
              type="button"
              onClick={() => applyFormat('bold')}
              title="Gras (Ctrl+B)"
              style={{
                padding: '6px 10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #dbe0e6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => applyFormat('italic')}
              title="Italique (Ctrl+I)"
              style={{
                padding: '6px 10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #dbe0e6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontStyle: 'italic',
                fontSize: '14px'
              }}
            >
              I
            </button>
            <button
              type="button"
              onClick={() => applyFormat('underline')}
              title="Souligné"
              style={{
                padding: '6px 10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #dbe0e6',
                borderRadius: '6px',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '14px'
              }}
            >
              U
            </button>
          </div>

          {/* Headers */}
          <div style={{ display: 'flex', gap: '4px', paddingRight: '8px', borderRight: '1px solid #dbe0e6' }}>
            <button
              type="button"
              onClick={() => applyFormat('h1')}
              title="Titre 1"
              style={{
                padding: '6px 10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #dbe0e6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => applyFormat('h2')}
              title="Titre 2"
              style={{
                padding: '6px 10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #dbe0e6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => applyFormat('h3')}
              title="Titre 3"
              style={{
                padding: '6px 10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #dbe0e6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              H3
            </button>
          </div>

          {/* Lists */}
          <div style={{ display: 'flex', gap: '4px', paddingRight: '8px', borderRight: '1px solid #dbe0e6' }}>
            <button
              type="button"
              onClick={() => applyFormat('ul')}
              title="Liste à puces"
              style={{
                padding: '6px 10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #dbe0e6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              • Liste
            </button>
            <button
              type="button"
              onClick={() => applyFormat('ol')}
              title="Liste numérotée"
              style={{
                padding: '6px 10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #dbe0e6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              1. Liste
            </button>
          </div>

          {/* Special */}
          <div style={{ display: 'flex', gap: '4px', paddingRight: '8px', borderRight: '1px solid #dbe0e6' }}>
            <button
              type="button"
              onClick={() => insertElement('link')}
              title="Insérer un lien"
              style={{
                padding: '6px 10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #dbe0e6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔗
            </button>
            <button
              type="button"
              onClick={() => insertElement('image')}
              title="Insérer une image"
              style={{
                padding: '6px 10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #dbe0e6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🖼️
            </button>
            <button
              type="button"
              onClick={() => applyFormat('code')}
              title="Bloc de code"
              style={{
                padding: '6px 10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #dbe0e6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              &lt;/&gt;
            </button>
          </div>

          {/* Scientific */}
          <div style={{ display: 'flex', gap: '4px', paddingRight: '8px', borderRight: '1px solid #dbe0e6' }}>
            <button
              type="button"
              onClick={() => applyFormat('formula')}
              title="Formule mathématique"
              style={{
                padding: '6px 10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #dbe0e6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ∑ Formule
            </button>
            <button
              type="button"
              onClick={() => insertElement('table')}
              title="Insérer un tableau"
              style={{
                padding: '6px 10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #dbe0e6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📊
            </button>
            <button
              type="button"
              onClick={() => insertElement('quote')}
              title="Citation"
              style={{
                padding: '6px 10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #dbe0e6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              "
            </button>
          </div>

          {/* Preview toggle */}
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            style={{
              padding: '6px 12px',
              backgroundColor: isPreview ? '#2b8cee' : '#f9fafb',
              color: isPreview ? 'white' : '#111418',
              border: '1px solid #dbe0e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              marginLeft: 'auto'
            }}
          >
            {isPreview ? '✏️ Éditer' : '👁️ Aperçu'}
          </button>
        </div>

        {/* Editor / Preview */}
        {!isPreview ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Écrivez votre leçon ici...&#10;&#10;Utilisez la barre d'outils pour formater le texte.&#10;&#10;Exemples:&#10;**gras** *italique*&#10;# Titre principal&#10;- Liste à puces&#10;$$x^2 + y^2 = z^2$$ pour les formules"
            rows={20}
            style={{
              width: '100%',
              padding: '16px',
              border: '2px solid #dbe0e6',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              fontSize: '14px',
              fontFamily: 'monospace',
              lineHeight: '1.6',
              resize: 'vertical',
              outline: 'none'
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              minHeight: '400px',
              padding: '16px',
              border: '2px solid #dbe0e6',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              backgroundColor: 'white',
              fontSize: '14px',
              lineHeight: '1.6',
              overflowY: 'auto'
            }}
            dangerouslySetInnerHTML={{ __html: renderPreview() }}
          />
        )}

        <p style={{ marginTop: '8px', fontSize: '12px', color: '#617589' }}>
          💡 Support Markdown: Gras, italique, titres, listes, code, formules mathématiques, images, liens, tableaux
        </p>
      </div>
    </div>
  )
}
