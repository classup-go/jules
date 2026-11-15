'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Tool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rectangle' | 'circle' | 'triangle' | 'text' | 'latex' | 'ruler' | 'protractor' | 'compass' | 'graph' | 'image'

type GridType = 'none' | 'lines' | 'dots' | 'math' | 'isometric'

interface Point {
  x: number
  y: number
}

interface DrawingElement {
  id: string
  type: Tool
  points: Point[]
  color: string
  strokeWidth: number
  text?: string
  fontSize?: number
  latex?: string
  imageData?: string
  filled?: boolean
}

const COLORS = [
  '#000000', '#374151', '#dc2626', '#ea580c', '#f59e0b', 
  '#16a34a', '#2563eb', '#7c3aed', '#db2777', '#ffffff'
]

const STROKE_WIDTHS = [1, 2, 4, 6, 8, 12]

const MATH_SYMBOLS = [
  { symbol: '∫', name: 'Intégrale' },
  { symbol: '∑', name: 'Somme' },
  { symbol: '∏', name: 'Produit' },
  { symbol: '√', name: 'Racine' },
  { symbol: '∞', name: 'Infini' },
  { symbol: 'π', name: 'Pi' },
  { symbol: 'θ', name: 'Theta' },
  { symbol: 'α', name: 'Alpha' },
  { symbol: 'β', name: 'Beta' },
  { symbol: 'γ', name: 'Gamma' },
  { symbol: 'Δ', name: 'Delta' },
  { symbol: 'λ', name: 'Lambda' },
  { symbol: 'μ', name: 'Mu' },
  { symbol: 'σ', name: 'Sigma' },
  { symbol: 'φ', name: 'Phi' },
  { symbol: 'Ω', name: 'Omega' },
  { symbol: '±', name: 'Plus/Moins' },
  { symbol: '≠', name: 'Différent' },
  { symbol: '≤', name: 'Inférieur égal' },
  { symbol: '≥', name: 'Supérieur égal' },
  { symbol: '≈', name: 'Approximatif' },
  { symbol: '∝', name: 'Proportionnel' },
  { symbol: '∈', name: 'Appartient' },
  { symbol: '∉', name: 'N\'appartient pas' },
  { symbol: '⊂', name: 'Inclus' },
  { symbol: '∪', name: 'Union' },
  { symbol: '∩', name: 'Intersection' },
  { symbol: '∅', name: 'Ensemble vide' },
  { symbol: '⊥', name: 'Perpendiculaire' },
  { symbol: '∥', name: 'Parallèle' },
  { symbol: '∠', name: 'Angle' },
  { symbol: '°', name: 'Degré' },
]

const CHEMISTRY_SYMBOLS = [
  { symbol: '→', name: 'Réaction' },
  { symbol: '⇌', name: 'Équilibre' },
  { symbol: '↑', name: 'Gaz' },
  { symbol: '↓', name: 'Précipité' },
  { symbol: 'Δ', name: 'Chaleur' },
  { symbol: '⁺', name: 'Ion positif' },
  { symbol: '⁻', name: 'Ion négatif' },
  { symbol: '₂', name: 'Indice 2' },
  { symbol: '₃', name: 'Indice 3' },
  { symbol: '₄', name: 'Indice 4' },
]

const PHYSICS_SYMBOLS = [
  { symbol: '⃗', name: 'Vecteur' },
  { symbol: 'Ω', name: 'Ohm' },
  { symbol: 'μ', name: 'Micro' },
  { symbol: 'Δ', name: 'Variation' },
  { symbol: '∂', name: 'Dérivée partielle' },
  { symbol: '∇', name: 'Nabla' },
  { symbol: '℃', name: 'Celsius' },
  { symbol: '⊗', name: 'Produit tensoriel' },
]

