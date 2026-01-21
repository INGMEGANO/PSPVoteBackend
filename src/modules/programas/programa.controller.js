import prisma from "../../prisma.js"

export const getProgramas = async (req, res) => {
  try {
    const programas = await prisma.programa.findMany({
      select: {
        id: true,
        nombre: true,
        tieneSedes: true
      },
      orderBy: { nombre: "asc" }
    })

    res.json(programas)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error obteniendo programas" })
  }
}

export const getSedesByPrograma = async (req, res) => {
  const { programaId } = req.params

  try {
    const sedes = await prisma.sedePrograma.findMany({
      where: { programaId },
      select: {
        id: true,
        nombre: true
      },
      orderBy: { nombre: "asc" }
    })

    res.json(sedes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error obteniendo sedes" })
  }
}


export const obtenerOpcionesPrograma = async (req, res) => {
  try {
    const programas = await prisma.programa.findMany({
      include: {
        SedePrograma: true
      }
    })

    const tipos = await prisma.tipoVinculacion.findMany()

    const resultado = []

    for (const programa of programas) {

      // 🔹 Programas SIN sedes
      if (!programa.tieneSedes) {
        for (const tipo of tipos) {
          resultado.push({
            label: `${programa.nombre} - ${tipo.nombre}`,
            programaId: programa.id,
            sedeId: null,
            tipoVinculacionId: tipo.id,
            esPago: tipo.esPago
          })
        }
      }

      // 🔹 Programas CON sedes
      if (programa.tieneSedes) {
        for (const sede of programa.SedePrograma) {
          for (const tipo of tipos) {
            resultado.push({
              label: `${programa.nombre} - ${sede.nombre} - ${tipo.nombre}`,
              programaId: programa.id,
              sedeId: sede.id,
              tipoVinculacionId: tipo.id,
              esPago: tipo.esPago
            })
          }
        }
      }
    }

    res.json(resultado)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error al obtener opciones" })
  }
}
