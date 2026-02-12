'use client'

import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html, Environment } from '@react-three/drei'
import React, { useMemo, useState, useEffect } from 'react'

type MeasurementKey = 'peso' | 'altezza' | 'massaGrassa' | 'braccio' | 'spalle' | 'torace' | 'vita' | 'gamba' | 'fianchi'

type Props = {
  modelUrl: string
  onSelect: (key: MeasurementKey) => void
  selected?: MeasurementKey | null
}

type Hit = {
  key: MeasurementKey
  label: string
}

function mapMeshNameToMeasurement(meshName: string): Hit | null {
  const n = meshName.toLowerCase()

  // Spalle
  if (n.includes('deltoid') || n.includes('shoulder')) return { key: 'spalle', label: 'Spalle' }

  // Torace
  if (n.includes('pector') || n.includes('chest')) return { key: 'torace', label: 'Torace' }

  // Braccio
  if (n.includes('biceps') || n.includes('triceps') || n.includes('arm')) return { key: 'braccio', label: 'Braccio' }

  // Addome/Vita
  if (n.includes('abs') || n.includes('abdomen') || n.includes('waist')) return { key: 'vita', label: 'Vita' }

  // Fianchi / glutei
  if (n.includes('glute') || n.includes('hip')) return { key: 'fianchi', label: 'Fianchi' }

  // Gamba
  if (n.includes('quad') || n.includes('hamstring') || n.includes('thigh') || n.includes('leg') || n.includes('calf'))
    return { key: 'gamba', label: 'Gamba' }

  return null
}

function AnatomyModel({
  url,
  selected,
  onSelect,
  onError,
}: {
  url: string
  selected?: MeasurementKey | null
  onSelect: (key: MeasurementKey) => void
  onError?: () => void
}) {
  // Gestione errore con try-catch non possibile con hooks
  // L'errore verrà gestito dall'ErrorBoundary nel componente padre
  const gltf = useGLTF(url, true) // true = use error boundary
  
  if (!gltf || !gltf.scene) {
    if (onError) onError()
    return null
  }

  const [hovered, setHovered] = useState<{
    object: THREE.Object3D
    hit: Hit
    point: THREE.Vector3
  } | null>(null)

  // Materiali base + highlight (senza cambiare il tuo tema: qui uso un tono "gold")
  const baseMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#2f2f2f'),
        roughness: 0.65,
        metalness: 0.2,
      }),
    []
  )

  const highlightMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#D3AF37'),
        roughness: 0.35,
        metalness: 0.6,
        emissive: new THREE.Color('#D3AF37'),
        emissiveIntensity: 0.25,
      }),
    []
  )

  // Cloniamo la scena per non "sporcare" l'originale in cache di useGLTF
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene])

  // Applichiamo materiali e logica di highlight
  useMemo(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true

        const hit = mapMeshNameToMeasurement(mesh.name)
        // Materiale di default
        mesh.material = baseMat

        // Materiale highlight se selezionato
        if (hit && selected && hit.key === selected) {
          mesh.material = highlightMat
        }
      }
    })
  }, [scene, baseMat, highlightMat, selected])

  return (
    <group
      onPointerMove={(e) => {
        e.stopPropagation()
        const obj = e.object
        const hit = mapMeshNameToMeasurement(obj.name)
        if (!hit) {
          setHovered(null)
          document.body.style.cursor = 'default'
          return
        }
        document.body.style.cursor = 'pointer'
        setHovered({ object: obj, hit, point: e.point.clone() })
      }}
      onPointerOut={() => {
        setHovered(null)
        document.body.style.cursor = 'default'
      }}
      onClick={(e) => {
        e.stopPropagation()
        const hit = mapMeshNameToMeasurement(e.object.name)
        if (!hit) return
        onSelect(hit.key)
      }}
    >
      <primitive object={scene} />

      {hovered && (
        <Html position={hovered.point} center distanceFactor={10}>
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 10,
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid rgba(211,175,55,0.6)',
              color: 'white',
              fontSize: 12,
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(6px)',
            }}
          >
            {hovered.hit.label} • clicca per grafico
          </div>
        </Html>
      )}
    </group>
  )
}

