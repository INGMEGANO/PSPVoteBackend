import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const normalizarCedula = (value) => {
  if (value === null || value === undefined) return null;

  let cedula = "";

  if (typeof value === "object") {
    if (value.text) cedula = value.text;
    else if (value.result) cedula = value.result;
    else if (value.richText) {
      cedula = value.richText.map(rt => rt.text).join("");
    }
  } else {
    cedula = value;
  }

  return String(cedula)
    .replace(/\.0$/, "")
    .replace(/\s+/g, "")
    .trim();
};

export const validarCedulasExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Debe enviar un archivo Excel" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return res.status(400).json({ error: "El Excel no tiene hojas" });
    }

    const headerRow = sheet.getRow(1);
    let colCedula = null;

    headerRow.eachCell((cell, colNumber) => {
      const header = normalizarCedula(cell.value)?.toLowerCase();
      if (header === "cedula") {
        colCedula = colNumber;
      }
    });

    if (!colCedula) {
      return res.status(400).json({ error: "No se encontró la columna CÉDULA" });
    }

    // 👇 Nuevas columnas
    const colCedulaBD = colCedula + 1;
    const colEstado = colCedula + 2;
    const colNombre = colCedula + 3;
    const colLider = colCedula + 4;

    sheet.getRow(1).getCell(colCedulaBD).value = "CEDULA_EN_BD";
    sheet.getRow(1).getCell(colEstado).value = "ESTADO";
    sheet.getRow(1).getCell(colNombre).value = "NOMBRE";
    sheet.getRow(1).getCell(colLider).value = "LIDER";

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const cedulaExcel = normalizarCedula(row.getCell(colCedula).value);

      if (!cedulaExcel) continue;

      const resultado = await prisma.votacion.findFirst({
        where: { cedula: cedulaExcel },
        include: {
          leader: true
        }
      });

      if (resultado) {

        const nombreCompleto = [
          resultado.nombre1,
          resultado.nombre2,
          resultado.apellido1,
          resultado.apellido2
        ].filter(Boolean).join(" ");

        row.getCell(colCedulaBD).value = resultado.cedula;
        row.getCell(colEstado).value = "DUPLICADA";
        row.getCell(colNombre).value = nombreCompleto;
        row.getCell(colLider).value = resultado.leader?.name || "";

      } else {
        row.getCell(colCedulaBD).value = "";
        row.getCell(colEstado).value = "NO EXISTE";
        row.getCell(colNombre).value = "";
        row.getCell(colLider).value = "";
      }
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=cedulas_validadas.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Error procesando el Excel" });
  }
};


export async function importarExcelCedulas(file) {

  const workbook = new ExcelJS.Workbook();

  // 🔥 cargar desde memoria
  await workbook.xlsx.load(file.buffer);

  const worksheet = workbook.worksheets[0];

  const existentesDB = await prisma.cedulaBloqueada.findMany({
    select: { cedula: true }
  });

  const setExistentes = new Set(
    existentesDB.map(e => e.cedula)
  );

  const nuevas = [];

  for (let i = 2; i <= worksheet.rowCount; i++) {

    const row = worksheet.getRow(i);
    const cedulaRaw = row.getCell(1).value;

    if (!cedulaRaw) continue;

    const cedula = String(cedulaRaw)
      .replace(/\./g, "")
      .replace(/-/g, "")
      .trim();

    if (!setExistentes.has(cedula)) {
      nuevas.push({ cedula });
    }
  }

  const chunkSize = 1000;

  for (let i = 0; i < nuevas.length; i += chunkSize) {
    const chunk = nuevas.slice(i, i + chunkSize);

    await prisma.cedulaBloqueada.createMany({
      data: chunk,
      skipDuplicates: true
    });
  }

  return {
    totalExcel: worksheet.rowCount - 1,
    nuevasInsertadas: nuevas.length,
    yaExistian: worksheet.rowCount - 1 - nuevas.length
  };
}

export const importarCedulasController = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ error: "No se subió archivo" });
    }

    // 🔥 CAMBIO AQUÍ
    const resultado = await importarExcelCedulas(req.file);

    return res.json({
      ok: true,
      ...resultado
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error importando Excel" });
  }
};

