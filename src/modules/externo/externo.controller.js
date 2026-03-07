import fs from "fs";
import path from "path";
import prisma from "../../prisma.js"

import { generarPdfConfirmacionesExternas } from "./pdf-confirmaciones-externas.js";


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

    // 🔒 Validar si existe confirmación externa
    const confirmacionExterna = await prisma.votacionConfirmacionExterna.findFirst({
      where: { cedula }
    });

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

      // 🔥 AJUSTE IMPORTANTE AQUÍ
      confirmado: !!item.confirmacion || !!confirmacionExterna,

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
/*
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
*/


export const confirmarVotoCedCodLidExterno = async (req, res) => {
  const { cedula, codigoLider } = req.body || {};

  try {
    // 1️⃣ Validar campos
    if (!cedula || !codigoLider) {
      return res.status(400).json({
        ok: false,
        message: "Cédula y código de líder son obligatorios"
      });
    }

    // 2️⃣ Validar líder activo
    const leader = await prisma.leaderExt.findFirst({
      where: {
        codigoReferencia: codigoLider,
        isActive: true
      }
    });

    if (!leader) {
      return res.status(400).json({
        ok: false,
        message: "Código de líder inválido"
      });
    }

    // 3️⃣ Validar que exista la cédula activa
    const votacionExiste = await prisma.votacion.findFirst({
      where: {
        cedula,
        isActive: true
      }
    });

    if (!votacionExiste) {
      return res.status(400).json({
        ok: false,
        message: "Cédula no válida"
      });
    }

    // 4️⃣ 🔒 VALIDAR QUE NO ESTÉ YA CONFIRMADA
    const yaConfirmado = await prisma.votacionConfirmacionExterna.findFirst({
      where: {
        cedula: cedula
      }
    });

    /*if (yaConfirmado) {
      return res.status(400).json({
        ok: false,
        message: "Esta cédula ya realizó la confirmación externa"
      });
    }*/

    // ✅ Todo correcto
    return res.json({
      ok: true,
      message: "Cédula y código de líder válidos",
      data: {
        leader,
        votante: votacionExiste
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};


export const confirmarVotoExterno = async (req, res) => {
  const { cedula, codigoLider, codigoVotacion } = req.body;
  const imagenes = req.files;

  try {
    // 1️⃣ Validar campos obligatorios
    if (!cedula || !codigoLider || !codigoVotacion) {
      return res.status(400).json({
        ok: false,
        message: "Cédula, código de líder y código de votación son obligatorios"
      });
    }

    // 2️⃣ Validar que exista el líder en LeaderExt
    const leader = await prisma.leaderExt.findFirst({
      where: {
        codigoReferencia: codigoLider,
        isActive: true
      }
    });

    if (!leader) {
      limpiarImagenes(imagenes);
      return res.status(400).json({
        ok: false,
        message: "Código de líder inválido"
      });
    }

    // 3️⃣ Validar que la cédula exista en votacion
    const votacionExiste = await prisma.votacion.findFirst({
      where: {
        cedula,
        isActive: true
      }
    });

    if (!votacionExiste) {
      limpiarImagenes(imagenes);
      return res.status(400).json({
        ok: false,
        message: "Cédula no válida"
      });
    }

    // 4️⃣ Validar código no repetido
    const codigoUsado = await prisma.votacionConfirmacionExterna.findFirst({
      where: { codigoVotacion }
    });

    if (codigoUsado) {
      limpiarImagenes(imagenes);
      return res.status(400).json({
        ok: false,
        message: "Este código ya fue utilizado"
      });
    }

    // 5️⃣ Validar imágenes
    if (!imagenes || imagenes.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Debe subir al menos una imagen"
      });
    }

    const nombresImagenes = imagenes.map(img => img.filename);

    // 🔹 Obtener fecha actual en Colombia
    const fechaColombia = new Date().toLocaleString("es-CO", {
      timeZone: "America/Bogota"
    });

    // 6️⃣ Guardar confirmación incluyendo confirmadoEn
    const nuevaConfirmacion = await prisma.votacionConfirmacionExterna.create({
      data: {
        cedula,
        codigoLider,
        codigoVotacion,
        imagenes: nombresImagenes,
        confirmadoEn: new Date() // UTC en BD
      }
    });

    return res.json({
      ok: true,
      message: "Voto externo confirmado correctamente",
      data: {
        ...nuevaConfirmacion,
        confirmadoEnColombia: fechaColombia // 👈 fecha legible Colombia
      }
    });

  } catch (error) {
    console.error(error);
    limpiarImagenes(imagenes);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });
  }
};

function limpiarImagenes(imagenes) {
  if (!imagenes) return;

  for (const img of imagenes) {
    try {
      fs.unlinkSync(path.join("uploads/votos", img.filename));
    } catch (e) {}
  }
}

/*
export const listarConfirmacionesExternas = async (req, res) => {
  try {
    // 1️⃣ Traer confirmaciones
    const confirmaciones = await prisma.votacionConfirmacionExterna.findMany({
      orderBy: {
        confirmadoEn: 'desc'
      }
    });

    // 2️⃣ Sacar códigos únicos de líder
    const codigosLider = [
      ...new Set(confirmaciones.map(c => c.codigoLider))
    ];

    // 3️⃣ Sacar cédulas únicas
    const cedulas = [
      ...new Set(confirmaciones.map(c => c.cedula))
    ];

    // 4️⃣ Buscar líderes
    const leaders = await prisma.leaderExt.findMany({
      where: {
        codigoReferencia: {
          in: codigosLider
        }
      }
    });

    // 5️⃣ Buscar votantes
    const votantes = await prisma.votacion.findMany({
      where: {
        cedula: {
          in: cedulas
        }
      }
    });

    // 6️⃣ Unir todo manualmente
    const data = confirmaciones.map(c => ({
      ...c,
      leader: leaders.find(
        l => l.codigoReferencia === c.codigoLider
      ) || null,
      votante: votantes.find(
        v => v.cedula === c.cedula
      ) || null
    }));

    return res.json({
      ok: true,
      total: data.length,
      data
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error al listar confirmaciones externas"
    });
  }
};

*/

