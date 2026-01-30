import prisma from "../../prisma.js"
import { buildWhereByRole, buildDashboardWhere } from "./reports.utils.js"
import { Parser } from 'json2csv';
import XLSX from "xlsx";
import fs from "fs";


import { createRequire } from "module";
import path from "path";
import archiver from "archiver";


import { launchBrowser } from "../../utils/puppeteer.js";


/**
 * 📊 DASHBOARD GENERAL
 */
export const dashboard = async (req, res) => {
  try {
    const where = buildDashboardWhere(req.user, req.query);

    // 1️⃣ Traemos votaciones (tal cual están hoy)
    const votaciones = await prisma.votacion.findMany({
      where,
      select: {
        tipo: { select: { nombre: true } },
        leader: { select: { id: true, name: true } },
        programa: { select: { nombre: true } },
        puestoVotacion: true
      }
    });

    const totalGeneral = votaciones.length;

    // 2️⃣ Lookup OPTIMO de puestos (solo los que se usan)
    const puestoIds = [
      ...new Set(
        votaciones
          .map(v => v.puestoVotacion)
          .filter(Boolean)
      )
    ];

    const puestosMap = {};

    if (puestoIds.length > 0) {
      const puestosDb = await prisma.puestoVotacion.findMany({
        where: {
          id: { in: puestoIds }
        },
        select: {
          id: true,
          puesto: true
        }
      });

      puestosDb.forEach(p => {
        puestosMap[p.id] = p.puesto;
      });
    }

    // 3️⃣ Contadores generales
    let pago = 0;
    let noPago = 0;

    const lideres = {};
    const programas = {};
    const puestos = {};
    const tipos = {};

    // 4️⃣ Procesamiento
    votaciones.forEach(v => {
      const esCorazon = v.tipo?.nombre === 'CORAZÓN';
      esCorazon ? noPago++ : pago++;

      // 👤 LÍDER
      if (v.leader) {
        if (!lideres[v.leader.id]) {
          lideres[v.leader.id] = {
            lider: v.leader.name,
            pago: 0,
            noPago: 0,
            total: 0
          };
        }
        esCorazon
          ? lideres[v.leader.id].noPago++
          : lideres[v.leader.id].pago++;
        lideres[v.leader.id].total++;
      }

      // 🏢 PROGRAMA
      const prog = v.programa?.nombre || 'SIN PROGRAMA';
      if (!programas[prog]) {
        programas[prog] = { pago: 0, noPago: 0, total: 0 };
      }
      esCorazon ? programas[prog].noPago++ : programas[prog].pago++;
      programas[prog].total++;

      // 🏫 PUESTO (nombre real)
      const puestoNombre =
        puestosMap[v.puestoVotacion] || 'SIN PUESTO';

      if (!puestos[puestoNombre]) {
        puestos[puestoNombre] = { pago: 0, noPago: 0, total: 0 };
      }
      esCorazon
        ? puestos[puestoNombre].noPago++
        : puestos[puestoNombre].pago++;
      puestos[puestoNombre].total++;

      // 🔖 TIPO
      const tipo = v.tipo?.nombre || 'SIN TIPO';
      tipos[tipo] = (tipos[tipo] || 0) + 1;
    });

    // 5️⃣ Respuesta
    res.json({
      totalVotaciones: totalGeneral,

      // 🔢 RESUMEN GENERAL
      pagos: [
        {
          esPago: true,
          total: pago,
          porcentaje: percent(pago, totalGeneral)
        },
        {
          esPago: false,
          total: noPago,
          porcentaje: percent(noPago, totalGeneral)
        }
      ],

      // 👤 POR LÍDER
      porLider: Object.values(lideres).map(l => ({
        ...l,
        porcentajePago: percent(l.pago, totalGeneral),
        porcentajeNoPago: percent(l.noPago, totalGeneral),
        porcentajeTotal: percent(l.total, totalGeneral)
      })),

      // 🏢 POR PROGRAMA
      porPrograma: Object.entries(programas).map(([k, v]) => ({
        programa: k,
        ...v,
        porcentajePago: percent(v.pago, totalGeneral),
        porcentajeNoPago: percent(v.noPago, totalGeneral),
        porcentajeTotal: percent(v.total, totalGeneral)
      })),

      // 🏫 POR PUESTO
      porPuestoVotacion: Object.entries(puestos).map(([k, v]) => ({
        puestoVotacion: k,
        ...v,
        porcentajePago: percent(v.pago, totalGeneral),
        porcentajeNoPago: percent(v.noPago, totalGeneral),
        porcentajeTotal: percent(v.total, totalGeneral)
      })),

      // 🔖 POR TIPO
      porTipo: Object.entries(tipos).map(([k, v]) => ({
        tipo: k,
        total: v,
        porcentaje: percent(v, totalGeneral)
      }))
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




/**
 * 👥 POR LÍDER
 */
const percent = (value, total) => {
  if (!total || total === 0) return 0;
  return Number(((value / total) * 100).toFixed(2));
};
export const porLider = async (req, res) => {
  try {
    const where = buildDashboardWhere(req.user, req.query);

    const total = await prisma.votacion.count({ where });

    const data = await prisma.votacion.groupBy({
      by: ["leaderId"],
      where,
      _count: { _all: true }
    });

    res.json(
      data.map(item => ({
        leaderId: item.leaderId,
        total: item._count._all,
        porcentaje: percent(item._count._all, total)
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/**
 * ⌨️ POR DIGITADOR
 */
export const porDigitador = async (req, res) => {
  try {
    const where = {
      ...buildWhereByRole(req.user),
      digitadorId: { not: null }
    }

    const total = await prisma.votacion.count({ where })

    const data = await prisma.votacion.groupBy({
      by: ["digitadorId"],
      where,
      _count: { _all: true }
    })

    res.json(
      data.map(item => ({
        digitadorId: item.digitadorId,
        total: item._count._all,
        porcentaje: percent(item._count._all, total)
      }))
    )
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/**
 * ⚠️ DUPLICADOS
 */
export const duplicados = async (req, res) => {
  try {
    const where = {
      ...buildWhereByRole(req.user),
      isDuplicate: true
    }

    const total = await prisma.votacion.count({
      where: buildWhereByRole(req.user)
    })

    const totalDuplicados = await prisma.votacion.count({ where })

    const porLider = await prisma.votacion.groupBy({
      by: ["leaderId"],
      where,
      _count: { _all: true }
    })

    res.json({
      totalDuplicados,
      porcentaje: percent(totalDuplicados, total),
      porLider
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/**
 * 💰 PAGOS
 */
export const pagos = async (req, res) => {
  try {
    const where = buildDashboardWhere(req.user, req.query);

    const votaciones = await prisma.votacion.findMany({
      where,
      select: {
        tipo: { select: { nombre: true } }
      }
    });

    const total = votaciones.length;
    let totalPago = 0;
    let totalNoPago = 0;

    votaciones.forEach(v => {
      v.tipo?.nombre === 'CORAZÓN'
        ? totalNoPago++
        : totalPago++;
    });

    res.json([
      {
        esPago: true,
        total: totalPago,
        porcentaje: percent(totalPago, total)
      },
      {
        esPago: false,
        total: totalNoPago,
        porcentaje: percent(totalNoPago, total)
      }
    ]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



/**
 * 📦 PLANILLAS
 */
export const planillas = async (req, res) => {
  try {
    const where = {
      ...buildWhereByRole(req.user),
      planilla: { not: null }
    }

    const data = await prisma.votacion.groupBy({
      by: ["planilla"],
      where,
      _count: { _all: true }
    })

    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const dashboardDetalle = async (req, res) => {
  try {
    const {
      tipo,           // 'CORAZÓN'
      leaderId,
      programaId,
      digitadorId,
      page = 1,
      limit = 20
    } = req.query;

    const where = buildDashboardWhere(req.user, req.query);

    // ❤️ FILTRO POR TIPO (NOMBRE)
    if (tipo) {
      where.tipo = {
        is: {
          nombre: tipo
        }
      };
    }

    // 👤 LÍDER
    if (leaderId) {
      where.leaderId = leaderId;
    }

    // 🎓 PROGRAMA
    if (programaId) {
      where.programaId = programaId;
    }

    // ⌨️ DIGITADOR
    if (digitadorId) {
      where.digitadorId = digitadorId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [total, data] = await Promise.all([
      prisma.votacion.count({ where }),
      prisma.votacion.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          leader: { select: { name: true } },
          digitador: { select: { username: true } },
          programa: { select: { nombre: true } },
          sede: { select: { nombre: true } },
          tipo: { select: { nombre: true } }
        }
      })
    ]);

    res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
      data
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const dashboardResumen = async (req, res) => {
  try {
    const where = buildDashboardWhere(req.user, req.query);

    // 1️⃣ Traemos votaciones (con IDs)
    const votaciones = await prisma.votacion.findMany({
      where,
      select: {
        leaderId: true,
        programaId: true,
        puestoVotacion: true, // ID del puesto
        tipo: { select: { nombre: true } },
        leader: { select: { name: true } },
        programa: { select: { nombre: true } }
      }
    });

    // 2️⃣ Traer TODOS los puestos usados en una sola consulta
    const puestoIds = [
      ...new Set(
        votaciones
          .map(v => v.puestoVotacion)
          .filter(Boolean)
      )
    ];

    const puestos = await prisma.puestoVotacion.findMany({
      where: { id: { in: puestoIds } },
      select: { id: true, puesto: true }
    });

    // 3️⃣ Mapa id → nombre
    const puestoMap = {};
    puestos.forEach(p => {
      puestoMap[p.id] = p.puesto;
    });

    const total = votaciones.length;
    let pago = 0;
    let noPago = 0;

    const porLider = {};
    const porPrograma = {};
    const porPuesto = {};

    // 4️⃣ Procesar resumen
    votaciones.forEach(v => {
      const esNoPago = v.tipo?.nombre === 'CORAZÓN';
      esNoPago ? noPago++ : pago++;

      // 👤 LÍDER
      if (v.leader) {
        if (!porLider[v.leaderId]) {
          porLider[v.leaderId] = {
            lider: v.leader.name,
            total: 0,
            pago: 0,
            noPago: 0
          };
        }

        esNoPago
          ? porLider[v.leaderId].noPago++
          : porLider[v.leaderId].pago++;

        porLider[v.leaderId].total++;
      }

      // 🎓 PROGRAMA
      const prog = v.programa?.nombre || 'SIN PROGRAMA';
      if (!porPrograma[prog]) {
        porPrograma[prog] = { total: 0, pago: 0, noPago: 0 };
      }

      esNoPago
        ? porPrograma[prog].noPago++
        : porPrograma[prog].pago++;

      porPrograma[prog].total++;

      // 🏫 PUESTO DE VOTACIÓN (NOMBRE REAL)
      const puestoNombre = puestoMap[v.puestoVotacion] || 'SIN PUESTO';

      if (!porPuesto[puestoNombre]) {
        porPuesto[puestoNombre] = { total: 0, pago: 0, noPago: 0 };
      }

      esNoPago
        ? porPuesto[puestoNombre].noPago++
        : porPuesto[puestoNombre].pago++;

      porPuesto[puestoNombre].total++;
    });

    // 5️⃣ Helper porcentajes
    const conPorcentajes = obj => ({
      ...obj,
      porcentajePago: obj.total
        ? Number(((obj.pago / obj.total) * 100).toFixed(2))
        : 0,
      porcentajeNoPago: obj.total
        ? Number(((obj.noPago / obj.total) * 100).toFixed(2))
        : 0
    });

    // 6️⃣ Respuesta
    res.json({
      total,
      pagos: {
        pago,
        noPago,
        porcentajePago: total
          ? Number(((pago / total) * 100).toFixed(2))
          : 0,
        porcentajeNoPago: total
          ? Number(((noPago / total) * 100).toFixed(2))
          : 0
      },
      porLider: Object.values(porLider).map(conPorcentajes),
      porPrograma: Object.entries(porPrograma).map(([k, v]) => ({
        programa: k,
        ...conPorcentajes(v)
      })),
      porPuesto: Object.entries(porPuesto).map(([k, v]) => ({
        puestoVotacion: k,
        ...conPorcentajes(v)
      }))
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};



export const exportDashboard = async (req, res) => {
  try {
    // Construir filtros según rol y query
    const where = buildDashboardWhere(req.user, req.query);

    // Filtrar por tipo si se pasa en query
    if (req.query.tipo) {
      where.tipo = { nombre: req.query.tipo };
    }

    // Obtener todas las votaciones
    const data = await prisma.votacion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        leader: { select: { name: true } },
        digitador: { select: { username: true } },
        programa: { select: { nombre: true } },
        sede: { select: { nombre: true } },
        tipo: { select: { nombre: true } }
      }
    });

    // Mapear datos para CSV (completo)
    const rows = data.map(v => ({
      Cedula: v.cedula,
      Nombre: `${v.nombre1} ${v.nombre2 || ''} ${v.apellido1} ${v.apellido2 || ''}`.trim(),
      Telefono: v.telefono || '',
      Direccion: v.direccion || '',
      Barrio: v.barrio || '',
      PuestoVotacion: v.puestoVotacion || '',
      Lider: v.leader?.name || '',
      Digitador: v.digitador?.username || '',
      Programa: v.programa?.nombre || '',
      Sede: v.sede?.nombre || '',
      Tipo: v.tipo?.nombre || '',
      Pago: v.tipo?.nombre === 'CORAZÓN' ? 'NO' : 'SI',
      Planilla: v.planilla || '',
      IsDuplicate: v.isDuplicate ? 'SI' : 'NO',
      DuplicatedFrom: v.duplicatedFrom || '',
      FechaCreacion: v.createdAt.toISOString().split('T')[0],
      FechaActualizacion: v.updatedAt.toISOString().split('T')[0]
    }));

    // Generar CSV
    const parser = new Parser();
    const csv = parser.parse(rows);

    // Enviar al cliente
    res.header('Content-Type', 'text/csv');
    res.attachment('dashboard_export.csv');
    res.send(csv);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const exportDashboardXLSX = async (req, res) => {
  try {
    // Carpeta donde se guardarán los archivos
    const exportFolder = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportFolder)) {
      fs.mkdirSync(exportFolder); // crear carpeta si no existe
    }

    // Construir filtros según rol y query
    const where = buildDashboardWhere(req.user, req.query);

    // Filtrar por tipo si se pasa en query
    if (req.query.tipo) {
      where.tipo = { nombre: req.query.tipo };
    }

    // Obtener todas las votaciones
    const votaciones = await prisma.votacion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        leader: { select: { name: true } },
        digitador: { select: { username: true } },
        programa: { select: { nombre: true } },
        sede: { select: { nombre: true } },
        tipo: { select: { nombre: true, esPago: true } }
      }
    });

    // Mapear datos para Excel
    const rows = votaciones.map(v => ({
      Cedula: v.cedula,
      Nombre: `${v.nombre1} ${v.nombre2 || ''} ${v.apellido1} ${v.apellido2 || ''}`.trim(),
      Telefono: v.telefono || '',
      Direccion: v.direccion || '',
      Barrio: v.barrio || '',
      PuestoVotacion: v.puestoVotacion || '',
      Lider: v.leader?.name || '',
      Digitador: v.digitador?.username || '',
      Programa: v.programa?.nombre || '',
      Sede: v.sede?.nombre || '',
      Tipo: v.tipo?.nombre || '',
      Pago: v.tipo?.nombre === 'CORAZÓN' ? 'NO' : 'SI',
      Planilla: v.planilla || '',
      IsDuplicate: v.isDuplicate ? 'SI' : 'NO',
      DuplicatedFrom: v.duplicatedFrom || '',
      FechaCreacion: v.createdAt.toISOString().split('T')[0],
      FechaActualizacion: v.updatedAt.toISOString().split('T')[0]
    }));

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Votaciones");

    // Generar buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Nombre de archivo con fecha/hora
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    const fileName = `dashboard_export_${timestamp}.xlsx`;
    const filePath = path.join(exportFolder, fileName);

    // Guardar archivo en servidor
    fs.writeFileSync(filePath, buf);

    console.log(`Archivo guardado: ${filePath}`);

    // Enviar archivo al cliente
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${fileName}`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buf);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};


const lideres = await prisma.leader.findMany({
  where: { isActive: true },
  include: {
    votaciones: {
      include: {
        tipo: { select: { nombre: true } },
        programa: { select: { nombre: true } },
        digitador: { select: { username: true } },
      },
      orderBy: { createdAt: "asc" },
    },
  },
});

// Función para generar HTML del reporte
function generarHtmlReporte(lideres, puestosMap) {
  let html = `
    <html>
      <head>
        <style>
          body { font-family: Arial; font-size: 11px; margin: 20px; }
          h1 { text-align: center; }
          h2 { margin-top: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside: auto; }
          th, td { border: 1px solid #ccc; padding: 4px; text-align: left; }
          th { background: #f0f0f0; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        <h1>Reporte por Líder</h1>
  `;

  lideres.forEach((lider, index) => {
    if (!lider.votaciones.length) return;

    if (index !== 0) html += `<div class="page-break"></div>`; // página nueva por líder

    // Información superior del líder
    html += `
      <h2>Líder: ${lider.name}</h2>
      <p>Recomendado por: ${lider.votaciones[0].recommendedBy?.name || "N/A"}</p>
      <p>Digitador: ${lider.votaciones[0].digitador?.username || "N/A"}</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Cédula</th>
            <th>Nombre Completo</th>
            <th>Teléfono</th>
            <th>Dirección</th>
            <th>Barrio</th>
            <th>Puesto de votación</th>
            <th>Programa</th>
            <th>Tipo</th>
            <th>Pago</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
    `;

    lider.votaciones.forEach((v, i) => {
  const nombreCompleto = `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();
  const esPago = v.tipo?.nombre === "CORAZÓN" ? "NO" : "SI";
  const puestoNombre = puestosMap[v.puestoVotacion] || "SIN PUESTO";

  

      html += `
          <tr>
            <td>${i + 1}</td>
            <td>${v.cedula}</td>
            <td>${nombreCompleto}</td>
            <td>${v.telefono || ""}</td>
            <td>${v.direccion || ""}</td>
            <td>${v.barrio || ""}</td>
            <td>${puestoNombre}</td>
            <td>${v.programa?.nombre || ""}</td>
            <td>${v.tipo?.nombre || ""}</td>
            <td>${esPago}</td>
            <td>${new Date(v.createdAt).toLocaleDateString()}</td>
          </tr>
        `;
      });

    html += `
        </tbody>
      </table>
    `;
  });

  html += `</body></html>`;
  return html;
}

function generarHtmlReportePorLider(lider, puestosMap) {
  let html = `
  <html>
    <head>
      <style>
        body { font-family: Arial; font-size: 11px; margin: 20px; }
        h2 { margin-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 4px; }
        th { background: #f0f0f0; }
      </style>
    </head>
    <body>
      <h2>Líder: ${lider.name}</h2>
      <p>Recomendado por: ${lider.votaciones[0]?.recommendedBy?.name || "N/A"}</p>
      <p>Digitador: ${lider.votaciones[0]?.digitador?.username || "N/A"}</p>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Cédula</th>
            <th>Nombre Completo</th>
            <th>Teléfono</th>
            <th>Dirección</th>
            <th>Barrio</th>
            <th>Puesto</th>
            <th>Programa</th>
            <th>Tipo</th>
            <th>Pago</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
  `;

  lider.votaciones.forEach((v, i) => {
    const nombre = `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();
    const pago = v.tipo?.nombre === "CORAZÓN" ? "NO" : "SI";
    const puesto = puestosMap[v.puestoVotacion] || "SIN PUESTO";

    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${v.cedula}</td>
        <td>${nombre}</td>
        <td>${v.telefono || ""}</td>
        <td>${v.direccion || ""}</td>
        <td>${v.barrio || ""}</td>
        <td>${puesto}</td>
        <td>${v.programa?.nombre || ""}</td>
        <td>${v.tipo?.nombre || ""}</td>
        <td>${pago}</td>
        <td>${new Date(v.createdAt).toLocaleDateString()}</td>
      </tr>
    `;
  });

  html += `</tbody></table></body></html>`;
  return html;
}



// Función para exportar PDF

export const exportPdfPorLider = async (req, res) => {
  try {

    const formato = req.query.formato || "carta";

    const pdfSize =
      formato === "oficio"
        ? { width: "216mm", height: "340mm" }
        : { format: "A4" };


    const where = buildWhereByRole(req.user);

    // 1️⃣ Traer líderes con sus votaciones
    const lideres = await prisma.leader.findMany({
      where: { isActive: true },
      include: {
        votaciones: {
          where, // tu filtro dinámico
          include: {
            tipo: { select: { nombre: true } },
            programa: { select: { nombre: true } },
            digitador: { select: { username: true } },
            recommendedBy: { select: { name: true } }, // líder que recomendó
          },
          orderBy: { createdAt: "asc" }, 
        },
      },
      orderBy: { name: "asc" },
    });

    // 2️⃣ Lookup de puestos de votación para traducir IDs a nombre real
    const puestoIds = [
      ...new Set(lideres.flatMap(l => l.votaciones.map(v => v.puestoVotacion)).filter(Boolean))
    ];
    const puestosDb = await prisma.puestoVotacion.findMany({
      where: { id: { in: puestoIds } },
      select: { id: true, puesto: true }
    });
    const puestosMap = {};
    puestosDb.forEach(p => { puestosMap[p.id] = p.puesto; });

    // 3️⃣ Generamos HTML
    const html = generarHtmlReporte(lideres, puestosMap);

    // 4️⃣ Puppeteer para PDF
    const browser = await launchBrowser({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      ...pdfSize,
      printBackground: true,
      landscape: true,
      displayHeaderFooter: true,
      headerTemplate: `<span></span>`,
      footerTemplate: `
        <div style="width:100%; font-size:9px; text-align:center; padding:5px 0;">
          Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      `,
      margin: {
        top: "15mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=reporte_por_lider.pdf");
    res.end(pdf);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};


export const exportZipPorLider = async (req, res) => {
  const where = buildWhereByRole(req.user);
  const formato = req.query.formato || "carta";

  const pdfSize =
    formato === "oficio"
      ? { width: "216mm", height: "340mm" }
      : { format: "A4" };

  const lideres = await prisma.leader.findMany({
    where: { isActive: true },
    include: {
      votaciones: {
        where,
        include: {
          tipo: { select: { nombre: true } },
          programa: { select: { nombre: true } },
          digitador: { select: { username: true } },
          recommendedBy: { select: { name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Puestos
  const puestoIds = [...new Set(lideres.flatMap(l => l.votaciones.map(v => v.puestoVotacion)).filter(Boolean))];
  const puestosDb = await prisma.puestoVotacion.findMany({
    where: { id: { in: puestoIds } },
    select: { id: true, puesto: true },
  });
  const puestosMap = Object.fromEntries(puestosDb.map(p => [p.id, p.puesto]));

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=reportes_por_lider.zip");

  const archive = archiver("zip");
  archive.pipe(res);

  const browser = await launchBrowser({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });

  const BATCH_SIZE = 3;

for (let i = 0; i < lideres.length; i += BATCH_SIZE) {
  const batch = lideres.slice(i, i + BATCH_SIZE);

  for (const lider of batch) {
    if (!lider.votaciones.length) continue;

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    page.setDefaultTimeout(0);

    const html = generarHtmlReportePorLider(lider, puestosMap);
    await page.setContent(html);

    const pdfUint8 = await page.pdf({
      ...pdfSize,
      landscape: true,
      displayHeaderFooter: true,
      headerTemplate: `<span></span>`,
      footerTemplate: `
        <div style="width:100%; font-size:9px; text-align:center;">
          Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      `,
      margin: { top: "15mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });

    const pdfBuffer = Buffer.from(pdfUint8);
    await page.close();

    archive.append(pdfBuffer, {
      name: `reporte_lider_${lider.name.replace(/\s+/g, "_").toLowerCase()}.pdf`,
    });
  }

  // 🧠 pequeño respiro entre lotes (opcional pero recomendado)
  await new Promise(r => setTimeout(r, 200));
}

  await browser.close();
  await archive.finalize();
};


export const exportExcelPorLider = async (req, res) => {
  try {
    const where = buildWhereByRole(req.user);

    const lideres = await prisma.leader.findMany({
      where: { isActive: true },
      include: {
        votaciones: {
          where,
          include: {
            tipo: { select: { nombre: true } },
            programa: { select: { nombre: true } },
            digitador: { select: { username: true } },
            recommendedBy: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const puestoIds = [
      ...new Set(
        lideres.flatMap(l =>
          l.votaciones.map(v => v.puestoVotacion).filter(Boolean)
        )
      )
    ];

    const puestosDb = await prisma.puestoVotacion.findMany({
      where: { id: { in: puestoIds } },
      select: { id: true, puesto: true },
    });

    const puestosMap = Object.fromEntries(
      puestosDb.map(p => [p.id, p.puesto])
    );
    const rows = [];

    for (const lider of lideres) {
      for (const v of lider.votaciones) {
        const nombreCompleto = `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();
        const pago = v.tipo?.nombre === "CORAZÓN" ? "NO" : "SI";
        const puestoNombre = puestosMap[v.puestoVotacion] || "SIN PUESTO";

        rows.push({
          Lider: lider.name,
          Cedula: v.cedula || "",
          NombreCompleto: nombreCompleto,
          Telefono: v.telefono || "",
          Direccion: v.direccion || "",
          Barrio: v.barrio || "",
          PuestoVotacion: puestoNombre || "",
          Programa: v.programa?.nombre || "",
          Tipo: v.tipo?.nombre || "",
          Pago: pago,
          FechaRegistro: v.createdAt
            ? new Date(v.createdAt).toLocaleDateString("es-CO")
            : "",
        });
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Votaciones");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=reporte_votaciones_por_lider.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.end(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};



function generarHtmlReportePorPuesto(puestos) {
  let html = `
  <html>
    <head>
      <style>
        body { font-family: Arial; font-size: 11px; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 4px; }
        th { background: #f0f0f0; }
        .page-break { page-break-before: always; }
      </style>
    </head>
    <body>
      <h1>Reporte por Puesto de Votación</h1>
  `;

  puestos.forEach((puesto, index) => {
    if (!puesto.votaciones.length) return;
    if (index !== 0) html += `<div class="page-break"></div>`;

    html += `
      <h2>Puesto: ${puesto.puesto}</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Líder</th>
            <th>Cédula</th>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Barrio</th>
            <th>Programa</th>
            <th>Tipo</th>
            <th>Pago</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
    `;

    puesto.votaciones.forEach((v, i) => {
      const nombre = `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();
      const pago = v.tipo?.nombre === "CORAZÓN" ? "NO" : "SI";

      html += `
        <tr>
          <td>${i + 1}</td>
          <td>${v.leader?.name || ""}</td>
          <td>${v.cedula}</td>
          <td>${nombre}</td>
          <td>${v.telefono || ""}</td>
          <td>${v.barrio || ""}</td>
          <td>${v.programa?.nombre || ""}</td>
          <td>${v.tipo?.nombre || ""}</td>
          <td>${pago}</td>
          <td>${new Date(v.createdAt).toLocaleDateString()}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
  });

  html += `</body></html>`;
  return html;
}

export const exportPdfPorPuesto = async (req, res) => {
  try {
    const where = buildWhereByRole(req.user);

    // 🔹 Manejar tamaño de PDF según formato
    const formato = req.query.formato || "carta";
    const pdfSize =
      formato === "oficio"
        ? { width: "216mm", height: "340mm" }
        : { format: "A4" };

    // 🔹 Traer todos los puestos
    const puestosDb = await prisma.puestoVotacion.findMany({
      select: { id: true, puesto: true }
    });
    const puestosMap = Object.fromEntries(puestosDb.map(p => [p.id, p.puesto]));

    // 🔹 Traer todas las votaciones
    const votaciones = await prisma.votacion.findMany({
      where,
      include: {
        leader: { select: { name: true } },
        tipo: { select: { nombre: true } },
        programa: { select: { nombre: true } },
        digitador: { select: { username: true } },
        recommendedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // 🔹 Agrupar por puesto
    const puestos = {};
    votaciones.forEach(v => {
      const id = v.puestoVotacion || "SIN_PUESTO";
      if (!puestos[id]) {
        puestos[id] = {
          id,
          puesto: puestosMap[id] || "SIN PUESTO",
          votaciones: [],
        };
      }
      puestos[id].votaciones.push(v);
    });

    const puestosArray = Object.values(puestos);

    // 🔹 Generar HTML
    const html = generarHtmlReportePorPuesto(puestosArray);

    // 🔹 Crear PDF con Puppeteer
    const browser = await launchBrowser({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      ...pdfSize, // <-- aquí se aplica el formato oficio o A4
      landscape: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<span></span>`,
      footerTemplate: `
        <div style="width:100%; font-size:9px; text-align:center; padding:5px 0;">
          Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      `,
      margin: { top: "15mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=reporte_por_puesto.pdf");
    res.end(pdf);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const exportZipPorPuesto = async (req, res) => {
  try {
    const where = buildWhereByRole(req.user);
    const formato = req.query.formato || "carta";
    const pdfSize =
      formato === "oficio"
        ? { width: "216mm", height: "340mm" }
        : { format: "A4" };

    // 🔹 Traer todos los puestos
    const puestosDb = await prisma.puestoVotacion.findMany({
      select: { id: true, puesto: true }
    });
    const puestosMap = Object.fromEntries(puestosDb.map(p => [p.id, p.puesto]));

    // 🔹 Traer todas las votaciones
    const votaciones = await prisma.votacion.findMany({
      where,
      include: {
        leader: { select: { name: true } },
        tipo: { select: { nombre: true } },
        programa: { select: { nombre: true } },
        digitador: { select: { username: true } },
        recommendedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // 🔹 Agrupar votaciones por puesto
    const puestos = {};
    votaciones.forEach(v => {
      const id = v.puestoVotacion || "SIN_PUESTO";
      if (!puestos[id]) {
        puestos[id] = {
          id,
          puesto: puestosMap[id] || "SIN PUESTO",
          votaciones: [],
        };
      }
      puestos[id].votaciones.push(v);
    });
    const puestosArray = Object.values(puestos);

    // 🔹 Preparar ZIP
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=reportes_por_puesto.zip");
    const archive = archiver("zip");
    archive.pipe(res);

    // 🔹 Abrir Puppeteer
    const browser = await launchBrowser({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });

    for (const puesto of puestosArray) {
      if (!puesto.votaciones.length) continue;

      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      page.setDefaultTimeout(0);

      const html = generarHtmlReportePorPuesto([puesto]);
      await page.setContent(html);

      const pdfUint8 = await page.pdf({
        ...pdfSize, // aplica oficio o A4
        landscape: true,
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `<span></span>`,
        footerTemplate: `
          <div style="width:100%; font-size:9px; text-align:center;">
            Página <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
        `,
        margin: { top: "15mm", bottom: "20mm", left: "15mm", right: "15mm" },
      });

      await page.close();

      archive.append(Buffer.from(pdfUint8), {
        name: `reporte_puesto_${puesto.puesto.replace(/\s+/g, "_").toLowerCase()}.pdf`,
      });
    }

    await browser.close();
    await archive.finalize();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const exportExcelPorPuesto = async (req, res) => {
  try {
    const where = buildWhereByRole(req.user);

    // 🔹 Traer todos los puestos
    const puestosDb = await prisma.puestoVotacion.findMany({
      select: { id: true, puesto: true }
    });
    const puestosMap = Object.fromEntries(puestosDb.map(p => [p.id, p.puesto]));

    // 🔹 Traer todas las votaciones
    const votaciones = await prisma.votacion.findMany({
      where,
      include: {
        leader: { select: { name: true } },
        tipo: { select: { nombre: true } },
        programa: { select: { nombre: true } },
        digitador: { select: { username: true } },
        recommendedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // 🔹 Agrupar por puesto
    const puestos = {};
    votaciones.forEach(v => {
      const id = v.puestoVotacion || "SIN_PUESTO";
      if (!puestos[id]) {
        puestos[id] = {
          id,
          puesto: puestosMap[id] || "SIN PUESTO",
          votaciones: [],
        };
      }
      puestos[id].votaciones.push(v);
    });
    const puestosArray = Object.values(puestos);

    // 🔹 Preparar filas para Excel
    const rows = [];
    puestosArray.forEach(puesto => {
      puesto.votaciones.forEach(v => {
        const nombreCompleto = `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();
        const pago = v.tipo?.nombre === "CORAZÓN" ? "NO" : "SI";

        rows.push({
          Puesto: puesto.puesto,
          Lider: v.leader?.name || "",
          Cedula: v.cedula || "",
          NombreCompleto: nombreCompleto,
          Telefono: v.telefono || "",
          Barrio: v.barrio || "",
          Programa: v.programa?.nombre || "",
          Tipo: v.tipo?.nombre || "",
          Pago: pago,
          FechaRegistro: v.createdAt ? new Date(v.createdAt).toLocaleDateString("es-CO") : "",
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Votaciones");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=reporte_votaciones_por_puesto.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.end(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};


function generarHtmlReportePorPrograma(programas, puestosMap) {
  let html = `
  <html>
    <head>
      <style>
        body { font-family: Arial; font-size: 11px; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 4px; }
        th { background: #f0f0f0; }
        .page-break { page-break-before: always; }
      </style>
    </head>
    <body>
      <h1>Reporte por Programa</h1>
  `;

  programas.forEach((programa, index) => {
    if (!programa.votaciones.length) return;
    if (index !== 0) html += `<div class="page-break"></div>`;

    html += `
      <h2>Programa: ${programa.nombre}</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Líder</th>
            <th>Cédula</th>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Barrio</th>
            <th>Puesto</th>
            <th>Tipo</th>
            <th>Pago</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
    `;

    programa.votaciones.forEach((v, i) => {
      const nombre = `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();
      const pago = v.tipo?.nombre === "CORAZÓN" ? "NO" : "SI";
      const puestoNombre = puestosMap[v.puestoVotacion] || "SIN PUESTO";

      html += `
        <tr>
          <td>${i + 1}</td>
          <td>${v.leader?.name || ""}</td>
          <td>${v.cedula}</td>
          <td>${nombre}</td>
          <td>${v.telefono || ""}</td>
          <td>${v.barrio || ""}</td>
          <td>${puestoNombre}</td>
          <td>${v.tipo?.nombre || ""}</td>
          <td>${pago}</td>
          <td>${new Date(v.createdAt).toLocaleDateString()}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
  });

  html += `</body></html>`;
  return html;
}

export const exportPdfPorPrograma = async (req, res) => {
  try {
    const where = buildWhereByRole(req.user);
    const formato = req.query.formato || "carta";

    const pdfSize = formato === "oficio"
      ? { width: "216mm", height: "340mm" }
      : { format: "A4" };

    // 🔹 Traer todas las votaciones
    const votaciones = await prisma.votacion.findMany({
      where,
      include: {
        leader: { select: { name: true } },
        tipo: { select: { nombre: true } },
        programa: { select: { nombre: true } },
        digitador: { select: { username: true } },
        recommendedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // 🔹 Traer todos los puestos y generar map
    const puestosDb = await prisma.puestoVotacion.findMany({ select: { id: true, puesto: true } });
    const puestosMap = Object.fromEntries(puestosDb.map(p => [p.id, p.puesto]));

    // 🔹 Agrupar por programa
    const programas = {};
    votaciones.forEach(v => {
      const nombrePrograma = v.programa?.nombre || "SIN_PROGRAMA";
      if (!programas[nombrePrograma]) programas[nombrePrograma] = { nombre: nombrePrograma, votaciones: [] };
      programas[nombrePrograma].votaciones.push(v);
    });
    const programasArray = Object.values(programas);

    const html = generarHtmlReportePorPrograma(programasArray, puestosMap);

    // 🔹 Crear PDF
    const browser = await launchBrowser({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      ...pdfSize,
      landscape: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<span></span>`,
      footerTemplate: `
        <div style="width:100%; font-size:9px; text-align:center; padding:5px 0;">
          Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      `,
      margin: { top: "15mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=reporte_por_programa.pdf");
    res.end(pdf);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const exportZipPorPrograma = async (req, res) => {
  try {
    const where = buildWhereByRole(req.user);
    const formato = req.query.formato || "carta";
    const pdfSize = formato === "oficio"
      ? { width: "216mm", height: "340mm" }
      : { format: "A4" };

    const votaciones = await prisma.votacion.findMany({
      where,
      include: {
        leader: { select: { name: true } },
        tipo: { select: { nombre: true } },
        programa: { select: { nombre: true } },
        digitador: { select: { username: true } },
        recommendedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const puestosDb = await prisma.puestoVotacion.findMany({ select: { id: true, puesto: true } });
    const puestosMap = Object.fromEntries(puestosDb.map(p => [p.id, p.puesto]));

    // Agrupar por programa
    const programas = {};
    votaciones.forEach(v => {
      const nombrePrograma = v.programa?.nombre || "SIN_PROGRAMA";
      if (!programas[nombrePrograma]) programas[nombrePrograma] = { nombre: nombrePrograma, votaciones: [] };
      programas[nombrePrograma].votaciones.push(v);
    });
    const programasArray = Object.values(programas);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=reportes_por_programa.zip");

    const archive = archiver("zip");
    archive.pipe(res);

    const browser = await launchBrowser({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });

    for (const programa of programasArray) {
      if (!programa.votaciones.length) continue;

      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      page.setDefaultTimeout(0);

      const html = generarHtmlReportePorPrograma([programa], puestosMap);
      await page.setContent(html);

      const pdfUint8 = await page.pdf({
        ...pdfSize,
        landscape: true,
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `<span></span>`,
        footerTemplate: `
          <div style="width:100%; font-size:9px; text-align:center;">
            Página <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
        `,
        margin: { top: "15mm", bottom: "20mm", left: "15mm", right: "15mm" },
      });

      await page.close();

      archive.append(Buffer.from(pdfUint8), {
        name: `reporte_programa_${programa.nombre.replace(/\s+/g, "_").toLowerCase()}.pdf`,
      });
    }

    await browser.close();
    await archive.finalize();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== EXPORT EXCEL ====================
export const exportExcelPorPrograma = async (req, res) => {
  try {
    const where = buildWhereByRole(req.user);

    const votaciones = await prisma.votacion.findMany({
      where,
      include: {
        leader: { select: { name: true } },
        tipo: { select: { nombre: true } },
        programa: { select: { nombre: true } },
        digitador: { select: { username: true } },
        recommendedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // 🔹 Traer todos los puestos
    const puestosDb = await prisma.puestoVotacion.findMany({ select: { id: true, puesto: true } });
    const puestosMap = Object.fromEntries(puestosDb.map(p => [p.id, p.puesto]));

    // Agrupar por programa
    const programas = {};
    votaciones.forEach(v => {
      const nombrePrograma = v.programa?.nombre || "SIN_PROGRAMA";
      if (!programas[nombrePrograma]) programas[nombrePrograma] = { nombre: nombrePrograma, votaciones: [] };
      programas[nombrePrograma].votaciones.push(v);
    });
    const programasArray = Object.values(programas);

    // Preparar filas
    const rows = [];
    programasArray.forEach(programa => {
      programa.votaciones.forEach(v => {
        const nombreCompleto = `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();
        const pago = v.tipo?.nombre === "CORAZÓN" ? "NO" : "SI";

        rows.push({
          Programa: programa.nombre,
          Lider: v.leader?.name || "",
          Cedula: v.cedula || "",
          NombreCompleto: nombreCompleto,
          Telefono: v.telefono || "",
          Barrio: v.barrio || "",
          Puesto: puestosMap[v.puestoVotacion] || "SIN_PUESTO",
          Tipo: v.tipo?.nombre || "",
          Pago: pago,
          FechaRegistro: v.createdAt ? new Date(v.createdAt).toLocaleDateString("es-CO") : "",
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Votaciones");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=reporte_votaciones_por_programa.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.end(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};




export const previewPorLider = async (req, res) => {
  try {
    const where = buildWhereByRole(req.user);

    // Traer líderes activos con sus votaciones
    const lideres = await prisma.leader.findMany({
      where: { isActive: true },
      include: {
        votaciones: {
          where,
          include: {
            tipo: { select: { nombre: true } },
            programa: { select: { nombre: true } },
            sede: { select: { nombre: true } },
            digitador: { select: { username: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Construir HTML
    let html = `<html><head>
      <title>Vista previa por líder</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { margin-top: 40px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
        th { background: #eee; }
      </style>
    </head><body>`;
    
    for (const lider of lideres) {
      if (!lider.votaciones.length) continue;

      html += `<h2>Líder: ${lider.name} (Votantes: ${lider.votaciones.length})</h2>`;
      html += `<table>
        <tr>
          <th>Cédula</th>
          <th>Nombre</th>
          <th>Programa</th>
          <th>Tipo</th>
          <th>Pago</th>
          <th>Digitador</th>
          <th>Fecha</th>
        </tr>`;

      for (const v of lider.votaciones) {
        const nombreCompleto = `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();
        const pago = v.tipo?.nombre === "CORAZÓN" ? "NO" : "SI";

        html += `<tr>
          <td>${v.cedula}</td>
          <td>${nombreCompleto}</td>
          <td>${v.programa?.nombre || ""}</td>
          <td>${v.tipo?.nombre || ""}</td>
          <td>${pago}</td>
          <td>${v.digitador?.username || ""}</td>
          <td>${formatDate(v.createdAt)}</td>
        </tr>`;
      }

      html += `</table>`;
    }

    html += `</body></html>`;

    res.setHeader("Content-Type", "text/html");
    res.send(html);

  } catch (error) {
    console.error("❌ Error en previewPorLider:", error);
    res.status(500).send(`Error: ${error.message}`);
  }
};