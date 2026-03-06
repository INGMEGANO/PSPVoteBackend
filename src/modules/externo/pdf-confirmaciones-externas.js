import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";


export const generarPdfConfirmacionesExternas = (data) => {
  return new Promise((resolve, reject) => {

    try {

      const doc = new PDFDocument({
        size: "A4",
        margin: 30
      });

      const chunks = [];

      doc.on("data", chunk => chunks.push(chunk));

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", reject);

      // 🧾 Título
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("Confirmaciones Externas", { align: "center" });

      doc.moveDown(2);

      data.forEach((item) => {

        // si estamos cerca del final de la página
        if (doc.y > doc.page.height - 200) {
          doc.addPage();
        }

        const startY = doc.y;

        const votante = item.votante;
        const lider = item.leader;

        const nombreVotante = votante
          ? `${votante.nombre1} ${votante.nombre2 || ""} ${votante.apellido1} ${votante.apellido2 || ""}`.trim()
          : "N/A";

        const nombreLider = lider?.name || "N/A";

        // 📄 POSICIONES
        const infoX = 30;
        const imageStartX = 300;

        // 📸 tamaño de imágenes
        const imgWidth = 80;
        const imgHeight = 80;
        const gap = 10;

        // 📄 INFORMACIÓN
        doc.fontSize(11).font("Helvetica-Bold")
          .text("Votante:", infoX, startY, { continued: true })
          .font("Helvetica")
          .text(` ${nombreVotante}`);

        doc.font("Helvetica-Bold")
          .text("Cédula:", infoX, doc.y, { continued: true })
          .font("Helvetica")
          .text(` ${item.cedula}`);

        doc.font("Helvetica-Bold")
          .text("Líder:", infoX, doc.y, { continued: true })
          .font("Helvetica")
          .text(` ${nombreLider}`);

        doc.font("Helvetica-Bold")
          .text("Fecha:", infoX, doc.y, { continued: true })
          .font("Helvetica")
          .text(` ${new Date(item.confirmadoEn).toLocaleString("es-CO")}`);

        // 📸 IMÁGENES
        let imgX = imageStartX;
        let imgY = startY;

        if (item.imagenes && item.imagenes.length > 0) {

          item.imagenes.forEach((img) => {

            const imgPath = path.join(
              process.cwd(),
              "uploads",
              "votos",
              img
            );

            if (fs.existsSync(imgPath)) {

              doc.image(imgPath, imgX, imgY, {
                fit: [imgWidth, imgHeight]
              });

              imgX += imgWidth + gap;

              // si se llena la fila pasa a la siguiente
              if (imgX + imgWidth > doc.page.width - 30) {
                imgX = imageStartX;
                imgY += imgHeight + gap;
              }

            }

          });

        } else {

          doc.fontSize(10)
            .text("Sin evidencia", imageStartX, startY);

        }

        // mover cursor debajo del bloque
        doc.y = Math.max(doc.y, imgY + imgHeight) + 20;

        // línea separadora
        doc
          .moveTo(30, doc.y)
          .lineTo(doc.page.width - 30, doc.y)
          .strokeColor("#cccccc")
          .stroke();

        doc.moveDown();

      });

      doc.end();

    } catch (error) {
      reject(error);
    }

  });
};