import PDFDocument from "pdfkit";

/**
 * 📄 Genera PDF genérico con tabla
 */
export const generarPdfConTabla = (titulo, columnas, datos, opciones = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        formato = "A4",
        marginTop = 15,
        marginBottom = 15,
        marginLeft = 10,
        marginRight = 10,
        fontSize = 9,
        headerBg = "#f0f0f0"
      } = opciones;

      const doc = new PDFDocument({
        size: formato === "oficio" ? [612, 792] : "A4",
        margin: marginTop,
      });

      // Encabezado
      doc.fontSize(14).font("Helvetica-Bold").text(titulo, { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(fontSize).font("Helvetica");

      // Tabla
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const colCount = columnas.length;
      const colWidth = (pageWidth - marginLeft - marginRight) / colCount;
      const rowHeight = 20;

      let currentY = doc.y;
      let currentX = marginLeft;

      // Header
      columnas.forEach((col, i) => {
        doc
          .rect(currentX + i * colWidth, currentY, colWidth, rowHeight)
          .fill(headerBg)
          .stroke();

        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .text(col, currentX + i * colWidth + 2, currentY + 5, {
            width: colWidth - 4,
            align: "left",
            truncate: true,
          });
      });

      currentY += rowHeight;

      // Datos
      doc.font("Helvetica");
      datos.forEach((fila, idx) => {
        // Salto de página si es necesario
        if (currentY + rowHeight > pageHeight - marginBottom) {
          doc.addPage();
          currentY = marginTop;
        }

        Object.values(fila).forEach((valor, i) => {
          const text = String(valor).substring(0, 30);
          doc
            .rect(currentX + i * colWidth, currentY, colWidth, rowHeight)
            .stroke();

          doc.fontSize(fontSize).text(text, currentX + i * colWidth + 2, currentY + 5, {
            width: colWidth - 4,
            align: "left",
            truncate: true,
          });
        });

        currentY += rowHeight;
      });

      // Pie de página
      doc
        .fontSize(7)
        .text(`Generado: ${new Date().toLocaleString("es-CO")}`, marginLeft, pageHeight - 20, {
          align: "center",
        });

      doc.end();
      resolve(doc);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 📊 Genera PDF por Líder
 */
export const generarPdfPorLider = (liderData, puestosMap, formato = "A4") => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: formato === "oficio" ? [612, 792] : "A4",
        margin: 15,
      });

      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", (error) => reject(error));

      // Procesar cada líder
      liderData.forEach((lider, idx) => {
        if (idx > 0) doc.addPage();

        // Encabezado del líder
        doc.fontSize(16).font("Helvetica-Bold").text(`Líder: ${lider.name}`, { align: "center" });
        doc.fontSize(10).font("Helvetica");
        doc.text(`Recomendado por: ${lider.votaciones[0]?.recommendedBy?.name || "N/A"}`);
        doc.text(`Digitador: ${lider.votaciones[0]?.digitador?.username || "N/A"}`);
        doc.moveDown();

        // Tabla
        const columnas = ["#", "Cédula", "Nombre", "Teléfono", "Dirección", "Barrio", "Puesto", "Programa", "Tipo", "Fecha"];
        const pageWidth = doc.page.width;
        const colWidth = (pageWidth - 30) / columnas.length;
        const rowHeight = 18;

        let currentY = doc.y;

        // Encabezados
        doc.fontSize(7).font("Helvetica-Bold");
        columnas.forEach((col, i) => {
          doc.text(col, 15 + i * colWidth, currentY, {
            width: colWidth - 2,
            align: "center",
            truncate: true,
          });
        });
        currentY += rowHeight;

        // Datos
        doc.fontSize(6).font("Helvetica");
        lider.votaciones.forEach((v, i) => {
          if (currentY + rowHeight > doc.page.height - 20) {
            doc.addPage();
            currentY = 15;
          }

          const nombre = `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();
          const puesto = puestosMap[v.puestoVotacion] || "SIN PUESTO";
          const datos = [
            i + 1,
            v.cedula || "",
            nombre,
            v.telefono || "",
            v.direccion || "",
            v.barrio || "",
            puesto,
            v.programa?.nombre || "",
            v.tipo?.nombre || "",
            new Date(v.createdAt).toLocaleDateString("es-CO"),
          ];

          datos.forEach((dato, j) => {
            doc.text(String(dato).substring(0, 15), 15 + j * colWidth, currentY, {
              width: colWidth - 2,
              align: "center",
              truncate: true,
            });
          });
          currentY += rowHeight;
        });
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 🏫 Genera PDF por Puesto
 */
/*
export const generarPdfPorPuesto = (puestoData, puestosMap, formato = "A4") => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: formato === "oficio" ? [612, 792] : "A4",
        margin: 15,
      });

      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", (error) => reject(error));

      // Similar al de líder pero por puesto
      puestoData.forEach((puesto, idx) => {
        if (idx > 0) doc.addPage();

        doc.fontSize(16).font("Helvetica-Bold").text(`Puesto: ${puesto.nombre}`, { align: "center" });
        doc.fontSize(10).font("Helvetica");
        doc.text(`Total de votantes: ${puesto.votaciones.length}`);
        doc.moveDown();

        // Tabla simplificada
        const columnas = ["#", "Cédula", "Nombre", "Líder", "Programa", "Tipo", "Fecha"];
        const pageWidth = doc.page.width;
        const colWidth = (pageWidth - 30) / columnas.length;
        const rowHeight = 16;

        let currentY = doc.y;

        doc.fontSize(7).font("Helvetica-Bold");
        columnas.forEach((col, i) => {
          doc.text(col, 15 + i * colWidth, currentY, {
            width: colWidth - 2,
            align: "center",
            truncate: true,
          });
        });
        currentY += rowHeight;

        doc.fontSize(6).font("Helvetica");
        puesto.votaciones.forEach((v, i) => {
          if (currentY + rowHeight > doc.page.height - 20) {
            doc.addPage();
            currentY = 15;
          }

          const nombre = `${v.nombre1} ${v.apellido1}`.trim();
          const datos = [
            i + 1,
            v.cedula || "",
            nombre,
            v.leader?.name || "",
            v.programa?.nombre || "",
            v.tipo?.nombre || "",
            new Date(v.createdAt).toLocaleDateString("es-CO"),
          ];

          datos.forEach((dato, j) => {
            doc.text(String(dato).substring(0, 15), 15 + j * colWidth, currentY, {
              width: colWidth - 2,
              align: "center",
              truncate: true,
            });
          });
          currentY += rowHeight;
        });
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
*/
export const generarPdfPorPuesto = (puestoData, puestosMap, formato = "A4") => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: formato === "oficio" ? [612, 792] : "A4",
        margin: 15,
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (error) => reject(error));

      // Cada puesto
      puestoData.forEach((puesto, idx) => {
        if (idx > 0) doc.addPage();

        doc.fontSize(16).font("Helvetica-Bold").text(`Puesto: ${puesto.puesto}`, { align: "center" });
        doc.fontSize(10).font("Helvetica");
        doc.text(`Total de votantes: ${puesto.votaciones.length}`);
        doc.moveDown();

        // Tabla
        const columnas = ["#", "Cédula", "Nombre", "Líder", "Puesto", "Tipo", "Fecha"];
        const pageWidth = doc.page.width;
        const colWidth = (pageWidth - 30) / columnas.length;
        const rowHeight = 16;
        let currentY = doc.y;

        doc.fontSize(7).font("Helvetica-Bold");
        columnas.forEach((col, i) => {
          doc.text(col, 15 + i * colWidth, currentY, { width: colWidth - 2, align: "center", truncate: true });
        });
        currentY += rowHeight;

        doc.fontSize(6).font("Helvetica");
        puesto.votaciones.forEach((v, i) => {
          if (currentY + rowHeight > doc.page.height - 20) {
            doc.addPage();
            currentY = 15;
          }

          const nombre = `${v.nombre1 || ""} ${v.nombre2 || ""} ${v.apellido1 || ""} ${v.apellido2 || ""}`.trim();
          const nombrePuesto = v.puestoVotacion ? puestosMap[v.puestoVotacion] || "SIN PUESTO" : "SIN PUESTO";

          const datos = [
            i + 1,
            v.cedula || "",
            nombre,
            v.leader?.name || "",
            nombrePuesto,
            v.tipo?.nombre || "",
            v.createdAt ? new Date(v.createdAt).toLocaleDateString("es-CO") : "",
          ];

          datos.forEach((dato, j) => {
            doc.text(String(dato).substring(0, 15), 15 + j * colWidth, currentY, { width: colWidth - 2, align: "center", truncate: true });
          });

          currentY += rowHeight;
        });
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};



/**
 * 🎓 Genera PDF por Programa
 */
export const generarPdfPorPrograma = (programaData, puestosMap, formato = "A4") => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: formato === "oficio" ? [612, 792] : "A4",
        margin: 15,
      });

      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", (error) => reject(error));

      // Procesar cada programa
      programaData.forEach((programa, idx) => {
        if (idx > 0) doc.addPage();

        doc.fontSize(16).font("Helvetica-Bold").text(`Programa: ${programa.nombre}`, { align: "center" });
        doc.fontSize(10).font("Helvetica");
        doc.text(`Total de votantes: ${programa.votaciones.length}`);
        doc.moveDown();

        // Tabla
        const columnas = ["#", "Cédula", "Nombre", "Líder", "Puesto", "Tipo", "Fecha"];
        const pageWidth = doc.page.width;
        const colWidth = (pageWidth - 30) / columnas.length;
        const rowHeight = 16;

        let currentY = doc.y;

        doc.fontSize(7).font("Helvetica-Bold");
        columnas.forEach((col, i) => {
          doc.text(col, 15 + i * colWidth, currentY, {
            width: colWidth - 2,
            align: "center",
            truncate: true,
          });
        });
        currentY += rowHeight;

        doc.fontSize(6).font("Helvetica");
        programa.votaciones.forEach((v, i) => {
          if (currentY + rowHeight > doc.page.height - 20) {
            doc.addPage();
            currentY = 15;
          }

          const nombre = `${v.nombre1} ${v.apellido1}`.trim();
          const puesto = puestosMap[v.puestoVotacion] || "SIN PUESTO";
          const datos = [
            i + 1,
            v.cedula || "",
            nombre,
            v.leader?.name || "",
            puesto,
            v.tipo?.nombre || "",
            new Date(v.createdAt).toLocaleDateString("es-CO"),
          ];

          datos.forEach((dato, j) => {
            doc.text(String(dato).substring(0, 15), 15 + j * colWidth, currentY, {
              width: colWidth - 2,
              align: "center",
              truncate: true,
            });
          });
          currentY += rowHeight;
        });
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
