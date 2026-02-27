import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Inizio seed esercizi...')

  const categories: {
    name: string
    sortOrder: number
    exercises: { name: string; equipment: string | null }[]
  }[] = [
    {
      name: 'Petto',
      sortOrder: 1,
      exercises: [
        { name: 'Panca Piana Bilanciere', equipment: 'Bilanciere' },
        { name: 'Panca Piana Manubri', equipment: 'Manubri' },
        { name: 'Panca Inclinata Bilanciere', equipment: 'Bilanciere' },
        { name: 'Panca Inclinata Manubri', equipment: 'Manubri' },
        { name: 'Panca Declinata', equipment: 'Bilanciere' },
        { name: 'Croci ai Cavi', equipment: 'Cavi' },
        { name: 'Croci con Manubri', equipment: 'Manubri' },
        { name: 'Chest Press Macchina', equipment: 'Macchina' },
        { name: 'Piegamenti (Push-ups)', equipment: 'Corpo Libero' },
        { name: 'Dips per Petto', equipment: 'Corpo Libero' },
        { name: 'Pullover con Manubrio', equipment: 'Manubri' },
        { name: 'Cable Crossover', equipment: 'Cavi' },
      ],
    },
    {
      name: 'Dorso',
      sortOrder: 2,
      exercises: [
        { name: 'Trazioni alla Sbarra', equipment: 'Corpo Libero' },
        { name: 'Lat Machine Avanti', equipment: 'Macchina' },
        { name: 'Lat Machine Dietro', equipment: 'Macchina' },
        { name: 'Rematore con Bilanciere', equipment: 'Bilanciere' },
        { name: 'Rematore con Manubrio', equipment: 'Manubri' },
        { name: 'Pulley Basso', equipment: 'Macchina' },
        { name: 'T-Bar Row', equipment: 'Bilanciere' },
        { name: 'Pulldown con Corda', equipment: 'Cavi' },
        { name: 'Rematore al Cavo Seduto', equipment: 'Cavi' },
        { name: 'Hyperextension', equipment: 'Corpo Libero' },
        { name: 'Stacco da Terra', equipment: 'Bilanciere' },
        { name: 'Seal Row', equipment: 'Bilanciere' },
      ],
    },
    {
      name: 'Spalle',
      sortOrder: 3,
      exercises: [
        { name: 'Lento Avanti Bilanciere', equipment: 'Bilanciere' },
        { name: 'Lento Avanti Manubri', equipment: 'Manubri' },
        { name: 'Arnold Press', equipment: 'Manubri' },
        { name: 'Alzate Laterali Manubri', equipment: 'Manubri' },
        { name: 'Alzate Laterali ai Cavi', equipment: 'Cavi' },
        { name: 'Alzate Frontali', equipment: 'Manubri' },
        { name: 'Alzate a 90° (Rear Delt)', equipment: 'Manubri' },
        { name: 'Face Pull', equipment: 'Cavi' },
        { name: 'Shoulder Press Macchina', equipment: 'Macchina' },
        { name: 'Tirate al Mento', equipment: 'Bilanciere' },
        { name: 'Shrug con Bilanciere', equipment: 'Bilanciere' },
        { name: 'Shrug con Manubri', equipment: 'Manubri' },
      ],
    },
    {
      name: 'Bicipiti',
      sortOrder: 4,
      exercises: [
        { name: 'Curl con Bilanciere', equipment: 'Bilanciere' },
        { name: 'Curl con Manubri', equipment: 'Manubri' },
        { name: 'Curl Alternato', equipment: 'Manubri' },
        { name: 'Curl a Martello', equipment: 'Manubri' },
        { name: 'Curl su Panca Inclinata', equipment: 'Manubri' },
        { name: 'Curl al Cavo Basso', equipment: 'Cavi' },
        { name: 'Curl alla Panca Scott', equipment: 'Bilanciere' },
        { name: 'Curl Concentrato', equipment: 'Manubri' },
        { name: 'Curl con Corda al Cavo', equipment: 'Cavi' },
        { name: 'Spider Curl', equipment: 'Bilanciere' },
      ],
    },
    {
      name: 'Tricipiti',
      sortOrder: 5,
      exercises: [
        { name: 'French Press con Bilanciere', equipment: 'Bilanciere' },
        { name: 'French Press con Manubri', equipment: 'Manubri' },
        { name: 'Pushdown al Cavo con Barra', equipment: 'Cavi' },
        { name: 'Pushdown al Cavo con Corda', equipment: 'Cavi' },
        { name: 'Dips alle Parallele', equipment: 'Corpo Libero' },
        { name: 'Estensioni Sopra la Testa con Manubrio', equipment: 'Manubri' },
        { name: 'Estensioni Sopra la Testa al Cavo', equipment: 'Cavi' },
        { name: 'Kickback con Manubrio', equipment: 'Manubri' },
        { name: 'Panca Presa Stretta', equipment: 'Bilanciere' },
        { name: 'Diamond Push-ups', equipment: 'Corpo Libero' },
      ],
    },
    {
      name: 'Gambe — Quadricipiti',
      sortOrder: 6,
      exercises: [
        { name: 'Squat con Bilanciere', equipment: 'Bilanciere' },
        { name: 'Front Squat', equipment: 'Bilanciere' },
        { name: 'Hack Squat', equipment: 'Macchina' },
        { name: 'Leg Press', equipment: 'Macchina' },
        { name: 'Leg Extension', equipment: 'Macchina' },
        { name: 'Affondi con Manubri', equipment: 'Manubri' },
        { name: 'Affondi Camminati', equipment: 'Manubri' },
        { name: 'Bulgarian Split Squat', equipment: 'Manubri' },
        { name: 'Goblet Squat', equipment: 'Manubri' },
        { name: 'Sissy Squat', equipment: 'Macchina' },
        { name: 'Step Up con Manubri', equipment: 'Manubri' },
        { name: 'Pressa Orizzontale', equipment: 'Macchina' },
      ],
    },
    {
      name: 'Gambe — Femorali',
      sortOrder: 7,
      exercises: [
        { name: 'Stacco Rumeno con Bilanciere', equipment: 'Bilanciere' },
        { name: 'Stacco Rumeno con Manubri', equipment: 'Manubri' },
        { name: 'Leg Curl Sdraiato', equipment: 'Macchina' },
        { name: 'Leg Curl Seduto', equipment: 'Macchina' },
        { name: 'Leg Curl in Piedi', equipment: 'Macchina' },
        { name: 'Good Morning', equipment: 'Bilanciere' },
        { name: 'Nordic Hamstring Curl', equipment: 'Corpo Libero' },
        { name: 'Stacco a Gamba Singola', equipment: 'Bilanciere' },
        { name: 'Hip Hinge al Cavo', equipment: 'Cavi' },
        { name: 'Glute Ham Raise', equipment: 'Macchina' },
      ],
    },
    {
      name: 'Glutei',
      sortOrder: 8,
      exercises: [
        { name: 'Hip Thrust con Bilanciere', equipment: 'Bilanciere' },
        { name: 'Hip Thrust a Corpo Libero', equipment: 'Corpo Libero' },
        { name: 'Ponte Glutei', equipment: 'Corpo Libero' },
        { name: 'Ponte Glutei con Bilanciere', equipment: 'Bilanciere' },
        { name: 'Abduzioni all\'Elastico', equipment: 'Elastico' },
        { name: 'Abduzioni alla Macchina', equipment: 'Macchina' },
        { name: 'Kickback al Cavo', equipment: 'Cavi' },
        { name: 'Affondi Laterali', equipment: 'Manubri' },
        { name: 'Sumo Squat', equipment: 'Bilanciere' },
        { name: 'Frog Pump', equipment: 'Corpo Libero' },
      ],
    },
    {
      name: 'Addome',
      sortOrder: 9,
      exercises: [
        { name: 'Crunch', equipment: 'Corpo Libero' },
        { name: 'Crunch Inverso', equipment: 'Corpo Libero' },
        { name: 'Sit-up', equipment: 'Corpo Libero' },
        { name: 'Plank', equipment: 'Corpo Libero' },
        { name: 'Plank Laterale', equipment: 'Corpo Libero' },
        { name: 'Russian Twist', equipment: 'Manubri' },
        { name: 'Leg Raise Appeso', equipment: 'Corpo Libero' },
        { name: 'Leg Raise a Terra', equipment: 'Corpo Libero' },
        { name: 'Ab Wheel Rollout', equipment: 'Macchina' },
        { name: 'Cable Crunch', equipment: 'Cavi' },
        { name: 'Mountain Climber', equipment: 'Corpo Libero' },
        { name: 'Bicycle Crunch', equipment: 'Corpo Libero' },
        { name: 'Hollow Hold', equipment: 'Corpo Libero' },
        { name: 'V-up', equipment: 'Corpo Libero' },
      ],
    },
    {
      name: 'Cardio / Funzionale',
      sortOrder: 10,
      exercises: [
        { name: 'Corsa (Treadmill)', equipment: 'Cardio' },
        { name: 'Cyclette', equipment: 'Cardio' },
        { name: 'Ellittica', equipment: 'Cardio' },
        { name: 'Vogatore (Rowing Machine)', equipment: 'Cardio' },
        { name: 'Corda per Saltare', equipment: 'Cardio' },
        { name: 'Burpees', equipment: 'Corpo Libero' },
        { name: 'Box Jump', equipment: 'Corpo Libero' },
        { name: 'Kettlebell Swing', equipment: 'Kettlebell' },
        { name: 'Battle Ropes', equipment: 'Cardio' },
        { name: 'Sled Push', equipment: 'Macchina' },
        { name: 'Assault Bike', equipment: 'Cardio' },
        { name: 'Farmer\'s Walk', equipment: 'Manubri' },
      ],
    },
  ]

  for (const category of categories) {
    const categoryRecord = await prisma.exerciseCategory.upsert({
      where: { name: category.name },
      update: {
        sortOrder: category.sortOrder,
      },
      create: {
        name: category.name,
        sortOrder: category.sortOrder,
      },
    })

    console.log(`Categoria: ${categoryRecord.name}`)

    for (const ex of category.exercises) {
      const exercise = await prisma.exercise.upsert({
        where: {
          name_categoryId: {
            name: ex.name,
            categoryId: categoryRecord.id,
          },
        },
        update: {
          equipment: ex.equipment,
          isDefault: true,
        },
        create: {
          name: ex.name,
          equipment: ex.equipment,
          isDefault: true,
          category: {
            connect: { id: categoryRecord.id },
          },
        },
      })

      console.log(`  - ${exercise.name} (${exercise.equipment ?? 'N/A'})`)
    }
  }

  console.log('Seed esercizi completato.')
}

main()
  .catch((e) => {
    console.error('Errore durante il seed degli esercizi:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

