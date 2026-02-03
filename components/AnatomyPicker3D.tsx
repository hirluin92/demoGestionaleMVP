'use client'

import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html, Environment } from '@react-three/drei'
import React, { useMemo, useState } from 'react'

type MeasurementKey = 'peso' | 'braccio' | 'spalle' | 'torace' | 'vita' | 'gamba' | 'fianchi'

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
}: {
  url: string
  selected?: MeasurementKey | null
  onSelect: (key: MeasurementKey) => void
}) {
  const gltf = useGLTF(url)

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
  return (
    <div style={{ height: 520, width: '100%' }} className="glass-card rounded-lg overflow-hidden">
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

        {/* Modello */}
        <React.Suspense
          fallback={
            <Html center>
              <div style={{ color: 'white' }}>Caricamento modello 3D…</div>
            </Html>
          }
        >
          {/* scala/posizione: da aggiustare in base al modello */}
          <group position={[0, -1.2, 0]} scale={1.05}>
            <AnatomyModel url={modelUrl} selected={selected ?? null} onSelect={onSelect} />
          </group>
        </React.Suspense>

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

useGLTF.preload('/models/anatomy.glb')
