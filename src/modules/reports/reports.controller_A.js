import prisma from "../../prisma.js";
import { buildWhereByRole } from "./reports.utils.js";
import { generarPdfCedulasDuplicadas } from "../../utils/pdfkit.js";

export const exportPdfCedulasDuplicadasAuditoria = async (req, res) => {
  try {
    const where = buildWhereByRole(req.user);

    const votaciones = await prisma.votacion.findMany({
      where,
      select: {
        cedula: true,
        nombre1: true,
        nombre2: true,
        apellido1: true,
        apellido2: true,
        createdAt: true,
        leader: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const duplicadasMap = {};

    votaciones.forEach(v => {
      const cedula = v.cedula?.toString().trim();
      if (!cedula) return;

      if (!duplicadasMap[cedula]) {
        duplicadasMap[cedula] = {
          cedula,
          nombre: `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim(),
          registros: [],
        };
      }

      duplicadasMap[cedula].registros.push({
        lider: v.leader?.name || "SIN_LÍDER",
        fecha: v.createdAt,
      });
    });

    const duplicadas = Object.values(duplicadasMap)
      .filter(d => d.registros.length > 1)
      .map(d => {
        const [primero, ...duplicados] = d.registros;
        return {
          cedula: d.cedula,
          nombre: d.nombre,
          primerLider: primero.lider,
          fechaPrimerRegistro: primero.fecha,
          duplicados,
        };
      });

    // 🔹 DEBUG: ver cuántos duplicados hay
    console.log("Duplicados encontrados:", duplicadas.length);

    const doc = await generarPdfCedulasDuplicadas(duplicadas);

    // Capturar el PDF en un buffer
    const chunks = [];
    
    doc.on("data", (chunk) => {
      chunks.push(chunk);
    });

    doc.on("end", () => {
      const pdf = Buffer.concat(chunks);
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=cedulas_duplicadas_auditoria.pdf"
      );
      res.end(pdf);
    });

    doc.on("error", (error) => {
      console.error("Error generando PDF:", error);
      res.status(500).json({ error: error.message });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