/*
export const listarConfirmacionesExternas = async (req, res) => {
  try {
    // 1️⃣ Traer confirmaciones
    const confirmaciones = await prisma.votacionConfirmacionExterna.findMany({
      orderBy: {
        confirmadoEn: 'desc'
      }
    });

    // 2️⃣ Sacar códigos únicos de líder
    const codigosLider = [
      ...new Set(confirmaciones.map(c => c.codigoLider))
    ];

    // 3️⃣ Sacar cédulas únicas
    const cedulas = [
      ...new Set(confirmaciones.map(c => c.cedula))
    ];

    // 4️⃣ Buscar líderes
    const leaders = await prisma.leaderExt.findMany({
      where: {
        codigoReferencia: {
          in: codigosLider
        }
      }
    });

    // 5️⃣ Buscar votantes
    const votantes = await prisma.votacion.findMany({
      where: {
        cedula: {
          in: cedulas
        }
      }
    });

    // 5️⃣b️⃣ Traer todos los puestos de votación únicos
    const puestoIds = [...new Set(votantes.map(v => v.puestoVotacion).filter(Boolean))];

    const puestos = await prisma.puestoVotacion.findMany({
      where: { id: { in: puestoIds } },
      select: { id: true, puesto: true }
    });

    // 6️⃣ Crear mapa id -> nombre
    const puestosMap = {};
    puestos.forEach(p => {
      puestosMap[p.id] = p.puesto;
    });

    // 7️⃣ Unir todo manualmente y agregar nombre del puesto
    const data = confirmaciones.map(c => {
      const votante = votantes.find(v => v.cedula === c.cedula) || null;

      return {
        ...c,
        leader: leaders.find(l => l.codigoReferencia === c.codigoLider) || null,
        votante: votante
          ? {
              ...votante,
              puestoVotacionNombre: puestosMap[votante.puestoVotacion] || null
            }
          : null
      };
    });

    return res.json({
      ok: true,
      total: data.length,
      data
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error al listar confirmaciones externas"
    });
  }
};
*/

export const listarConfirmacionesExternas = async (req, res) => {
  try {

    // 1️⃣ Traer confirmaciones
    const confirmaciones = await prisma.votacionConfirmacionExterna.findMany({
      orderBy: {
        confirmadoEn: 'desc'
      }
    });

    // 2️⃣ Sacar códigos únicos de líder
    const codigosLider = [
      ...new Set(confirmaciones.map(c => c.codigoLider))
    ];

    // 3️⃣ Sacar cédulas únicas
    const cedulas = [
      ...new Set(confirmaciones.map(c => c.cedula))
    ];

    // 4️⃣ Buscar líderes
    const leaders = await prisma.leaderExt.findMany({
      where: {
        codigoReferencia: {
          in: codigosLider
        }
      }
    });

    // 5️⃣ Buscar votantes
    const votantes = await prisma.votacion.findMany({
      where: {
        cedula: {
          in: cedulas
        }
      }
    });

    // 6️⃣ Sacar puestos únicos
    const puestoIds = [
      ...new Set(
        votantes
          .map(v => v.puestoVotacion)
          .filter(Boolean)
      )
    ];

    const puestos = await prisma.puestoVotacion.findMany({
      where: { id: { in: puestoIds } },
      select: { id: true, puesto: true }
    });

    // 🔥 Crear MAPAS (esto acelera muchísimo)
    const leadersMap = {};
    leaders.forEach(l => {
      leadersMap[l.codigoReferencia] = l;
    });

    const votantesMap = {};
    votantes.forEach(v => {
      votantesMap[v.cedula] = v;
    });

    const puestosMap = {};
    puestos.forEach(p => {
      puestosMap[p.id] = p.puesto;
    });

    // 7️⃣ Unir todo usando mapas (MUCHO más rápido)
    const data = confirmaciones.map(c => {

      const votante = votantesMap[c.cedula] || null;

      return {
        ...c,
        leader: leadersMap[c.codigoLider] || null,
        votante: votante
          ? {
              ...votante,
              puestoVotacionNombre:
                puestosMap[votante.puestoVotacion] || null
            }
          : null
      };

    });

    return res.json({
      ok: true,
      total: data.length,
      data
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error al listar confirmaciones externas"
    });
  }
};



export const exportPdfConfirmacionesExternas = async (req, res) => {

  try {

    const confirmaciones = await prisma.votacionConfirmacionExterna.findMany({
      orderBy: {
        confirmadoEn: "desc"
      }
    });

    const codigosLider = [...new Set(confirmaciones.map(c => c.codigoLider))];
    const cedulas = [...new Set(confirmaciones.map(c => c.cedula))];

    const leaders = await prisma.leaderExt.findMany({
      where: {
        codigoReferencia: {
          in: codigosLider
        }
      }
    });

    const votantes = await prisma.votacion.findMany({
      where: {
        cedula: {
          in: cedulas
        }
      }
    });

    const data = confirmaciones.map(c => {

      const votante = votantes.find(v => v.cedula === c.cedula) || null;

      return {
        ...c,
        leader: leaders.find(l => l.codigoReferencia === c.codigoLider) || null,
        votante
      };

    });

    const pdf = await generarPdfConfirmacionesExternas(data);

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=confirmaciones_externas.pdf"
    );

    res.end(pdf);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Error generando PDF"
    });

  }

};