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

    const votante = await prisma.votacion.findFirst({
      where: {
        cedula,
        isActive: true
      },
      include: {
        confirmacion: true
      }
    });

    if (!votante) {
      return res.status(404).json({
        ok: false,
        message: "No se encontró información para esta cédula"
      });
    }

    return res.json({
      ok: true,
      cedula: votante.cedula,
      nombreCompleto: `${votante.nombre1} ${votante.nombre2 || ""} ${votante.apellido1} ${votante.apellido2 || ""}`,
      puestoVotacion: votante.puestoVotacion,
      mesa: votante.mesa,
      confirmado: !!votante.confirmacion
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
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