export const getCedulasBloqueadas = async (req, res) => {
  try {

    // 1️⃣ Traer bloqueadas
    const bloqueadas = await prisma.cedulaBloqueada.findMany({
      orderBy: { createdAt: "desc" }
    });

    const cedulas = bloqueadas.map(b => b.cedula);

    if (!cedulas.length) {
      return res.json([]);
    }

    // 2️⃣ Traer votaciones relacionadas
    const votaciones = await prisma.votacion.findMany({
      where: {
        cedula: { in: cedulas }
      },
      include: {
        leader: { select: { name: true } },
        programa: { select: { nombre: true } },
        tipo: { select: { nombre: true } },
      }
    });

    // 3️⃣ Unir información
    const resultado = bloqueadas.map(b => {

      const voto = votaciones.find(v => v.cedula === b.cedula);

      return {
        id: b.id,
        cedula: b.cedula,
        activa: b.activa,
        override: b.override,
        createdAt: b.createdAt,

        // Datos del votante si existen
        nombre: voto
          ? `${voto.nombre1} ${voto.nombre2 || ""} ${voto.apellido1} ${voto.apellido2 || ""}`.trim()
          : null,

        telefono: voto?.telefono || null,
        direccion: voto?.direccion || null,
        barrio: voto?.barrio || null,
        lider: voto?.leader?.name || null,
        programa: voto?.programa?.nombre || null,
        tipo: voto?.tipo?.nombre || null,
      };
    });

    res.json(resultado);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const toggleCedulaBloqueada = async (req, res) => {
  try {

    const { id } = req.params;

    const cedula = await prisma.cedulaBloqueada.findUnique({
      where: { id }
    });

    if (!cedula) {
      return res.status(404).json({ error: "No encontrada" });
    }

    const actualizada = await prisma.cedulaBloqueada.update({
      where: { id },
      data: {
        activa: !cedula.activa
      }
    });

    res.json(actualizada);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};


export async function importarExcelCedulasConfirmadas(file) {

  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(file.buffer);

  const worksheet = workbook.worksheets[0];

  const existentesDB = await prisma.cedulaConfirmada.findMany({
    select: { cedula: true }
  });

  const setExistentes = new Set(
    existentesDB.map(e => e.cedula)
  );

  const nuevas = [];

  for (let i = 2; i <= worksheet.rowCount; i++) {

    const row = worksheet.getRow(i);
    const cedulaRaw = row.getCell(1).value;

    if (!cedulaRaw) continue;

    const cedula = String(cedulaRaw)
      .replace(/\./g, "")
      .replace(/-/g, "")
      .trim();

    if (!setExistentes.has(cedula)) {
      nuevas.push({ cedula });
    }
  }

  const chunkSize = 1000;

  for (let i = 0; i < nuevas.length; i += chunkSize) {
    const chunk = nuevas.slice(i, i + chunkSize);

    await prisma.cedulaConfirmada.createMany({
      data: chunk,
      skipDuplicates: true
    });
  }

  return {
    totalExcel: worksheet.rowCount - 1,
    nuevasInsertadas: nuevas.length,
    yaExistian: worksheet.rowCount - 1 - nuevas.length
  };
} 

export const importarCedulasConfirmadasController = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ error: "No se subió archivo" });
    }

    const resultado = await importarExcelCedulasConfirmadas(req.file);

    return res.json({
      ok: true,
      ...resultado
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error importando Excel de confirmadas" });
  }
};

import fs from "fs";
import path from "path";
import mysqldump from "mysqldump";

const backupFolder = path.join("backups");
if (!fs.existsSync(backupFolder)) fs.mkdirSync(backupFolder);

export const descargarBackup = async (req, res) => {
  const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;

  if (!DB_USER || !DB_NAME) {
    return res.status(500).json({ error: "Variables de entorno de DB no configuradas." });
  }

  const fecha = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup-${fecha}.sql`;
  const filePath = path.join(backupFolder, fileName);

  try {
    await mysqldump({
      connection: {
        host: DB_HOST || "localhost",
        user: DB_USER,
        password: DB_PASS || "",
        database: DB_NAME, // ⚠ Esto es obligatorio
      },
      dumpToFile: filePath,
    });

    res.download(filePath);
  } catch (err) {
    console.error("Error creando backup:", err);
    res.status(500).json({ error: "Error creando backup" });
  }
};


/**
 * Endpoint para verificar si hay backup reciente (24h)
 */
export const verificarBackup = (req, res) => {
  const lastBackupFile = path.join(backupFolder, "last-backup.txt");

  if (!fs.existsSync(lastBackupFile)) {
    return res.json({ alerta: "⚠ Nunca se ha hecho backup." });
  }

  const fechaGuardada = fs.readFileSync(lastBackupFile, "utf8");
  const ultimaFecha = new Date(fechaGuardada);
  const ahora = new Date();
  const diferenciaHoras = (ahora - ultimaFecha) / (1000 * 60 * 60);

  if (diferenciaHoras > 24) {
    return res.json({ alerta: "⚠ Han pasado más de 24 horas sin hacer backup." });
  }

  res.json({ mensaje: "✅ Backup reciente." });
};


export const crearReporte = async (req, res) => {
  try {
    const { nombre, descripcion, icon, descargas } = req.body;

    const nuevoReporte = await prisma.reporte.create({
      data: {
        nombre,
        descripcion,
        icon,
        descargas: {
          create: descargas
        }
      },
      include: {
        descargas: true
      }
    });

    res.json(nuevoReporte);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const obtenerReportes = async (req, res) => {
  try {

    const reportes = await prisma.reporte.findMany({
      include: {
        descargas: true
      },
      orderBy: {
        id: "asc"
      }
    });

    res.json(reportes);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};