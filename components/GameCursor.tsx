'use client'

import { useEffect, useRef } from 'react'

export default function GameCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return

    const mouse = { x: -200, y: -200 }
    const ring = { x: -200, y: -200 }
    let isHover = false
    let rafId: number

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY

      const target = e.target as Element | null
      const interactive = target?.closest('a, button, [data-interactive]')
      const nowHover = !!interactive
      if (nowHover !== isHover) {
        isHover = nowHover
        ringRef.current?.classList.toggle('is-hover', isHover)
      }
    }

    const loop = () => {
      const speed = isHover ? 0.18 : 0.12
      ring.x += (mouse.x - ring.x) * speed
      ring.y += (mouse.y - ring.y) * speed

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`
      }
      if (ringRef.current) {
        const scale = isHover ? 1.8 : 1
        ringRef.current.style.transform = `translate(${ring.x}px, ${ring.y}px) scale(${scale})`
      }

      rafId = requestAnimationFrame(loop)
    }

    document.addEventListener('mousemove', onMove)
    rafId = requestAnimationFrame(loop)

    return () => {
      document.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  )
}
