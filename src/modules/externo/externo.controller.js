import prisma from "../../prisma.js"

// ===============================
// 🔎 CONSULTAR POR CÉDULA
// ===============================
export const getVotacionExterno = async (req, res) => {
  const { cedula } = req.params;

  try {
    if (!cedula) {
      return res.status(400).json({
        ok: false,
        message: "Debe enviar la cédula"
      });
    }

    const votaciones = await prisma.votacion.findMany({
      where: {
        cedula,
        isActive: true
      },
      include: {
        leader: true,
        digitador: true,
        recommendedBy: true,
        confirmacion: {
          include: {
            confirmadoPor: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    if (!votaciones.length) {
      return res.status(404).json({
        ok: false,
        message: "No se encontró información para esta cédula"
      });
    }

    // 🔥 Obtener nombres de puestos
    const puestoIds = [...new Set(
      votaciones.map(v => v.puestoVotacion).filter(Boolean)
    )];

    const puestosDb = await prisma.puestoVotacion.findMany({
      where: { id: { in: puestoIds } },
      select: { id: true, puesto: true }
    });

    const puestosMap = {};
    puestosDb.forEach(p => {
      puestosMap[p.id] = p.puesto;
    });

    const result = votaciones.map((item, index) => ({
      idnumber: index + 1,

      id: item.id,
      cedula: item.cedula,
      nombre1: item.nombre1,
      nombre2: item.nombre2,
      apellido1: item.apellido1,
      apellido2: item.apellido2,
      telefono: item.telefono,
      direccion: item.direccion,
      barrio: item.barrio,

      puestoVotacion: item.puestoVotacion,
      puestoVotacionNombre: puestosMap[item.puestoVotacion] || null,
      mesa: item.mesa,

      leader: item.leader,
      digitador: item.digitador,
      recommendedBy: item.recommendedBy,

      isActive: item.isActive,
      isDuplicate: item.isDuplicate,
      duplicatedFrom: item.duplicatedFrom,

      confirmado: !!item.confirmacion,
      codigoVotacion: item.confirmacion?.codigoVotacion || null,
      imagenConfirmacion: item.confirmacion
        ? `/uploads/votos/${item.confirmacion.imagen}`
        : null,
      fechaConfirmacion: item.confirmacion?.createdAt || null,
      confirmadoPor: item.confirmacion?.confirmadoPor
        ? {
            id: item.confirmacion.confirmadoPor.id,
            nombre: item.confirmacion.confirmadoPor.username
          }
        : null,

      createdAt: item.createdAt
    }));

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};


// ===============================
// ✅ CONFIRMAR VOTO EXTERNO
// ===============================
export const confirmarVotoExterno = async (req, res) => {
  const { cedula, codigoVotacion } = req.body;

  try {
    if (!cedula || !codigoVotacion) {
      return res.status(400).json({
        ok: false,
        message: "Debe enviar cédula y código"
      });
    }

    // 🔎 Buscar votante
    const votacion = await prisma.votacion.findFirst({
      where: {
        cedula,
        isActive: true
      }
    });

    if (!votacion) {
      return res.status(404).json({
        ok: false,
        message: "Votante no encontrado"
      });
    }

    // 🔒 Verificar si ya fue confirmado
    const yaConfirmado = await prisma.votacionConfirmacion.findFirst({
      where: {
        votacionId: votacion.id
      }
    });

    if (yaConfirmado) {
      return res.status(400).json({
        ok: false,
        message: "Este voto ya fue confirmado"
      });
    }

    // 🔐 Verificar código no repetido
    const codigoYaUsado = await prisma.votacionConfirmacion.findFirst({
      where: { codigoVotacion }
    });

    if (codigoYaUsado) {
      return res.status(400).json({
        ok: false,
        message: "Este código ya fue utilizado"
      });
    }

    // ✅ Crear confirmación
    await prisma.votacionConfirmacion.create({
      data: {
        votacionId: votacion.id,
        codigoVotacion
      }
    });

    return res.json({
      ok: true,
      message: "Voto confirmado correctamente"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};