export default function WhiteboardPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioChunksRef = useRef<Blob[]>([])
  
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [fillShape, setFillShape] = useState(false)
  const [elements, setElements] = useState<DrawingElement[]>([])
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null)
  const [history, setHistory] = useState<DrawingElement[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showStrokePicker, setShowStrokePicker] = useState(false)
  const [showSymbols, setShowSymbols] = useState(false)
  const [symbolCategory, setSymbolCategory] = useState<'math' | 'chemistry' | 'physics'>('math')
  const [textInput, setTextInput] = useState('')
  const [textPosition, setTextPosition] = useState<Point | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 1400, height: 900 })
  const [zoom, setZoom] = useState(1)
  const [gridType, setGridType] = useState<GridType>('lines')
  const [showGrid, setShowGrid] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [boardName, setBoardName] = useState('Tableau sans titre')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isAudioRecording, setIsAudioRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showLatexModal, setShowLatexModal] = useState(false)
  const [latexInput, setLatexInput] = useState('')
  const [latexPosition, setLatexPosition] = useState<Point | null>(null)
  const [showTools, setShowTools] = useState(true)
  const [activePanel, setActivePanel] = useState<'tools' | 'shapes' | 'math' | 'record' | null>('tools')

  // Canvas size
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCanvasSize({
          width: Math.max(rect.width - 20, 800),
          height: Math.max(rect.height - 20, 600)
        })
      }
    }
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [])

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording || isAudioRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      setRecordingTime(0)
    }
    return () => clearInterval(interval)
  }, [isRecording, isAudioRecording])

  // Redraw canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    if (showGrid) {
      drawGrid(ctx, canvas.width, canvas.height)
    }

    // Draw elements
    ;[...elements, currentElement].filter(Boolean).forEach((element) => {
      if (element) drawElement(ctx, element)
    })
  }, [elements, currentElement, showGrid, gridType])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas, canvasSize])

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20
    ctx.save()
    
    switch (gridType) {
      case 'lines':
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 0.5
        for (let x = 0; x <= width; x += gridSize) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, height)
          ctx.stroke()
        }
        for (let y = 0; y <= height; y += gridSize) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(width, y)
          ctx.stroke()
        }
        break

      case 'dots':
        ctx.fillStyle = '#d1d5db'
        for (let x = 0; x <= width; x += gridSize) {
          for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath()
            ctx.arc(x, y, 1, 0, 2 * Math.PI)
            ctx.fill()
          }
        }
        break

      case 'math':
        // Axes
        const centerX = width / 2
        const centerY = height / 2
        ctx.strokeStyle = '#9ca3af'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, centerY)
        ctx.lineTo(width, centerY)
        ctx.moveTo(centerX, 0)
        ctx.lineTo(centerX, height)
        ctx.stroke()

        // Grid lines
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 0.5
        for (let x = centerX % gridSize; x <= width; x += gridSize) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, height)
          ctx.stroke()
        }
        for (let y = centerY % gridSize; y <= height; y += gridSize) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(width, y)
          ctx.stroke()
        }

        // Arrows
        ctx.fillStyle = '#9ca3af'
        ctx.beginPath()
        ctx.moveTo(width - 10, centerY - 5)
        ctx.lineTo(width, centerY)
        ctx.lineTo(width - 10, centerY + 5)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(centerX - 5, 10)
        ctx.lineTo(centerX, 0)
        ctx.lineTo(centerX + 5, 10)
        ctx.fill()

        // Labels
        ctx.fillStyle = '#6b7280'
        ctx.font = '12px Arial'
        ctx.fillText('x', width - 15, centerY - 10)
        ctx.fillText('y', centerX + 10, 15)
        ctx.fillText('O', centerX + 5, centerY + 15)
        break

      case 'isometric':
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 0.5
        const isoSize = 30
        for (let x = -height; x <= width + height; x += isoSize) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x + height, height)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(x + height, 0)
          ctx.lineTo(x, height)
          ctx.stroke()
        }
        break
    }
    ctx.restore()
  }

  const drawElement = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    ctx.save()
    ctx.strokeStyle = element.color
    ctx.fillStyle = element.color
    ctx.lineWidth = element.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    switch (element.type) {
      case 'pen':
        if (element.points.length < 2) break
        ctx.beginPath()
        ctx.moveTo(element.points[0].x, element.points[0].y)
        for (let i = 1; i < element.points.length; i++) {
          const p0 = element.points[i - 1]
          const p1 = element.points[i]
          const midX = (p0.x + p1.x) / 2
          const midY = (p0.y + p1.y) / 2
          ctx.quadraticCurveTo(p0.x, p0.y, midX, midY)
        }
        ctx.stroke()
        break

      case 'highlighter':
        ctx.globalAlpha = 0.3
        ctx.lineWidth = element.strokeWidth * 3
        if (element.points.length < 2) break
        ctx.beginPath()
        ctx.moveTo(element.points[0].x, element.points[0].y)
        for (let i = 1; i < element.points.length; i++) {
          ctx.lineTo(element.points[i].x, element.points[i].y)
        }
        ctx.stroke()
        break

      case 'eraser':
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = element.strokeWidth * 4
        if (element.points.length < 2) break
        ctx.beginPath()
        ctx.moveTo(element.points[0].x, element.points[0].y)
        for (let i = 1; i < element.points.length; i++) {
          ctx.lineTo(element.points[i].x, element.points[i].y)
        }
        ctx.stroke()
        break

      case 'line':
        if (element.points.length < 2) break
        ctx.beginPath()
        ctx.moveTo(element.points[0].x, element.points[0].y)
        ctx.lineTo(element.points[element.points.length - 1].x, element.points[element.points.length - 1].y)
        ctx.stroke()
        break

      case 'arrow':
        if (element.points.length < 2) break
        const start = element.points[0]
        const end = element.points[element.points.length - 1]
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        const headLength = 15 + element.strokeWidth
        ctx.beginPath()
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6))
        ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6))
        ctx.closePath()
        ctx.fill()
        break

      case 'rectangle':
        if (element.points.length < 2) break
        const rectStart = element.points[0]
        const rectEnd = element.points[element.points.length - 1]
        if (element.filled) {
          ctx.fillRect(rectStart.x, rectStart.y, rectEnd.x - rectStart.x, rectEnd.y - rectStart.y)
        } else {
          ctx.strokeRect(rectStart.x, rectStart.y, rectEnd.x - rectStart.x, rectEnd.y - rectStart.y)
        }
        break

      case 'circle':
        if (element.points.length < 2) break
        const circleStart = element.points[0]
        const circleEnd = element.points[element.points.length - 1]
        const radiusX = Math.abs(circleEnd.x - circleStart.x) / 2
        const radiusY = Math.abs(circleEnd.y - circleStart.y) / 2
        const centerX = circleStart.x + (circleEnd.x - circleStart.x) / 2
        const centerY = circleStart.y + (circleEnd.y - circleStart.y) / 2
        ctx.beginPath()
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
        if (element.filled) {
          ctx.fill()
        } else {
          ctx.stroke()
        }
        break

      case 'triangle':
        if (element.points.length < 2) break
        const triStart = element.points[0]
        const triEnd = element.points[element.points.length - 1]
        const triWidth = triEnd.x - triStart.x
        const triHeight = triEnd.y - triStart.y
        ctx.beginPath()
        ctx.moveTo(triStart.x + triWidth / 2, triStart.y)
        ctx.lineTo(triEnd.x, triEnd.y)
        ctx.lineTo(triStart.x, triEnd.y)
        ctx.closePath()
        if (element.filled) {
          ctx.fill()
        } else {
          ctx.stroke()
        }
        break

      case 'text':
      case 'latex':
        if (element.text) {
          ctx.font = `${element.fontSize || 24}px "Times New Roman", serif`
          ctx.fillText(element.text, element.points[0].x, element.points[0].y)
        }
        break

      case 'ruler':
        if (element.points.length < 2) break
        const rulerStart = element.points[0]
        const rulerEnd = element.points[element.points.length - 1]
        const rulerLength = Math.sqrt(Math.pow(rulerEnd.x - rulerStart.x, 2) + Math.pow(rulerEnd.y - rulerStart.y, 2))
        const rulerAngle = Math.atan2(rulerEnd.y - rulerStart.y, rulerEnd.x - rulerStart.x)
        
        ctx.beginPath()
        ctx.moveTo(rulerStart.x, rulerStart.y)
        ctx.lineTo(rulerEnd.x, rulerEnd.y)
        ctx.stroke()

        // Tick marks
        const tickSpacing = 20
        const numTicks = Math.floor(rulerLength / tickSpacing)
        for (let i = 0; i <= numTicks; i++) {
          const tickX = rulerStart.x + (i * tickSpacing) * Math.cos(rulerAngle)
          const tickY = rulerStart.y + (i * tickSpacing) * Math.sin(rulerAngle)
          const tickLength = i % 5 === 0 ? 10 : 5
          ctx.beginPath()
          ctx.moveTo(tickX, tickY)
          ctx.lineTo(
            tickX + tickLength * Math.cos(rulerAngle + Math.PI / 2),
            tickY + tickLength * Math.sin(rulerAngle + Math.PI / 2)
          )
          ctx.stroke()
          
          if (i % 5 === 0) {
            ctx.font = '10px Arial'
            ctx.fillText(`${i}`, tickX + 15 * Math.cos(rulerAngle + Math.PI / 2), tickY + 15 * Math.sin(rulerAngle + Math.PI / 2))
          }
        }

        // Length label
        ctx.font = '12px Arial'
        ctx.fillStyle = element.color
        const labelX = (rulerStart.x + rulerEnd.x) / 2
        const labelY = (rulerStart.y + rulerEnd.y) / 2 - 10
        ctx.fillText(`${Math.round(rulerLength / 20)} cm`, labelX, labelY)
        break

      case 'protractor':
        if (element.points.length < 2) break
        const protCenter = element.points[0]
        const protEdge = element.points[element.points.length - 1]
        const protRadius = Math.sqrt(Math.pow(protEdge.x - protCenter.x, 2) + Math.pow(protEdge.y - protCenter.y, 2))
        
        // Draw semicircle
        ctx.beginPath()
        ctx.arc(protCenter.x, protCenter.y, protRadius, Math.PI, 0)
        ctx.stroke()
        
        // Draw base line
        ctx.beginPath()
        ctx.moveTo(protCenter.x - protRadius, protCenter.y)
        ctx.lineTo(protCenter.x + protRadius, protCenter.y)
        ctx.stroke()

        // Draw angle marks
        for (let angle = 0; angle <= 180; angle += 10) {
          const rad = (angle * Math.PI) / 180
          const innerR = angle % 30 === 0 ? protRadius - 15 : protRadius - 8
          ctx.beginPath()
          ctx.moveTo(
            protCenter.x + protRadius * Math.cos(Math.PI - rad),
            protCenter.y - protRadius * Math.sin(Math.PI - rad)
          )
          ctx.lineTo(
            protCenter.x + innerR * Math.cos(Math.PI - rad),
            protCenter.y - innerR * Math.sin(Math.PI - rad)
          )
          ctx.stroke()

          if (angle % 30 === 0) {
            ctx.font = '10px Arial'
            ctx.fillText(
              `${angle}°`,
              protCenter.x + (protRadius - 25) * Math.cos(Math.PI - rad) - 10,
              protCenter.y - (protRadius - 25) * Math.sin(Math.PI - rad) + 4
            )
          }
        }
        break

      case 'compass':
        if (element.points.length < 2) break
        const compCenter = element.points[0]
        const compEdge = element.points[element.points.length - 1]
        const compRadius = Math.sqrt(Math.pow(compEdge.x - compCenter.x, 2) + Math.pow(compEdge.y - compCenter.y, 2))
        
        ctx.beginPath()
        ctx.arc(compCenter.x, compCenter.y, compRadius, 0, 2 * Math.PI)
        ctx.stroke()
        
        // Center point
        ctx.beginPath()
        ctx.arc(compCenter.x, compCenter.y, 3, 0, 2 * Math.PI)
        ctx.fill()

        // Radius label
        ctx.font = '12px Arial'
        ctx.fillText(`r = ${Math.round(compRadius / 20)} cm`, compCenter.x + 10, compCenter.y - 10)
        break

      case 'graph':
        // Draw function graph placeholder
        if (element.points.length < 2) break
        const graphStart = element.points[0]
        const graphEnd = element.points[element.points.length - 1]
        const graphWidth = graphEnd.x - graphStart.x
        const graphHeight = graphEnd.y - graphStart.y

        // Axes
        ctx.strokeStyle = '#374151'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(graphStart.x, graphStart.y + graphHeight / 2)
        ctx.lineTo(graphEnd.x, graphStart.y + graphHeight / 2)
        ctx.moveTo(graphStart.x + graphWidth / 2, graphStart.y)
        ctx.lineTo(graphStart.x + graphWidth / 2, graphEnd.y)
        ctx.stroke()

        // Sample sine wave
        ctx.strokeStyle = element.color
        ctx.lineWidth = element.strokeWidth
        ctx.beginPath()
        const midY = graphStart.y + graphHeight / 2
        const midX = graphStart.x + graphWidth / 2
        const amplitude = graphHeight / 3
        for (let x = graphStart.x; x <= graphEnd.x; x++) {
          const normalizedX = (x - midX) / 50
          const y = midY - amplitude * Math.sin(normalizedX)
          if (x === graphStart.x) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
        break
    }
    ctx.restore()
  }

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    let clientX, clientY
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const point = getCanvasPoint(e)

    if (tool === 'text') {
      setTextPosition(point)
      return
    }
    if (tool === 'latex') {
      setLatexPosition(point)
      setShowLatexModal(true)
      return
    }

    setIsDrawing(true)
    const newElement: DrawingElement = {
      id: Date.now().toString(),
      type: tool,
      points: [point],
      color: color,
      strokeWidth: strokeWidth,
      filled: fillShape
    }
    setCurrentElement(newElement)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentElement) return
    e.preventDefault()
    const point = getCanvasPoint(e)
    
    if (['pen', 'highlighter', 'eraser'].includes(tool)) {
      setCurrentElement({ ...currentElement, points: [...currentElement.points, point] })
    } else {
      setCurrentElement({ ...currentElement, points: [currentElement.points[0], point] })
    }
  }

  const stopDrawing = () => {
    if (!isDrawing || !currentElement) return
    setIsDrawing(false)
    
    if (currentElement.points.length > 1 || ['text', 'latex'].includes(currentElement.type)) {
      const newElements = [...elements, currentElement]
      setElements(newElements)
      updateHistory(newElements)
    }
    setCurrentElement(null)
  }

  const updateHistory = (newElements: DrawingElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newElements)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const addText = () => {
    if (!textInput.trim() || !textPosition) return
    const newElement: DrawingElement = {
      id: Date.now().toString(),
      type: 'text',
      points: [textPosition],
      color: color,
      strokeWidth: strokeWidth,
      text: textInput,
      fontSize: 24
    }
    const newElements = [...elements, newElement]
    setElements(newElements)
    updateHistory(newElements)
    setTextInput('')
    setTextPosition(null)
  }

  const addLatex = () => {
    if (!latexInput.trim() || !latexPosition) return
    const newElement: DrawingElement = {
      id: Date.now().toString(),
      type: 'latex',
      points: [latexPosition],
      color: color,
      strokeWidth: strokeWidth,
      text: latexInput,
      latex: latexInput,
      fontSize: 28
    }
    const newElements = [...elements, newElement]
    setElements(newElements)
    updateHistory(newElements)
    setLatexInput('')
    setLatexPosition(null)
    setShowLatexModal(false)
  }

  const insertSymbol = (symbol: string) => {
    setLatexInput(prev => prev + symbol)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setElements(history[historyIndex - 1])
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setElements(history[historyIndex + 1])
    }
  }

  const clearCanvas = () => {
    if (confirm('Effacer tout le tableau ?')) {
      setElements([])
      updateHistory([])
    }
  }

  const saveAsImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${boardName.replace(/\s+/g, '_')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const saveAsPDF = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Create a simple PDF-like download (in real app, use jsPDF)
    const imageData = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `${boardName.replace(/\s+/g, '_')}.png`
    link.href = imageData
    link.click()
  }

  // Video Recording
  const startRecording = async () => {
    try {
      const canvas = canvasRef.current
      if (!canvas) return

      const stream = canvas.captureStream(30)
      
      // Add audio
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStream.getAudioTracks().forEach(track => stream.addTrack(track))

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `${boardName.replace(/\s+/g, '_')}_video.webm`
        link.href = url
        link.click()
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Recording error:', error)
      alert('Erreur lors du démarrage de l\'enregistrement. Vérifiez les permissions du microphone.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Audio Recording
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioRecorder = new MediaRecorder(stream)
      audioRecorderRef.current = audioRecorder
      audioChunksRef.current = []

      audioRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      audioRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `${boardName.replace(/\s+/g, '_')}_audio.webm`
        link.href = url
        link.click()
      }

      audioRecorder.start()
      setIsAudioRecording(true)
    } catch (error) {
      console.error('Audio recording error:', error)
      alert('Erreur lors du démarrage de l\'enregistrement audio.')
    }
  }

  const stopAudioRecording = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop()
      setIsAudioRecording(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const saveToDatabase = async () => {
    setIsSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Vous devez être connecté')
      setIsSaving(false)
      return
    }
    const canvas = canvasRef.current
    if (!canvas) {
      setIsSaving(false)
      return
    }
    const imageData = canvas.toDataURL('image/png')
    const { error } = await supabase
      .from('whiteboards')
      .insert({
        teacher_id: user.id,
        name: boardName,
        data: JSON.stringify(elements),
        thumbnail: imageData
      })
    if (error) {
      console.error('Save error:', error)
      alert('Erreur lors de la sauvegarde')
    } else {
      alert('Tableau sauvegardé !')
      setShowSaveModal(false)
    }
    setIsSaving(false)
  }

  const drawingTools = [
    { id: 'select', icon: '👆', label: 'Sélection' },
    { id: 'pen', icon: '✏️', label: 'Crayon' },
    { id: 'highlighter', icon: '🖍️', label: 'Surligneur' },
    { id: 'eraser', icon: '🧽', label: 'Gomme' },
  ]

  const shapeTools = [
    { id: 'line', icon: '📏', label: 'Ligne' },
    { id: 'arrow', icon: '➡️', label: 'Flèche' },
    { id: 'rectangle', icon: '⬜', label: 'Rectangle' },
    { id: 'circle', icon: '⭕', label: 'Cercle' },
    { id: 'triangle', icon: '🔺', label: 'Triangle' },
  ]

  const mathTools = [
    { id: 'text', icon: '📝', label: 'Texte' },
    { id: 'latex', icon: '∑', label: 'Équation' },
    { id: 'ruler', icon: '📐', label: 'Règle' },
    { id: 'protractor', icon: '📊', label: 'Rapporteur' },
    { id: 'compass', icon: '⭕', label: 'Compas' },
    { id: 'graph', icon: '📈', label: 'Graphique' },
  ]

  const gridOptions: { id: GridType; label: string; icon: string }[] = [
    { id: 'none', label: 'Aucune', icon: '⬜' },
    { id: 'lines', label: 'Lignes', icon: '▦' },
    { id: 'dots', label: 'Points', icon: '⋯' },
    { id: 'math', label: 'Math (axes)', icon: '📊' },
    { id: 'isometric', label: 'Isométrique', icon: '◇' },
  ]

  return (
    <div style={{ height: 'calc(100vh - 88px)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/teacher/dashboard" style={{ color: '#617589', textDecoration: 'none', fontSize: '14px' }}>← Retour</Link>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111418', margin: 0 }}>🎨 Tableau Blanc Éducatif</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Recording indicator */}
          {(isRecording || isAudioRecording) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fef2f2', padding: '6px 12px', borderRadius: '20px', border: '1px solid #fecaca' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626', animation: 'pulse 1s infinite' }} />
              <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '13px' }}>{formatTime(recordingTime)}</span>
            </div>
          )}

          <button onClick={undo} disabled={historyIndex <= 0} style={{ padding: '8px 12px', backgroundColor: historyIndex <= 0 ? '#f3f4f6' : 'white', border: '1px solid #dbe0e6', borderRadius: '8px', cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer', fontSize: '13px', color: historyIndex <= 0 ? '#9ca3af' : '#374151' }}>↩️</button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} style={{ padding: '8px 12px', backgroundColor: historyIndex >= history.length - 1 ? '#f3f4f6' : 'white', border: '1px solid #dbe0e6', borderRadius: '8px', cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer', fontSize: '13px', color: historyIndex >= history.length - 1 ? '#9ca3af' : '#374151' }}>↪️</button>
          <button onClick={clearCanvas} style={{ padding: '8px 12px', backgroundColor: 'white', border: '1px solid #dbe0e6', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#dc2626' }}>🗑️</button>
          
          <div style={{ width: '1px', height: '28px', backgroundColor: '#dbe0e6' }} />
          
          <button onClick={saveAsImage} style={{ padding: '8px 12px', backgroundColor: 'white', border: '1px solid #dbe0e6', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>📥 PNG</button>
          <button onClick={() => setShowSaveModal(true)} style={{ padding: '8px 16px', backgroundColor: '#2b8cee', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'white' }}>💾 Sauvegarder</button>
        </div>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', gap: '8px', overflow: 'hidden' }}>
        {/* Left Toolbar */}
        <div style={{ width: '60px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          {/* Drawing Tools */}
          <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', padding: '4px 0' }}>Dessin</div>
          {drawingTools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id as Tool)}
              title={t.label}
              style={{
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                backgroundColor: tool === t.id ? '#dbeafe' : 'transparent',
                border: tool === t.id ? '2px solid #2b8cee' : '1px solid transparent',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              {t.icon}
            </button>
          ))}

          <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '4px 0' }} />

          {/* Shape Tools */}
          <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', padding: '4px 0' }}>Formes</div>
          {shapeTools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id as Tool)}
              title={t.label}
              style={{
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                backgroundColor: tool === t.id ? '#dbeafe' : 'transparent',
                border: tool === t.id ? '2px solid #2b8cee' : '1px solid transparent',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              {t.icon}
            </button>
          ))}

          <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '4px 0' }} />

          {/* Math Tools */}
          <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', padding: '4px 0' }}>Maths</div>
          {mathTools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id as Tool)}
              title={t.label}
              style={{
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                backgroundColor: tool === t.id ? '#dbeafe' : 'transparent',
                border: tool === t.id ? '2px solid #2b8cee' : '1px solid transparent',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Canvas Container */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Top Options Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', padding: '8px 12px', borderRadius: '10px', border: '1px solid #dbe0e6', flexWrap: 'wrap' }}>
            {/* Color */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowColorPicker(!showColorPicker); setShowStrokePicker(false); setShowSymbols(false) }}
                style={{ width: '36px', height: '36px', padding: '4px', backgroundColor: 'white', border: '2px solid #dbe0e6', borderRadius: '8px', cursor: 'pointer' }}
              >
                <div style={{ width: '100%', height: '100%', backgroundColor: color, borderRadius: '4px', border: color === '#ffffff' ? '1px solid #dbe0e6' : 'none' }} />
              </button>
              {showColorPicker && (
                <div style={{ position: 'absolute', top: '44px', left: '0', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '10px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 50, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => { setColor(c); setShowColorPicker(false) }} style={{ width: '28px', height: '28px', backgroundColor: c, border: c === color ? '2px solid #2b8cee' : c === '#ffffff' ? '1px solid #dbe0e6' : 'none', borderRadius: '6px', cursor: 'pointer' }} />
                  ))}
                </div>
              )}
            </div>

            {/* Stroke */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowStrokePicker(!showStrokePicker); setShowColorPicker(false); setShowSymbols(false) }}
                style={{ height: '36px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'white', border: '2px solid #dbe0e6', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#374151' }}
              >
                <div style={{ width: '20px', height: `${Math.min(strokeWidth, 8)}px`, backgroundColor: color, borderRadius: '2px' }} />
                {strokeWidth}px
              </button>
              {showStrokePicker && (
                <div style={{ position: 'absolute', top: '44px', left: '0', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 50 }}>
                  {STROKE_WIDTHS.map((w) => (
                    <button key={w} onClick={() => { setStrokeWidth(w); setShowStrokePicker(false) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', backgroundColor: strokeWidth === w ? '#f3f4f6' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%' }}>
                      <div style={{ width: '30px', height: `${w}px`, backgroundColor: color, borderRadius: '2px' }} />
                      <span style={{ fontSize: '12px' }}>{w}px</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fill toggle */}
            {['rectangle', 'circle', 'triangle'].includes(tool) && (
              <button
                onClick={() => setFillShape(!fillShape)}
                style={{ padding: '6px 12px', backgroundColor: fillShape ? '#dbeafe' : 'white', border: fillShape ? '2px solid #2b8cee' : '1px solid #dbe0e6', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
              >
                {fillShape ? '■ Rempli' : '□ Contour'}
              </button>
            )}

            <div style={{ width: '1px', height: '24px', backgroundColor: '#dbe0e6' }} />

            {/* Grid */}
            <select
              value={gridType}
              onChange={(e) => setGridType(e.target.value as GridType)}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dbe0e6', fontSize: '12px', cursor: 'pointer' }}
            >
              {gridOptions.map(g => (
                <option key={g.id} value={g.id}>{g.icon} {g.label}</option>
              ))}
            </select>

            <button
              onClick={() => setShowGrid(!showGrid)}
              style={{ padding: '6px 10px', backgroundColor: showGrid ? '#dbeafe' : 'white', border: '1px solid #dbe0e6', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
            >
              {showGrid ? '👁️' : '🙈'} Grille
            </button>

            <div style={{ width: '1px', height: '24px', backgroundColor: '#dbe0e6' }} />

            {/* Zoom */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} style={{ width: '28px', height: '28px', border: '1px solid #dbe0e6', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', backgroundColor: 'white' }}>−</button>
              <span style={{ fontSize: '12px', minWidth: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} style={{ width: '28px', height: '28px', border: '1px solid #dbe0e6', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', backgroundColor: 'white' }}>+</button>
            </div>

            <div style={{ flex: 1 }} />

            {/* Recording buttons */}
            {!isRecording && !isAudioRecording ? (
              <>
                <button onClick={startAudioRecording} style={{ padding: '6px 12px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>🎤 Audio</button>
                <button onClick={startRecording} style={{ padding: '6px 12px', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>🎥 Vidéo</button>
              </>
            ) : (
              <button 
                onClick={isRecording ? stopRecording : stopAudioRecording} 
                style={{ padding: '6px 16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
              >
                ⏹️ Arrêter
              </button>
            )}
          </div>

          {/* Canvas */}
          <div ref={containerRef} style={{ flex: 1, backgroundColor: '#e5e7eb', borderRadius: '12px', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                cursor: tool === 'text' || tool === 'latex' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair',
                transform: `scale(${zoom})`,
                transformOrigin: 'center',
                touchAction: 'none'
              }}
            />
          </div>
        </div>

        {/* Right Panel - Math Symbols */}
        <div style={{ width: '180px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['math', 'chemistry', 'physics'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setSymbolCategory(cat)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  fontSize: '10px',
                  fontWeight: symbolCategory === cat ? '600' : '400',
                  backgroundColor: symbolCategory === cat ? '#dbeafe' : '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: symbolCategory === cat ? '#2563eb' : '#6b7280'
                }}
              >
                {cat === 'math' ? '∑ Math' : cat === 'chemistry' ? '⚗️ Chimie' : '⚡ Phys'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {(symbolCategory === 'math' ? MATH_SYMBOLS : symbolCategory === 'chemistry' ? CHEMISTRY_SYMBOLS : PHYSICS_SYMBOLS).map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  if (tool === 'latex' && showLatexModal) {
                    insertSymbol(s.symbol)
                  } else {
                    setTool('latex')
                    setLatexInput(s.symbol)
                  }
                }}
                title={s.name}
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {s.symbol}
              </button>
            ))}
          </div>

          <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '4px 0' }} />

          {/* Quick formulas */}
          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>Formules rapides</div>
          {[
            { label: 'Pythagore', formula: 'a² + b² = c²' },
            { label: 'Quadratique', formula: 'x = (-b ± √Δ) / 2a' },
            { label: 'Dérivée', formula: "f'(x) = lim (f(x+h)-f(x))/h" },
            { label: 'Intégrale', formula: '∫f(x)dx = F(x) + C' },
            { label: 'E=mc²', formula: 'E = mc²' },
            { label: 'PV=nRT', formula: 'PV = nRT' },
            { label: 'F=ma', formula: 'F = ma' },
            { label: 'Ohm', formula: 'U = R × I' },
          ].map((f, i) => (
            <button
              key={i}
              onClick={() => {
                setTool('latex')
                setLatexInput(f.formula)
              }}
              style={{
                padding: '6px 8px',
                fontSize: '11px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ color: '#6b7280' }}>{f.label}</span>
              <span style={{ fontFamily: 'serif' }}>{f.formula.substring(0, 10)}...</span>
            </button>
          ))}
        </div>
      </div>

      {/* Text Modal */}
      {textPosition && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>📝 Ajouter du texte</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Entrez votre texte..."
              autoFocus
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #dbe0e6', fontSize: '16px', marginBottom: '16px' }}
              onKeyDown={(e) => { if (e.key === 'Enter') addText(); if (e.key === 'Escape') setTextPosition(null) }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setTextPosition(null)} style={{ padding: '10px 20px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Annuler</button>
              <button onClick={addText} style={{ padding: '10px 20px', backgroundColor: '#2b8cee', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {/* LaTeX Modal */}
      {showLatexModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '500px', maxWidth: '90vw' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>∑ Ajouter une équation</h3>
            
            {/* Quick symbols */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {['√', '∫', '∑', 'π', '∞', '±', '≠', '≤', '≥', '²', '³', 'ⁿ', '₀', '₁', '₂'].map(s => (
                <button key={s} onClick={() => insertSymbol(s)} style={{ padding: '6px 10px', fontSize: '16px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{s}</button>
              ))}
            </div>

            <input
              type="text"
              value={latexInput}
              onChange={(e) => setLatexInput(e.target.value)}
              placeholder="Ex: x² + y² = r²"
              autoFocus
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #dbe0e6', fontSize: '18px', fontFamily: 'serif', marginBottom: '12px' }}
              onKeyDown={(e) => { if (e.key === 'Enter') addLatex(); if (e.key === 'Escape') { setShowLatexModal(false); setLatexPosition(null) } }}
            />

            {/* Preview */}
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px', marginBottom: '16px', minHeight: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '24px', fontFamily: '"Times New Roman", serif', color: color }}>{latexInput || 'Aperçu'}</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowLatexModal(false); setLatexPosition(null) }} style={{ padding: '10px 20px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Annuler</button>
              <button onClick={addLatex} style={{ padding: '10px 20px', backgroundColor: '#2b8cee', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>💾 Sauvegarder le tableau</h3>
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="Nom du tableau..."
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #dbe0e6', fontSize: '16px', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSaveModal(false)} style={{ padding: '10px 20px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Annuler</button>
              <button onClick={saveToDatabase} disabled={isSaving} style={{ padding: '10px 20px', backgroundColor: '#2b8cee', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', opacity: isSaving ? 0.7 : 1 }}>{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Close pickers */}
      {(showColorPicker || showStrokePicker) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} onClick={() => { setShowColorPicker(false); setShowStrokePicker(false) }} />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}