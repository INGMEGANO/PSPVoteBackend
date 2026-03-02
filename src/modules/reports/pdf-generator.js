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
        const columnas = ["#", "Cédula", "Nombre", "Teléfono", "Dirección", "Barrio", "Puesto", "Programa", "Fecha"];
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

export const generarPdfPorLiderSinBloqueoCedulas = (liderData, puestosMap, formato = "A4") => {
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

        // 🔥 FILTRAR VOTACIONES SIN CÉDULAS BLOQUEADAS
        const votacionesFiltradas = lider.votaciones.filter(v => !v.cedulaBloqueada);

        if (votacionesFiltradas.length === 0) return;

        if (idx > 0) doc.addPage();

        // Encabezado del líder
        doc.fontSize(16).font("Helvetica-Bold").text(`Líder: ${lider.name}`, { align: "center" });
        doc.fontSize(10).font("Helvetica");
        doc.text(`Recomendado por: ${votacionesFiltradas[0]?.recommendedBy?.name || "N/A"}`);
        doc.text(`Digitador: ${votacionesFiltradas[0]?.digitador?.username || "N/A"}`);
        doc.moveDown();

        const columnas = ["#", "Cédula", "Nombre", "Teléfono", "Dirección", "Barrio", "Puesto", "Programa", "Fecha"];
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

        // Datos filtrados
        doc.fontSize(6).font("Helvetica");

        votacionesFiltradas.forEach((v, i) => {

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
        const columnas = ["#", "Cédula", "Nombre", "Líder", "Puesto", "Fecha"];
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
        const columnas = ["#", "Cédula", "Nombre", "Líder", "Puesto", "Fecha"];
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
 * 🎓 Genera PDF General
 */

export const generarPdfReporteGeneral = (votaciones, puestosMap, formato = "A4") => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: formato === "oficio" ? [612, 792] : "A4",
        margin: 15,
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Encabezado
      doc.fontSize(16).font("Helvetica-Bold").text("Reporte General de Votaciones", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica");

      // Columnas
      const columnas = [
        "#", "Cédula", "Nombre", "Teléfono", "Dirección", 
        "Barrio", "Puesto", "Programa", "Fecha"
      ];

      const pageWidth = doc.page.width;
      const colWidth = (pageWidth - 30) / columnas.length;
      const rowHeight = 18;
      let currentY = doc.y;

      // Encabezado de tabla
      doc.fontSize(7).font("Helvetica-Bold");
      columnas.forEach((col, i) => {
        doc.text(col, 15 + i * colWidth, currentY, { width: colWidth - 2, align: "center", truncate: true });
      });
      currentY += rowHeight;

      // Datos
      doc.fontSize(6).font("Helvetica");
      votaciones.forEach((v, idx) => {
        if (currentY + rowHeight > doc.page.height - 20) {
          doc.addPage();
          currentY = 15;
        }

        const nombre = `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();
        const puesto = puestosMap[v.puestoVotacion] || "SIN PUESTO";

        const datosFila = [
          idx + 1,
          v.cedula || "",
          nombre,
          v.telefono || "",
          v.direccion || "",
          v.barrio || "",
          puesto,
          v.programa?.nombre || "",
          
          new Date(v.createdAt).toLocaleDateString("es-CO"),
        ];

        datosFila.forEach((dato, i) => {
          doc.text(String(dato).substring(0, 15), 15 + i * colWidth, currentY, {
            width: colWidth - 2,
            align: "center",
            truncate: true,
          });
        });

        currentY += rowHeight;
      });

      // Pie de página
      doc.fontSize(7).text(`Generado: ${new Date().toLocaleString("es-CO")}`, 15, doc.page.height - 20, {
        align: "center",
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};


/**
 * 🎓 Genera PDF por cedulas
 */

export const generarPdfCedulas = (votaciones, puestosMap, modo = "cedulas") => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 15,
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Encabezado
      doc.fontSize(16).font("Helvetica-Bold").text(`Reporte de Cédulas - ${modo.toUpperCase()}`, {
        align: "center",
      });
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica");

      // Columnas
      const columnas = [
        "#", "Cédula", "Nombre completo", "Puesto", "Programa"
      ];

      const pageWidth = doc.page.width;
      const colWidth = (pageWidth - 30) / columnas.length;
      const rowHeight = 18;
      let currentY = doc.y;

      // Encabezado de tabla
      doc.fontSize(8).font("Helvetica-Bold");
      columnas.forEach((col, i) => {
        doc.text(col, 15 + i * colWidth, currentY, { width: colWidth - 2, align: "center", truncate: true });
      });
      currentY += rowHeight;

      // Datos
      doc.fontSize(7).font("Helvetica");
      votaciones.forEach((v, idx) => {
        if (currentY + rowHeight > doc.page.height - 20) {
          doc.addPage();
          currentY = 15;
        }

        const nombre = `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();
        const puesto = puestosMap[v.puestoVotacion] || "SIN PUESTO";

        const datosFila = [
          idx + 1,
          v.cedula || "",
          nombre,
          puesto,
          v.programa?.nombre || "",
          
        ];

        datosFila.forEach((dato, i) => {
          doc.text(String(dato).substring(0, 20), 15 + i * colWidth, currentY, {
            width: colWidth - 2,
            align: "center",
            truncate: true,
          });
        });

        currentY += rowHeight;
      });

      // Pie de página
      doc.fontSize(7).text(`Generado: ${new Date().toLocaleString("es-CO")}`, 15, doc.page.height - 20, {
        align: "center",
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 🎓 Genera PDF Confirmados
 */


export const generarPdfConfirmados = (votaciones, puestosMap) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 15,
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Encabezado
      doc.fontSize(16).font("Helvetica-Bold").text("Reporte de Votaciones Confirmadas", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica");

      // Columnas
      const columnas = [
        "#", "Cédula", "Nombre completo", "Puesto", "Líder", "Digitador", "Confirmado Por", "Fecha"
      ];
      const pageWidth = doc.page.width;
      const colWidth = (pageWidth - 30) / columnas.length;
      const rowHeight = 18;
      let currentY = doc.y;

      // Encabezado de tabla
      doc.fontSize(8).font("Helvetica-Bold");
      columnas.forEach((col, i) => {
        doc.text(col, 15 + i * colWidth, currentY, { width: colWidth - 2, align: "center", truncate: true });
      });
      currentY += rowHeight;

      // Datos
      doc.fontSize(7).font("Helvetica");
      votaciones.forEach((v, idx) => {
        if (currentY + rowHeight > doc.page.height - 20) {
          doc.addPage();
          currentY = 15;
        }

        const nombre = `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();
        const puesto = puestosMap[v.puestoVotacion] || "SIN PUESTO";
        const confirmadoPor = v.confirmacion?.confirmadoPor?.username || "N/A";

        const datosFila = [
          idx + 1,
          v.cedula || "",
          nombre,
          puesto,
          v.leader?.name || "N/A",
          v.digitador?.username || "N/A",
          confirmadoPor,
          new Date(v.createdAt).toLocaleDateString("es-CO"),
        ];

        datosFila.forEach((dato, i) => {
          doc.text(String(dato).substring(0, 15), 15 + i * colWidth, currentY, {
            width: colWidth - 2,
            align: "center",
            truncate: true,
          });
        });

        currentY += rowHeight;
      });

      // Pie de página
      doc.fontSize(7).text(`Generado: ${new Date().toLocaleString("es-CO")}`, 15, doc.page.height - 20, {
        align: "center",
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};


export const generarPdfReportePorBarrio = (votaciones, puestosMap, formato = "A4") => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: formato === "oficio" ? [612, 792] : "A4",
        margin: 15,
      });

      const chunks = [];
      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // 🔹 Ordenar por barrio, tipo y programa
      votaciones.sort((a, b) => {
        const barrioA = a.barrio || "";
        const barrioB = b.barrio || "";
        if (barrioA !== barrioB) return barrioA.localeCompare(barrioB);

        const tipoA = a.tipo?.nombre || "";
        const tipoB = b.tipo?.nombre || "";
        if (tipoA !== tipoB) return tipoA.localeCompare(tipoB);

        const progA = a.programa?.nombre || "";
        const progB = b.programa?.nombre || "";
        return progA.localeCompare(progB);
      });

      // 🔹 Agrupar solo por barrio
      const agrupado = {};
      votaciones.forEach(v => {
        const barrio = v.barrio || "SIN BARRIO";
        if (!agrupado[barrio]) agrupado[barrio] = [];
        agrupado[barrio].push(v);
      });

      doc.fontSize(16).font("Helvetica-Bold")
        .text("Reporte por Barrio", { align: "center" });

      const columnas = [
        "#", "Cédula", "Nombre", "Dirección", "Programa", "Tipo", "Puesto"
      ];

      const pageWidth = doc.page.width;
      const colWidth = (pageWidth - 30) / columnas.length;
      const rowHeight = 18;

      Object.keys(agrupado).forEach(barrio => {

        doc.addPage();

        doc.fontSize(14).font("Helvetica-Bold")
          .text(`Barrio: ${barrio}`);

        let currentY = doc.y + 10;

        // Header tabla
        doc.fontSize(8).font("Helvetica-Bold");
        columnas.forEach((col, i) => {
          doc.text(col, 15 + i * colWidth, currentY, {
            width: colWidth - 2,
            align: "center",
            truncate: true
          });
        });

        currentY += rowHeight;
        doc.font("Helvetica").fontSize(7);

        agrupado[barrio].forEach((v, idx) => {

          if (currentY + rowHeight > doc.page.height - 20) {
            doc.addPage();
            currentY = 20;
          }

          const nombre = `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();
          const puesto = puestosMap[v.puestoVotacion] || "SIN PUESTO";

          const fila = [
            idx + 1,
            v.cedula || "",
            nombre,
            v.direccion || "",
            v.programa?.nombre || "",
            v.tipo?.nombre || "SIN TIPO",
            puesto
          ];

          fila.forEach((dato, i) => {

  const texto = String(dato).substring(0, 25);

  const posX = 15 + i * colWidth;

  // 🔥 Columna "Tipo" es índice 5
  if (i === 5 && texto.toUpperCase() === "CORAZÓN") {

    doc.fillColor("red")
       .font("Helvetica-Bold")
       .text(texto, posX, currentY, {
          width: colWidth - 2,
          align: "center",
          truncate: true
       });

    // Reset
    doc.fillColor("black").font("Helvetica");

  } else {

    doc.fillColor("black")
       .font("Helvetica")
       .text(texto, posX, currentY, {
          width: colWidth - 2,
          align: "center",
          truncate: true
       });
  }
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



export const generarPdfReportePorSede = (
  votaciones,
  puestosMap,
  sedeNombre,
  formato = "A4"
) => {
  return new Promise((resolve, reject) => {
    try {

      const esOficio = formato?.toLowerCase().trim() === "oficio";

      const doc = new PDFDocument({
        size: esOficio ? [612, 1008] : "A4",
        layout: esOficio ? "landscape" : "portrait",
        margin: esOficio ? 40 : 30,
      });

      const chunks = [];
      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", err => reject(err));

      // 🔹 Ordenar por tipo y líder
      votaciones.sort((a, b) => {
        const tipoA = a.tipo?.nombre || "";
        const tipoB = b.tipo?.nombre || "";
        if (tipoA !== tipoB) return tipoA.localeCompare(tipoB);

        const liderA = a.leader?.name || "";
        const liderB = b.leader?.name || "";
        return liderA.localeCompare(liderB);
      });

      const rowHeight = esOficio ? 24 : 18;

      doc
        .fontSize(esOficio ? 18 : 16)
        .font("Helvetica-Bold")
        .text(`REPORTE POR SEDE: ${sedeNombre}`, {
          align: "center",
        });

      doc.moveDown(1.5);

      const columnas = [
        "#",
        "Cédula",
        "Nombre",
        "Dirección",
        "Barrio",
        "Programa",
        "Tipo",
        "Puesto",
      ];

      const usableWidth =
        doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right;

      let colWidths;

      if (esOficio) {
        colWidths = [
          usableWidth * 0.05,
          usableWidth * 0.10,
          usableWidth * 0.15,
          usableWidth * 0.15,
          usableWidth * 0.10,
          usableWidth * 0.10,
          usableWidth * 0.15,
          usableWidth * 0.20,
        ];
      } else {
        const equal = usableWidth / columnas.length;
        colWidths = Array(columnas.length).fill(equal);
      }

      let currentY = doc.y;
      let liderActual = null;
      let contador = 0;

      const dibujarEncabezado = () => {
        let x = doc.page.margins.left;

        doc.fontSize(esOficio ? 10 : 9).font("Helvetica-Bold");

        columnas.forEach((col, i) => {
          doc.text(col, x, currentY, {
            width: colWidths[i] - 4,
            align: "center",
          });
          x += colWidths[i];
        });

        currentY += rowHeight;
        doc.font("Helvetica").fontSize(esOficio ? 9 : 8);
      };

      dibujarEncabezado();

      votaciones.forEach((v) => {

        if (liderActual !== v.leader?.name) {

          if (currentY + rowHeight > doc.page.height - 40) {
            doc.addPage();
            currentY = doc.page.margins.top;
            dibujarEncabezado();
          }

          liderActual = v.leader?.name || "SIN LIDER";

          doc
            .fontSize(esOficio ? 11 : 10)
            .font("Helvetica-Bold")
            .text(`LÍDER: ${liderActual}`, doc.page.margins.left, currentY);

          currentY += rowHeight;
          doc.font("Helvetica").fontSize(esOficio ? 9 : 8);
        }

        if (currentY + rowHeight > doc.page.height - 40) {
          doc.addPage();
          currentY = doc.page.margins.top;
          dibujarEncabezado();
        }

        contador++;

        const nombreCompleto =
          `${v.nombre1} ${v.nombre2 || ""} ${v.apellido1} ${v.apellido2 || ""}`.trim();

        const fila = [
          contador,
          v.cedula || "",
          nombreCompleto,
          v.direccion || "",
          v.barrio || "",
          v.programa?.nombre || "",
          v.tipo?.nombre || "SIN TIPO",
          puestosMap[v.puestoVotacion] || "SIN PUESTO",
        ];

        let x = doc.page.margins.left;

        fila.forEach((dato, i) => {

          const texto = String(dato).substring(0, esOficio ? 60 : 40);

          // 🔥 Si es la columna "Tipo" (posición 6) y dice CORAZÓN
          if (i === 6 && texto.toUpperCase() === "CORAZÓN") {

            doc.fillColor("red")
              .font("Helvetica-Bold")
              .text(texto, x, currentY, {
                  width: colWidths[i] - 4,
                  align: "center",
              });

            // 🔄 Resetear para que no afecte lo demás
            doc.fillColor("black")
              .font("Helvetica");

          } else {

            doc.fillColor("black")
              .font("Helvetica")
              .text(texto, x, currentY, {
                  width: colWidths[i] - 4,
                  align: "center",
              });
          }

          x += colWidths[i];
        });


        currentY += rowHeight;
      });

      doc.moveDown(2);

      doc
        .fontSize(esOficio ? 12 : 11)
        .font("Helvetica-Bold")
        .text(`TOTAL REGISTROS: ${votaciones.length}`, {
          align: "right",
        });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};


