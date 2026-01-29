import prisma from "../../prisma.js"
import { buildWhereByRole, buildDashboardWhere } from "./reports.utils.js"
import { Parser } from 'json2csv';
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import PdfPrinter from "pdfmake";
import pdfMake from "pdfmake/build/pdfmake.js";
import pdfFonts from "pdfmake/build/vfs_fonts.js";
import stream from "stream";
import { fileURLToPath } from "url";

/**
 * 📊 DASHBOARD GENERAL
 */
export const dashboard = async (req, res) => {
  try {
    const where = buildDashboardWhere(req.user, req.query);

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
    let pago = 0;
    let noPago = 0;

    const lideres = {};
    const programas = {};
    const puestos = {};
    const tipos = {};

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

      // 🏫 PUESTO
      const puesto = v.puestoVotacion || 'SIN PUESTO';
      if (!puestos[puesto]) {
        puestos[puesto] = { pago: 0, noPago: 0, total: 0 };
      }
      esCorazon ? puestos[puesto].noPago++ : puestos[puesto].pago++;
      puestos[puesto].total++;

      // 🔖 TIPO
      const tipo = v.tipo?.nombre || 'SIN TIPO';
      tipos[tipo] = (tipos[tipo] || 0) + 1;
    });

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

      // 👤 POR LÍDER (porcentaje sobre total general)
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

      // 🏫 POR PUESTO DE VOTACIÓN
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



pdfMake.vfs = pdfFonts.vfs; 


const formatDate = (date) => date.toISOString().split("T")[0];
const percent = (value, total) => (total ? Number(((value / total) * 100).toFixed(2)) : 0);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const exportPdfPorLider = async (req, res) => {
  try {
    console.log("📌 Inicio exportPdfPorLider");

    const where = buildWhereByRole(req.user);
    console.log("🔹 Where generado:", where);

    // Traer todos los líderes con sus votaciones
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

    console.log(`🔹 Líderes encontrados: ${lideres.length}`);

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
      content: [],
    };

    let totalVotantes = 0;

    for (const lider of lideres) {
      if (!lider.votaciones.length) continue; // omitir líderes sin votantes

      console.log(`🔹 Procesando líder: ${lider.name}, votantes: ${lider.votaciones.length}`);
      totalVotantes += lider.votaciones.length;

      // Header del líder
      docDefinition.content.push({
        text: `Líder: ${lider.name}`,
        style: "header",
        margin: [0, 10, 0, 5],
      });

      // Tabla de votantes
      const tableBody = [
        ["Cédula", "Nombre", "Programa", "Tipo", "Pago", "Digitador", "Fecha"],
      ];

      for (const v of lider.votaciones) {
        const nombreCompleto = `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();
        const pago = v.tipo?.nombre === "CORAZÓN" ? "NO" : "SI";

        tableBody.push([
          v.cedula,
          nombreCompleto,
          v.programa?.nombre || "",
          v.tipo?.nombre || "",
          pago,
          v.digitador?.username || "",
          formatDate(v.createdAt),
        ]);
      }

      docDefinition.content.push({
        table: {
          headerRows: 1,
          widths: ["auto", "*", "*", "auto", "auto", "auto", "auto"],
          body: tableBody,
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 20],
      });
    }

    docDefinition.styles = {
      header: { fontSize: 14, bold: true },
    };

    console.log(`🔹 Total votantes procesados: ${totalVotantes}`);
    console.log("🔹 Generando PDF...");

    // Generar PDF como buffer
    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.getBuffer((buffer) => {
      console.log("🔹 PDF generado, enviando respuesta...");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=por_lider.pdf");
      res.send(Buffer.from(buffer));
    });
  } catch (error) {
    console.error("❌ Error en exportPdfPorLider:", error);
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