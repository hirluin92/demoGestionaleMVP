'use client'

export function ParallaxBackground() {
  return (
    <div className="parallax-container" id="parallax-container">
      <div 
        className="parallax-layer parallax-layer-1" 
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          opacity: 1,
          willChange: 'transform'
        } as React.CSSProperties}
      />
      <div className="parallax-layer parallax-layer-2" />
      <div className="parallax-layer parallax-layer-3" />
    </div>
  )
}
