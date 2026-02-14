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
