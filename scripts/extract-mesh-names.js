const fs = require('fs');
const path = require('path');

// Script per estrarre i nomi delle mesh da un file GLB
// Uso: node scripts/extract-mesh-names.js <path-to-model.glb>

const modelPath = process.argv[2];

if (!modelPath) {
  console.error('❌ Errore: Specifica il percorso del file GLB');
  console.log('Uso: node scripts/extract-mesh-names.js <path-to-model.glb>');
  console.log('Esempio: node scripts/extract-mesh-names.js public/models/anatomy.glb');
  process.exit(1);
}

if (!fs.existsSync(modelPath)) {
  console.error(`❌ Errore: Il file "${modelPath}" non esiste`);
  process.exit(1);
}

console.log(`📦 Analisi del modello: ${modelPath}\n`);

// Leggi il file GLB (è un formato binario, ma contiene JSON)
const buffer = fs.readFileSync(modelPath);

// I file GLB hanno questa struttura:
// - Header (12 bytes)
// - JSON Chunk (variabile)
// - Binary Chunk (variabile)

// Leggi l'header
const magic = buffer.readUInt32LE(0);
const version = buffer.readUInt32LE(4);
const length = buffer.readUInt32LE(8);

if (magic !== 0x46546C67) { // "glTF" in little-endian
  console.error('❌ Errore: Il file non è un GLB valido');
  process.exit(1);
}

// Leggi il JSON chunk
const jsonChunkLength = buffer.readUInt32LE(12);
const jsonChunkType = buffer.readUInt32LE(16);

if (jsonChunkType !== 0x4E4F534A) { // "JSON" in little-endian
  console.error('❌ Errore: Chunk JSON non trovato');
  process.exit(1);
}

const jsonData = buffer.slice(20, 20 + jsonChunkLength);
const gltf = JSON.parse(jsonData.toString('utf8'));

console.log('📋 Nomi delle mesh trovate:\n');

// Estrai i nomi dei nodi e delle mesh
const meshNames = new Set();

if (gltf.nodes) {
  gltf.nodes.forEach((node, index) => {
    if (node.mesh !== undefined && node.name) {
      meshNames.add(node.name);
      console.log(`  ${index}: ${node.name}`);
    }
  });
}

if (gltf.meshes) {
  gltf.meshes.forEach((mesh, index) => {
    if (mesh.name) {
      meshNames.add(mesh.name);
      console.log(`  Mesh ${index}: ${mesh.name}`);
    }
  });
}

// Se non ci sono nomi, prova a cercare nei nodi senza nome ma con mesh
if (meshNames.size === 0) {
  console.log('\n⚠️  Nessun nome trovato. I nodi potrebbero non avere nomi assegnati.');
  console.log('   Controlla in Blender che ogni mesh abbia un nome nell\'Outliner.\n');
  
  if (gltf.nodes) {
    console.log('📊 Nodi trovati (senza nomi):');
    gltf.nodes.forEach((node, index) => {
      if (node.mesh !== undefined) {
        console.log(`  Nodo ${index}: mesh index ${node.mesh}`);
      }
    });
  }
} else {
  console.log(`\n✅ Trovate ${meshNames.size} mesh con nomi`);
  console.log('\n📝 Lista completa:');
  Array.from(meshNames).sort().forEach((name, i) => {
    console.log(`  ${i + 1}. ${name}`);
  });
}

console.log('\n💡 Suggerimento:');
console.log('   Copia questa lista e incollala nella chat per aggiornare la mappatura!');