export default function AnatomyPicker3D({ modelUrl, onSelect, selected }: Props) {
  const [modelError, setModelError] = useState(false)
  const [modelExists, setModelExists] = useState<boolean | null>(null)

  // Verifica se il file esiste prima di provare a caricarlo
  useEffect(() => {
    fetch(modelUrl, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          setModelExists(true)
        } else {
          setModelExists(false)
          setModelError(true)
        }
      })
      .catch(() => {
        setModelExists(false)
        setModelError(true)
      })
  }, [modelUrl])

  // Mostra fallback con silhouette SVG se il modello non esiste o c'è un errore
  if (modelError || modelExists === false) {
    return (
      <div style={{ height: 520, width: '100%' }} className="glass-card rounded-lg overflow-hidden flex items-center justify-center p-4">
        <div className="body-silhouette" style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <svg viewBox="0 0 300 500" style={{ width: '100%', height: 'auto' }}>
            <defs>
              <filter id="glow-fallback">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Testa */}
            <ellipse cx="150" cy="40" rx="25" ry="30" fill="#2a2a2a" stroke="#444" strokeWidth="1" />

            {/* Spalle */}
            <g
              className={`muscle-group ${selected === 'spalle' ? 'highlighted' : ''}`}
              onClick={() => onSelect('spalle')}
              style={{ cursor: 'pointer' }}
            >
              <ellipse
                cx="115"
                cy="105"
                rx="22"
                ry="28"
                fill={selected === 'spalle' ? '#D3AF37' : '#3a3a3a'}
                stroke="#D3AF37"
                strokeWidth="2"
                transform="rotate(-15 115 105)"
              />
              <ellipse
                cx="185"
                cy="105"
                rx="22"
                ry="28"
                fill={selected === 'spalle' ? '#D3AF37' : '#3a3a3a'}
                stroke="#D3AF37"
                strokeWidth="2"
                transform="rotate(15 185 105)"
              />
            </g>

            {/* Torace */}
            <g
              className={`muscle-group ${selected === 'torace' ? 'highlighted' : ''}`}
              onClick={() => onSelect('torace')}
              style={{ cursor: 'pointer' }}
            >
              <path
                d="M 130 90 Q 125 110, 130 135 L 145 135 L 150 100 Z"
                fill={selected === 'torace' ? '#D3AF37' : '#3a3a3a'}
                stroke="#D3AF37"
                strokeWidth="2"
              />
              <path
                d="M 170 90 Q 175 110, 170 135 L 155 135 L 150 100 Z"
                fill={selected === 'torace' ? '#D3AF37' : '#3a3a3a'}
                stroke="#D3AF37"
                strokeWidth="2"
              />
              <line x1="150" y1="100" x2="150" y2="135" stroke="#2a2a2a" strokeWidth="2" />
            </g>

            {/* Braccio */}
            <g
              className={`muscle-group ${selected === 'braccio' ? 'highlighted' : ''}`}
              onClick={() => onSelect('braccio')}
              style={{ cursor: 'pointer' }}
            >
              <ellipse
                cx="95"
                cy="140"
                rx="13"
                ry="35"
                fill={selected === 'braccio' ? '#D3AF37' : '#3a3a3a'}
                stroke="#D3AF37"
                strokeWidth="2"
                transform="rotate(20 95 140)"
              />
              <ellipse
                cx="205"
                cy="140"
                rx="13"
                ry="35"
                fill={selected === 'braccio' ? '#D3AF37' : '#3a3a3a'}
                stroke="#D3AF37"
                strokeWidth="2"
                transform="rotate(-20 205 140)"
              />
              <path
                d="M 85 175 Q 75 205, 70 240"
                stroke="#D3AF37"
                strokeWidth="18"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 215 175 Q 225 205, 230 240"
                stroke="#D3AF37"
                strokeWidth="18"
                fill="none"
                strokeLinecap="round"
              />
            </g>

            {/* Addominali/Vita */}
            <g
              className={`muscle-group ${selected === 'vita' ? 'highlighted' : ''}`}
              onClick={() => onSelect('vita')}
              style={{ cursor: 'pointer' }}
            >
              <rect 
                x="135" 
                y="135" 
                width="30" 
                height="70" 
                rx="5" 
                fill={selected === 'vita' ? '#D3AF37' : '#3a3a3a'} 
                stroke="#D3AF37" 
                strokeWidth="2" 
              />
              <line x1="150" y1="135" x2="150" y2="205" stroke="#2a2a2a" strokeWidth="2" />
              <line x1="135" y1="155" x2="165" y2="155" stroke="#2a2a2a" strokeWidth="1.5" />
              <line x1="135" y1="170" x2="165" y2="170" stroke="#2a2a2a" strokeWidth="1.5" />
              <line x1="135" y1="185" x2="165" y2="185" stroke="#2a2a2a" strokeWidth="1.5" />
            </g>

            {/* Fianchi */}
            <g
              className={`muscle-group ${selected === 'fianchi' ? 'highlighted' : ''}`}
              onClick={() => onSelect('fianchi')}
              style={{ cursor: 'pointer' }}
            >
              <ellipse 
                cx="150" 
                cy="220" 
                rx="35" 
                ry="22" 
                fill={selected === 'fianchi' ? '#D3AF37' : '#3a3a3a'} 
                stroke="#D3AF37" 
                strokeWidth="2" 
              />
            </g>

            {/* Gamba */}
            <g
              className={`muscle-group ${selected === 'gamba' ? 'highlighted' : ''}`}
              onClick={() => onSelect('gamba')}
              style={{ cursor: 'pointer' }}
            >
              <ellipse 
                cx="138" 
                cy="290" 
                rx="20" 
                ry="50" 
                fill={selected === 'gamba' ? '#D3AF37' : '#3a3a3a'} 
                stroke="#D3AF37" 
                strokeWidth="2" 
              />
              <ellipse 
                cx="162" 
                cy="290" 
                rx="20" 
                ry="50" 
                fill={selected === 'gamba' ? '#D3AF37' : '#3a3a3a'} 
                stroke="#D3AF37" 
                strokeWidth="2" 
              />
              <ellipse 
                cx="138" 
                cy="390" 
                rx="15" 
                ry="35" 
                fill={selected === 'gamba' ? '#D3AF37' : '#3a3a3a'} 
                stroke="#D3AF37" 
                strokeWidth="2" 
              />
              <ellipse 
                cx="162" 
                cy="390" 
                rx="15" 
                ry="35" 
                fill={selected === 'gamba' ? '#D3AF37' : '#3a3a3a'} 
                stroke="#D3AF37" 
                strokeWidth="2" 
              />
            </g>
          </svg>
        </div>
      </div>
    )
  }

  // Mostra loading mentre verifica l'esistenza del file
  if (modelExists === null) {
    return (
      <div style={{ height: 520, width: '100%' }} className="glass-card rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center p-8">
          <div className="spinner-gold w-12 h-12 mx-auto mb-4"></div>
          <p className="text-white">Caricamento modello 3D…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: 520, width: '100%' }} className="glass-card rounded-lg overflow-hidden relative">
      <Canvas
        shadows
        camera={{ position: [0, 1.45, 3.1], fov: 40 }}
        gl={{ antialias: true }}
      >
        {/* luci */}
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 5, 3]} intensity={1.0} castShadow />
        <directionalLight position={[-3, 2, -3]} intensity={0.35} />

        {/* Ambiente "wow" */}
        <Environment preset="city" />

        {/* Modello - Renderizza solo se il file esiste */}
        {modelExists === true && (
          <React.Suspense
            fallback={
              <Html center>
                <div style={{ color: 'white' }}>Caricamento modello 3D…</div>
              </Html>
            }
          >
            {/* scala/posizione: da aggiustare in base al modello */}
            <group position={[0, -1.2, 0]} scale={1.05}>
              <AnatomyModel 
                url={modelUrl} 
                selected={selected ?? null} 
                onSelect={onSelect}
                onError={() => setModelError(true)}
              />
            </group>
          </React.Suspense>
        )}

        {/* Controlli */}
        <OrbitControls
          enablePan={false}
          minDistance={2.2}
          maxDistance={4.5}
          minPolarAngle={0.6}
          maxPolarAngle={2.35}
          rotateSpeed={0.75}
        />
      </Canvas>
    </div>
  )
}
