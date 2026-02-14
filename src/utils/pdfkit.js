import PDFDocument from "pdfkit";

export const generarPdfCedulasDuplicadas = (duplicadas) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 15,
      });

      // Encabezado
      doc.fontSize(16).font("Helvetica-Bold").text("Cédulas Duplicadas – Auditoría", { align: "center" });
      doc.moveDown();

      if (duplicadas.length === 0) {
        doc.fontSize(12).text("No se encontraron cédulas duplicadas.", { align: "center" });
        doc.end();
        resolve(doc);
        return;
      }

      // Tabla
      doc.fontSize(9).font("Helvetica");

      const pageHeight = doc.page.height;
      const pageWidth = doc.page.width;
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;

      // Ancho de columnas
      const colWidths = {
        cedula: 80,
        nombre: 100,
        registrada: 120,
        duplicada: maxWidth - (80 + 100 + 120),
      };

      const tableTop = doc.y + 10;
      const rowHeight = 20;

      // Encabezados de tabla
      const headerY = doc.y;
      doc.rect(margin, headerY, maxWidth, rowHeight).stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("Cédula", margin + 5, headerY + 4, { width: colWidths.cedula, truncate: false })
        .text("Nombre", margin + colWidths.cedula + 5, headerY + 4, {
          width: colWidths.nombre,
          truncate: false,
        })
        .text("Registrada primero", margin + colWidths.cedula + colWidths.nombre + 5, headerY + 4, {
          width: colWidths.registrada,
          truncate: false,
        })
        .text("Duplicada por", margin + colWidths.cedula + colWidths.nombre + colWidths.registrada + 5, headerY + 4, {
          width: colWidths.duplicada,
          truncate: false,
        });

      doc.font("Helvetica");

      let currentY = headerY + rowHeight;

      // Filas de datos
      duplicadas.forEach((d) => {
        // Verificar si hay espacio en la página
        if (currentY + rowHeight * 2 > pageHeight - 20) {
          doc.addPage();
          currentY = 30;
        }

        // Altura dinámica según contenido
        const duplicadosText = d.duplicados
          .map((x) => `${x.lider} (${new Date(x.fecha).toLocaleString("es-CO")})`)
          .join("\n");

        const estimatedHeight = Math.max(
          30,
          doc.heightOfString(duplicadosText, {
            width: colWidths.duplicada - 10,
          }) + 10
        );

        // Dibujar fila
        doc.rect(margin, currentY, maxWidth, estimatedHeight).stroke();

        // Contenido de celdas
        doc
          .fontSize(8)
          .text(d.cedula || "", margin + 5, currentY + 5, { width: colWidths.cedula - 10, truncate: true, ellipsis: true })
          .text(d.nombre || "", margin + colWidths.cedula + 5, currentY + 5, {
            width: colWidths.nombre - 10,
            truncate: true,
            ellipsis: true,
          })
          .text(
            `${d.primerLider}\n${new Date(d.fechaPrimerRegistro).toLocaleString("es-CO")}`,
            margin + colWidths.cedula + colWidths.nombre + 5,
            currentY + 5,
            {
              width: colWidths.registrada - 10,
              truncate: false,
            }
          )
          .text(duplicadosText, margin + colWidths.cedula + colWidths.nombre + colWidths.registrada + 5, currentY + 5, {
            width: colWidths.duplicada - 10,
            truncate: false,
          });

        currentY += estimatedHeight;
      });

      // Pie de página
      doc.fontSize(8).text(`Generado: ${new Date().toLocaleString("es-CO")}`, margin, pageHeight - 30, {
        align: "center",
      });

      doc.end();
      resolve(doc);
    } catch (error) {
      reject(error);
    }
  });
};
