'use client'

import { useEffect, useRef } from 'react'

type MeasurementKey = 'peso' | 'altezza' | 'massaGrassa' | 'braccio' | 'spalle' | 'torace' | 'vita' | 'gamba' | 'fianchi'

interface AnatomyPickerSVGProps {
  selected: MeasurementKey | null
  onSelect: (key: MeasurementKey) => void
}

const DOT_COORDS: Record<string, [number, number]> = {
  spalle: [100, 88],
  torace: [100, 102],
  braccio: [42, 128],
  vita: [100, 176],
  fianchi: [100, 220],
  gamba: [78, 294],
}

const F_BASE = 'rgba(211,175,55,0.07)'
const F_HOVER = 'rgba(211,175,55,0.28)'
const F_ACTIVE = 'rgba(211,175,55,0.48)'
const S_BASE = 'rgba(211,175,55,0.2)'
const S_ON = '#D3AF37'

export default function AnatomyPickerSVG({ selected, onSelect }: AnatomyPickerSVGProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const badgeRef = useRef<HTMLDivElement | null>(null)
  const dotRef = useRef<SVGCircleElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const tip = tipRef.current
    const badge = badgeRef.current
    const dot = dotRef.current

    let currentSel: string | null = selected || null

    function setGroup(key: string, mode: 'base' | 'hover' | 'active') {
      const elements = root?.querySelectorAll(`[data-key="${key}"] path, [data-key="${key}"] ellipse`)
      elements?.forEach((el) => {
        const element = el as SVGPathElement | SVGEllipseElement
        const f = element.getAttribute('fill')
        if (!f || f === 'none' || f.startsWith('url') || f.startsWith('rgba(0') || f.includes('#0')) return
        if (mode === 'active') {
          element.setAttribute('fill', F_ACTIVE)
          element.setAttribute('stroke', S_ON)
          element.setAttribute('stroke-width', '1.5')
        } else if (mode === 'hover') {
          element.setAttribute('fill', F_HOVER)
          element.setAttribute('stroke', 'rgba(211,175,55,0.6)')
        } else {
          element.setAttribute('fill', F_BASE)
          element.setAttribute('stroke', S_BASE)
          element.setAttribute('stroke-width', '1')
        }
      })
    }

    function select(key: string, label: string) {
      if (currentSel) {
        setGroup(currentSel, 'base')
        root?.querySelectorAll(`.btn[data-key="${currentSel}"]`).forEach((b) => b.classList.remove('on'))
      }
      if (currentSel === key) {
        currentSel = null
        badge?.classList.remove('on')
        if (dot) {
          dot.setAttribute('cx', '-100')
          dot.setAttribute('cy', '-100')
        }
        onSelect(null as any)
      } else {
        currentSel = key
        setGroup(key, 'active')
        root?.querySelectorAll(`.btn[data-key="${key}"]`).forEach((b) => b.classList.add('on'))
        if (badge) badge.textContent = label
        badge?.classList.add('on')
        if (dot && DOT_COORDS[key]) {
          dot.setAttribute('cx', String(DOT_COORDS[key][0]))
          dot.setAttribute('cy', String(DOT_COORDS[key][1]))
        }
        onSelect(key as MeasurementKey)
      }
    }

    // Initialize selected state
    if (selected) {
      const selectedGroup = root?.querySelector(`[data-key="${selected}"]`)
      const label = selectedGroup?.getAttribute('data-label') || selected
      currentSel = selected
      setGroup(selected, 'active')
      root?.querySelectorAll(`.btn[data-key="${selected}"]`).forEach((b) => b.classList.add('on'))
      if (badge) badge.textContent = label
      badge?.classList.add('on')
      if (dot && DOT_COORDS[selected]) {
        dot.setAttribute('cx', String(DOT_COORDS[selected][0]))
        dot.setAttribute('cy', String(DOT_COORDS[selected][1]))
      }
    }

    const muscleGroups = root?.querySelectorAll('.m')
    muscleGroups?.forEach((g) => {
      const group = g as HTMLElement
      const key = group.dataset.key || ''
      const label = group.dataset.label || key

      group.addEventListener('mouseenter', () => {
        if (tip) {
          tip.textContent = label
          tip.classList.add('on')
        }
        if (key !== currentSel) setGroup(key, 'hover')
      })

      group.addEventListener('mouseleave', () => {
        if (tip) tip.classList.remove('on')
        if (key !== currentSel) setGroup(key, 'base')
      })

      group.addEventListener('click', () => select(key, label))
    })

    const buttons = root?.querySelectorAll('.btn')
    buttons?.forEach((b) => {
      const button = b as HTMLButtonElement
      const key = button.dataset.key || ''
      const label = button.dataset.label || key
      button.addEventListener('click', () => select(key, label))
    })

    return () => {
      muscleGroups?.forEach((g) => {
        const group = g.cloneNode(true)
        g.replaceWith(group)
      })
      buttons?.forEach((b) => {
        const button = b.cloneNode(true)
        b.replaceWith(button)
      })
    }
  }, [selected, onSelect])

  return (
    <div ref={rootRef} className="wrap">
      <style jsx>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        .wrap {
          display: flex;
          gap: 40px;
          align-items: flex-start;
          flex-wrap: wrap;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }
        @media (max-width: 768px) {
          .wrap {
            flex-direction: column;
            gap: 20px;
            align-items: center;
          }
        }
        .fig {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 100%;
        }
        .svg-responsive {
          width: 220px;
          height: auto;
          max-width: 100%;
        }
        @media (max-width: 768px) {
          .fig {
            width: 100%;
            max-width: 100%;
          }
          .svg-responsive {
            width: 100%;
            max-width: 280px;
          }
        }
        .tip {
          height: 24px;
          margin-bottom: 10px;
          font-size: 10px;
          color: #d3af37;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 10px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .tip.on {
          opacity: 1;
        }
        .tip::before,
        .tip::after {
          content: '';
          display: block;
          width: 16px;
          height: 1px;
          background: #d3af37;
          opacity: 0.5;
        }
        .badge {
          margin-top: 12px;
          font-size: 10px;
          color: #d3af37;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 600;
          padding: 4px 14px;
          border-radius: 20px;
          border: 1px solid rgba(211, 175, 55, 0.35);
          background: rgba(211, 175, 55, 0.07);
          visibility: hidden;
        }
        .badge.on {
          visibility: visible;
        }
        .m {
          cursor: pointer;
        }
        .m path,
        .m ellipse {
          transition: fill 0.15s, stroke 0.15s;
        }
        .list {
          padding-top: 36px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 160px;
        }
        @media (max-width: 768px) {
          .list {
            padding-top: 0;
            width: 100%;
            min-width: auto;
          }
        }
        .list-title {
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(211, 175, 55, 0.4);
          margin-bottom: 16px;
        }
        .btn {
          background: none;
          border: 1px solid rgba(211, 175, 55, 0.12);
          border-radius: 5px;
          color: rgba(255, 255, 255, 0.4);
          padding: 7px 12px;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          text-align: left;
          transition: all 0.18s;
          font-family: 'Georgia', serif;
        }
        .btn:hover {
          border-color: rgba(211, 175, 55, 0.4);
          color: rgba(255, 255, 255, 0.7);
          background: rgba(211, 175, 55, 0.04);
        }
        .btn.on {
          border-color: #d3af37;
          color: #d3af37;
          background: rgba(211, 175, 55, 0.09);
        }
      `}</style>
      <div className="fig">
        <div ref={tipRef} className="tip" id="tip"></div>
        <svg id="svg" viewBox="0 0 200 520" className="svg-responsive" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="sk" cx="38%" cy="22%" r="72%">
              <stop offset="0%" stopColor="#3c3326" />
              <stop offset="55%" stopColor="#28200f" />
              <stop offset="100%" stopColor="#161208" />
            </radialGradient>
            <radialGradient id="skLight" cx="35%" cy="20%" r="55%">
              <stop offset="0%" stopColor="#4a4030" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0a0806" stopOpacity="0" />
            </radialGradient>
            <filter id="gl" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="sh">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.7" />
            </filter>
          </defs>

          <path
            id="body-base"
            d="M 100 8 C 88 8,80 14,78 24 C 76 34,78 44,80 50 C 72 52,64 56,58 62 C 50 68,46 76,44 84 C 38 82,28 84,22 94 C 16 104,18 118,22 130 C 26 142,32 154,36 164 C 38 172,40 182,38 192 C 32 196,28 206,30 218 C 32 228,38 236,44 240 C 40 248,38 258,40 270 C 42 282,48 292,52 298 L 54 318 C 50 324,46 336,46 350 C 46 364,50 378,56 392 C 60 402,66 410,70 416 L 72 434 C 68 438,64 446,64 456 C 64 468,68 480,72 492 C 74 500,76 508,78 514 C 80 518,84 520,88 518 C 92 516,94 510,94 502 C 94 492,92 482,90 472 L 88 458 C 92 460,96 462,100 462 C 104 462,108 460,112 458 L 110 472 C 108 482,106 492,106 502 C 106 510,108 516,112 518 C 116 520,120 518,122 514 C 124 508,126 500,128 492 C 132 480,136 468,136 456 C 136 446,132 438,128 434 L 130 416 C 134 410,140 402,144 392 C 150 378,154 364,154 350 C 154 336,150 324,146 318 L 148 298 C 152 292,158 282,160 270 C 162 258,160 248,156 240 C 162 236,168 228,170 218 C 172 206,168 196,162 192 C 160 182,160 172,162 164 C 166 154,172 142,176 130 C 180 118,182 104,176 94 C 170 84,160 82,156 84 C 154 76,150 68,142 62 C 136 56,128 52,120 50 C 122 44,124 34,122 24 C 120 14,112 8,100 8 Z"
            fill="#13100c"
            stroke="#0a0806"
            strokeWidth="0.8"
          />

          <ellipse cx="100" cy="30" rx="20" ry="24" fill="url(#sk)" />
          <ellipse cx="93" cy="24" rx="9" ry="11" fill="url(#skLight)" />
          <ellipse cx="80" cy="32" rx="3.5" ry="5.5" fill="#251e12" stroke="#1a1510" strokeWidth="0.4" />
          <ellipse cx="120" cy="32" rx="3.5" ry="5.5" fill="#251e12" stroke="#1a1510" strokeWidth="0.4" />
          <path d="M 92 50 Q 90 58 88 64 L 112 64 Q 110 58 108 50 Z" fill="url(#sk)" stroke="#0d0a06" strokeWidth="0.4" />

          <path
            d="M 62 64 C 54 70,48 82,48 96 C 48 112,52 128,56 142 C 60 154,66 164,72 172 C 76 178,80 184,82 192 L 118 192 C 120 184,124 178,128 172 C 134 164,140 154,144 142 C 148 128,152 112,152 96 C 152 82,146 70,138 64 C 128 58,116 56,100 56 C 84 56,72 58,62 64 Z"
            fill="url(#sk)"
            stroke="#0d0a06"
            strokeWidth="0.4"
          />

          <path
            d="M 44 84 C 34 90,26 104,24 118 C 22 132,26 146,30 158 C 34 168,40 174,46 172 C 50 170,54 164,56 154 C 58 142,58 128,56 116 C 54 104,50 92,44 84 Z"
            fill="url(#sk)"
            stroke="#0d0a06"
            strokeWidth="0.4"
          />
          <path
            d="M 156 84 C 166 90,174 104,176 118 C 178 132,174 146,170 158 C 166 168,160 174,154 172 C 150 170,146 164,144 154 C 142 142,142 128,144 116 C 146 104,150 92,156 84 Z"
            fill="url(#sk)"
            stroke="#0d0a06"
            strokeWidth="0.4"
          />

          <path
            d="M 38 168 C 32 176,28 190,28 204 C 28 216,32 226,38 230 C 42 232,46 230,48 224 C 50 218,50 208,50 196 C 50 184,46 174,38 168 Z"
            fill="url(#sk)"
            stroke="#0d0a06"
            strokeWidth="0.4"
          />
          <path
            d="M 162 168 C 168 176,172 190,172 204 C 172 216,168 226,162 230 C 158 232,154 230,152 224 C 150 218,150 208,150 196 C 150 184,154 174,162 168 Z"
            fill="url(#sk)"
            stroke="#0d0a06"
            strokeWidth="0.4"
          />

          <ellipse cx="36" cy="240" rx="9" ry="12" fill="#251e12" stroke="#1a1510" strokeWidth="0.4" />
          <ellipse cx="164" cy="240" rx="9" ry="12" fill="#251e12" stroke="#1a1510" strokeWidth="0.4" />

          <path
            d="M 78 190 C 68 196,62 208,64 222 C 66 234,72 242,80 246 C 88 250,100 252,100 252 C 100 252,112 250,120 246 C 128 242,134 234,136 222 C 138 208,132 196,122 190 Z"
            fill="url(#sk)"
            stroke="#0d0a06"
            strokeWidth="0.4"
          />

          <path
            d="M 68 246 C 60 256,56 272,56 288 C 56 304,60 320,66 334 C 70 344,76 352,82 354 C 88 356,94 352,96 344 C 98 336,98 320,96 304 C 94 288,90 272,84 258 Z"
            fill="url(#sk)"
            stroke="#0d0a06"
            strokeWidth="0.4"
          />
          <path
            d="M 132 246 C 140 256,144 272,144 288 C 144 304,140 320,134 334 C 130 344,124 352,118 354 C 112 356,106 352,104 344 C 102 336,102 320,104 304 C 106 288,110 272,116 258 Z"
            fill="url(#sk)"
            stroke="#0d0a06"
            strokeWidth="0.4"
          />

          <ellipse cx="82" cy="360" rx="14" ry="10" fill="#251e12" stroke="#1a1510" strokeWidth="0.4" />
          <ellipse cx="118" cy="360" rx="14" ry="10" fill="#251e12" stroke="#1a1510" strokeWidth="0.4" />
          <ellipse cx="82" cy="359" rx="8" ry="6.5" fill="#2e2618" stroke="rgba(211,175,55,0.08)" strokeWidth="0.7" />
          <ellipse cx="118" cy="359" rx="8" ry="6.5" fill="#2e2618" stroke="rgba(211,175,55,0.08)" strokeWidth="0.7" />

          <path
            d="M 68 368 C 62 378,60 394,62 410 C 64 422,70 432,76 436 C 82 440,88 438,90 430 C 92 422,90 408,88 394 C 86 380,80 370,68 368 Z"
            fill="url(#sk)"
            stroke="#0d0a06"
            strokeWidth="0.4"
          />
          <path
            d="M 132 368 C 138 378,140 394,138 410 C 136 422,130 432,124 436 C 118 440,112 438,110 430 C 108 422,110 408,112 394 C 114 380,120 370,132 368 Z"
            fill="url(#sk)"
            stroke="#0d0a06"
            strokeWidth="0.4"
          />

          <ellipse cx="80" cy="440" rx="10" ry="7" fill="#251e12" stroke="#1a1510" strokeWidth="0.4" />
          <ellipse cx="120" cy="440" rx="10" ry="7" fill="#251e12" stroke="#1a1510" strokeWidth="0.4" />
          <ellipse cx="78" cy="452" rx="13" ry="7.5" fill="#201a0e" stroke="#1a1510" strokeWidth="0.4" />
          <ellipse cx="122" cy="452" rx="13" ry="7.5" fill="#201a0e" stroke="#1a1510" strokeWidth="0.4" />

          <g className="m" data-key="spalle" data-label="Spalle">
            <path
              d="M 90 54 C 76 58,62 64,54 72 C 64 66,82 60,100 58 C 118 60,136 66,146 72 C 138 64,124 58,110 54 Z"
              fill="rgba(211,175,55,0.07)"
              stroke="rgba(211,175,55,0.22)"
              strokeWidth="1"
            />
            <path
              d="M 44 84 C 34 90,24 102,22 116 C 20 128,24 140,30 150 C 36 142,42 130,46 116 C 50 104,50 90,44 84 Z"
              fill="rgba(211,175,55,0.09)"
              stroke="rgba(211,175,55,0.28)"
              strokeWidth="1.2"
            />
            <path d="M 48 72 C 46 84,44 96,46 110" stroke="rgba(0,0,0,0.45)" strokeWidth="1.4" fill="none" />
            <path d="M 44 110 C 46 122,48 134,48 146" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" fill="none" />
            <path
              d="M 156 84 C 166 90,176 102,178 116 C 180 128,176 140,170 150 C 164 142,158 130,154 116 C 150 104,150 90,156 84 Z"
              fill="rgba(211,175,55,0.09)"
              stroke="rgba(211,175,55,0.28)"
              strokeWidth="1.2"
            />
            <path d="M 152 72 C 154 84,156 96,154 110" stroke="rgba(0,0,0,0.45)" strokeWidth="1.4" fill="none" />
            <path d="M 156 110 C 154 122,152 134,152 146" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" fill="none" />
          </g>

          <g className="m" data-key="torace" data-label="Torace">
            <path
              d="M 68 86 C 60 94,56 106,58 118 C 60 130,68 138,78 140 C 86 142,94 140,97 132 C 99 124,97 112,91 102 C 85 92,76 84,68 86 Z"
              fill="rgba(211,175,55,0.07)"
              stroke="rgba(211,175,55,0.24)"
              strokeWidth="1.1"
            />
            <path
              d="M 132 86 C 140 94,144 106,142 118 C 140 130,132 138,122 140 C 114 142,106 140,103 132 C 101 124,103 112,109 102 C 115 92,124 84,132 86 Z"
              fill="rgba(211,175,55,0.07)"
              stroke="rgba(211,175,55,0.24)"
              strokeWidth="1.1"
            />
            <line x1="100" y1="72" x2="100" y2="140" stroke="rgba(0,0,0,0.55)" strokeWidth="2.5" />
            <line x1="100" y1="72" x2="100" y2="140" stroke="rgba(211,175,55,0.13)" strokeWidth="0.9" />
            <path d="M 68 74 Q 84 78,100 76" stroke="rgba(211,175,55,0.2)" strokeWidth="1" fill="none" />
            <path d="M 132 74 Q 116 78,100 76" stroke="rgba(211,175,55,0.2)" strokeWidth="1" fill="none" />
            <path d="M 68 136 Q 84 144,98 138" stroke="rgba(0,0,0,0.5)" strokeWidth="1.8" fill="none" />
            <path d="M 132 136 Q 116 144,102 138" stroke="rgba(0,0,0,0.5)" strokeWidth="1.8" fill="none" />
            <path d="M 66 124 C 60 128,58 134,60 140" stroke="rgba(211,175,55,0.18)" strokeWidth="0.9" fill="none" />
            <path d="M 66 132 C 60 136,58 142,60 148" stroke="rgba(211,175,55,0.18)" strokeWidth="0.9" fill="none" />
            <path d="M 68 140 C 62 144,60 150,62 156" stroke="rgba(211,175,55,0.18)" strokeWidth="0.9" fill="none" />
            <path d="M 134 124 C 140 128,142 134,140 140" stroke="rgba(211,175,55,0.18)" strokeWidth="0.9" fill="none" />
            <path d="M 134 132 C 140 136,142 142,140 148" stroke="rgba(211,175,55,0.18)" strokeWidth="0.9" fill="none" />
            <path d="M 132 140 C 138 144,140 150,138 156" stroke="rgba(211,175,55,0.18)" strokeWidth="0.9" fill="none" />
          </g>

          <g className="m" data-key="braccio" data-label="Braccio">
            <ellipse cx="42" cy="130" rx="10" ry="20" transform="rotate(10 42 130)" fill="rgba(211,175,55,0.07)" stroke="rgba(211,175,55,0.24)" strokeWidth="1.1" />
            <path d="M 50 112 C 52 126,52 140,50 152" stroke="rgba(0,0,0,0.4)" strokeWidth="1.3" fill="none" />
            <ellipse cx="158" cy="130" rx="10" ry="20" transform="rotate(-10 158 130)" fill="rgba(211,175,55,0.07)" stroke="rgba(211,175,55,0.24)" strokeWidth="1.1" />
            <path d="M 150 112 C 148 126,148 140,150 152" stroke="rgba(0,0,0,0.4)" strokeWidth="1.3" fill="none" />
          </g>

          <g className="m" data-key="vita" data-label="Vita / Addome">
            <line x1="100" y1="140" x2="100" y2="218" stroke="rgba(0,0,0,0.65)" strokeWidth="2.5" />
            <line x1="100" y1="140" x2="100" y2="218" stroke="rgba(211,175,55,0.14)" strokeWidth="0.9" />
            <path
              d="M 76 138 C 72 140,70 148,72 156 C 74 162,80 164,86 162 C 92 160,96 154,94 148 C 92 142,86 138,80 138 Z"
              fill="rgba(211,175,55,0.07)"
              stroke="rgba(211,175,55,0.26)"
              strokeWidth="1"
            />
            <path
              d="M 124 138 C 128 140,130 148,128 156 C 126 162,120 164,114 162 C 108 160,104 154,106 148 C 108 142,114 138,120 138 Z"
              fill="rgba(211,175,55,0.07)"
              stroke="rgba(211,175,55,0.26)"
              strokeWidth="1"
            />
            <path d="M 70 158 Q 84 162,98 158" stroke="rgba(0,0,0,0.5)" strokeWidth="1.4" fill="none" />
            <path d="M 130 158 Q 116 162,102 158" stroke="rgba(0,0,0,0.5)" strokeWidth="1.4" fill="none" />
            <path
              d="M 74 160 C 70 162,68 170,70 178 C 72 184,78 186,84 184 C 90 182,94 176,92 170 C 90 164,84 160,78 160 Z"
              fill="rgba(211,175,55,0.07)"
              stroke="rgba(211,175,55,0.26)"
              strokeWidth="1"
            />
            <path
              d="M 126 160 C 130 162,132 170,130 178 C 128 184,122 186,116 184 C 110 182,106 176,108 170 C 110 164,116 160,122 160 Z"
              fill="rgba(211,175,55,0.07)"
              stroke="rgba(211,175,55,0.26)"
              strokeWidth="1"
            />
            <path d="M 68 180 Q 84 184,98 180" stroke="rgba(0,0,0,0.5)" strokeWidth="1.4" fill="none" />
            <path d="M 132 180 Q 116 184,102 180" stroke="rgba(0,0,0,0.5)" strokeWidth="1.4" fill="none" />
            <path
              d="M 76 182 C 72 184,70 192,72 200 C 74 206,80 208,86 206 C 92 204,94 198,92 192 C 90 186,84 182,78 182 Z"
              fill="rgba(211,175,55,0.07)"
              stroke="rgba(211,175,55,0.26)"
              strokeWidth="1"
            />
            <path
              d="M 124 182 C 128 184,130 192,128 200 C 126 206,120 208,114 206 C 108 204,106 198,108 192 C 110 186,116 182,122 182 Z"
              fill="rgba(211,175,55,0.07)"
              stroke="rgba(211,175,55,0.26)"
              strokeWidth="1"
            />
            <path d="M 70 202 Q 84 206,98 202" stroke="rgba(0,0,0,0.5)" strokeWidth="1.4" fill="none" />
            <path d="M 130 202 Q 116 206,102 202" stroke="rgba(0,0,0,0.5)" strokeWidth="1.4" fill="none" />
            <path
              d="M 66 136 C 62 152,60 172,64 192 C 66 202,70 210,74 216"
              fill="rgba(211,175,55,0.04)"
              stroke="rgba(211,175,55,0.16)"
              strokeWidth="0.8"
            />
            <path
              d="M 134 136 C 138 152,140 172,136 192 C 134 202,130 210,126 216"
              fill="rgba(211,175,55,0.04)"
              stroke="rgba(211,175,55,0.16)"
              strokeWidth="0.8"
            />
          </g>

          <g className="m" data-key="fianchi" data-label="Fianchi">
            <path
              d="M 72 194 C 64 200,60 214,64 228 C 66 236,72 242,78 244 C 74 232,72 220,72 208 Z"
              fill="rgba(211,175,55,0.07)"
              stroke="rgba(211,175,55,0.24)"
              strokeWidth="1"
            />
            <path
              d="M 128 194 C 136 200,140 214,136 228 C 134 236,128 242,122 244 C 126 232,128 220,128 208 Z"
              fill="rgba(211,175,55,0.07)"
              stroke="rgba(211,175,55,0.24)"
              strokeWidth="1"
            />
            <path d="M 72 194 C 78 204,88 212,98 216" stroke="rgba(0,0,0,0.6)" strokeWidth="2.2" fill="none" />
            <path d="M 72 194 C 78 204,88 212,98 216" stroke="rgba(211,175,55,0.2)" strokeWidth="0.9" fill="none" />
            <path d="M 128 194 C 122 204,112 212,102 216" stroke="rgba(0,0,0,0.6)" strokeWidth="2.2" fill="none" />
            <path d="M 128 194 C 122 204,112 212,102 216" stroke="rgba(211,175,55,0.2)" strokeWidth="0.9" fill="none" />
          </g>

          <g className="m" data-key="gamba" data-label="Gamba">
            <ellipse cx="78" cy="294" rx="13" ry="34" transform="rotate(-5 78 294)" fill="rgba(211,175,55,0.07)" stroke="rgba(211,175,55,0.24)" strokeWidth="1.1" />
            <ellipse cx="66" cy="286" rx="9" ry="26" transform="rotate(-12 66 286)" fill="rgba(211,175,55,0.05)" stroke="rgba(211,175,55,0.18)" strokeWidth="0.8" />
            <ellipse cx="88" cy="316" rx="8" ry="14" transform="rotate(10 88 316)" fill="rgba(211,175,55,0.06)" stroke="rgba(211,175,55,0.2)" strokeWidth="0.8" />
            <path d="M 70 262 C 72 280,76 302,78 324" stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" fill="none" />
            <path d="M 84 258 C 84 276,84 300,86 322" stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" fill="none" />
            <ellipse cx="122" cy="294" rx="13" ry="34" transform="rotate(5 122 294)" fill="rgba(211,175,55,0.07)" stroke="rgba(211,175,55,0.24)" strokeWidth="1.1" />
            <ellipse cx="134" cy="286" rx="9" ry="26" transform="rotate(12 134 286)" fill="rgba(211,175,55,0.05)" stroke="rgba(211,175,55,0.18)" strokeWidth="0.8" />
            <ellipse cx="112" cy="316" rx="8" ry="14" transform="rotate(-10 112 316)" fill="rgba(211,175,55,0.06)" stroke="rgba(211,175,55,0.2)" strokeWidth="0.8" />
            <path d="M 130 262 C 128 280,124 302,122 324" stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" fill="none" />
            <path d="M 116 258 C 116 276,116 300,114 322" stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" fill="none" />
            <ellipse cx="74" cy="398" rx="9" ry="24" transform="rotate(-5 74 398)" fill="rgba(211,175,55,0.07)" stroke="rgba(211,175,55,0.24)" strokeWidth="1.1" />
            <ellipse cx="86" cy="394" rx="8" ry="20" transform="rotate(5 86 394)" fill="rgba(211,175,55,0.05)" stroke="rgba(211,175,55,0.18)" strokeWidth="0.8" />
            <path d="M 80 372 C 80 386,80 404,82 418" stroke="rgba(0,0,0,0.38)" strokeWidth="1.2" fill="none" />
            <ellipse cx="126" cy="398" rx="9" ry="24" transform="rotate(5 126 398)" fill="rgba(211,175,55,0.07)" stroke="rgba(211,175,55,0.24)" strokeWidth="1.1" />
            <ellipse cx="114" cy="394" rx="8" ry="20" transform="rotate(-5 114 394)" fill="rgba(211,175,55,0.05)" stroke="rgba(211,175,55,0.18)" strokeWidth="0.8" />
            <path d="M 120 372 C 120 386,120 404,118 418" stroke="rgba(0,0,0,0.38)" strokeWidth="1.2" fill="none" />
          </g>

          <circle
            ref={dotRef}
            id="dot"
            cx="-100"
            cy="-100"
            r="5"
            fill="#D3AF37"
            opacity="0.9"
            filter="url(#gl)"
          >
            <animate attributeName="r" values="4;7;4" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.8s" repeatCount="indefinite" />
          </circle>
        </svg>

        <div ref={badgeRef} className="badge" id="badge">
          –
        </div>
      </div>

      <div className="list">
        <div className="list-title">Seleziona area</div>
        <button className="btn" data-key="spalle" data-label="Spalle">
          Spalle
        </button>
        <button className="btn" data-key="torace" data-label="Torace">
          Torace
        </button>
        <button className="btn" data-key="braccio" data-label="Braccio">
          Braccio
        </button>
        <button className="btn" data-key="vita" data-label="Vita / Addome">
          Vita / Addome
        </button>
        <button className="btn" data-key="fianchi" data-label="Fianchi">
          Fianchi
        </button>
        <button className="btn" data-key="gamba" data-label="Gamba">
          Gamba
        </button>
      </div>
    </div>
  )
}
