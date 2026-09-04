const DocumentosModule = (() => {

  let logoBase64 = null;
  let iniciado = false;

  async function loadLogo() {
    try {
      const response = await fetch('/img/logo.jpg');
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Error loading logo:", e);
      return null;
    }
  }

  async function init() {
    if (!iniciado) {
      document.getElementById('doc-fecha').value = Utils.today();
      Toast.show('Cargando recursos del generador...', 'info');
      logoBase64 = await loadLogo();
      iniciado = true;
    }
  }

  async function generarDocumento() {
    const tipo = document.getElementById('doc-tipo').value;
    const destinatario = document.getElementById('doc-destinatario').value || 'A quien pueda interesar';
    const tituloOpt = document.getElementById('doc-titulo').value || '';
    
    Toast.show('Generando documento Word...', 'info');

    const { Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, AlignmentType, VerticalAlign, DocumentTitle, PageNumber, PageNumberFormat } = docx;

    let empresa = document.getElementById('a-empresa')?.value || 'Inversiones Tamanaco, C.A.';
    let rif = document.getElementById('a-rif')?.value || 'J-12345678-9';

    // Image data (strip the data:image/jpeg;base64, prefix)
    let imageData = null;
    if (logoBase64) {
      imageData = Uint8Array.from(atob(logoBase64.split(',')[1]), c => c.charCodeAt(0));
    }

    // --- Definición del Encabezado (Header) ---
    let headerChildren = [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: empresa, bold: true, size: 28, color: "000000" }),
          new TextRun({ text: `\nRIF: ${rif}`, size: 20, color: "555555" })
        ]
      }),
      new Paragraph({
        text: "___________________________________________________________________________",
        alignment: AlignmentType.CENTER,
        style: "normal"
      })
    ];

    // Si hay logo, lo metemos en el header a la izquierda con floating
    if (imageData) {
       headerChildren.unshift(new Paragraph({
          children: [
             new ImageRun({
                 data: imageData,
                 transformation: { width: 100, height: 100 },
                 floating: {
                     horizontalPosition: { offset: 1014400 }, // Aprox margin left
                     verticalPosition: { offset: 1014400 },
                     wrap: { type: docx.TextWrappingType.SQUARE }
                 }
             })
          ]
       }));
       
       // Marca de agua (Watermark)
       headerChildren.push(new Paragraph({
          children: [
             new ImageRun({
                 data: imageData,
                 transformation: { width: 400, height: 400 },
                 floating: {
                     horizontalPosition: { align: docx.HorizontalPositionAlign.CENTER },
                     verticalPosition: { align: docx.VerticalPositionAlign.CENTER },
                     wrap: { type: docx.TextWrappingType.NONE }, // Behind text
                 }
             })
          ]
       }));
    }

    // --- Definición del Cuerpo Principal ---
    let bodyChildren = [];
    
    bodyChildren.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 800, after: 400 },
      children: [
        new TextRun({ text: `Fecha: ${Utils.formatDate(document.getElementById('doc-fecha').value)}`, size: 24 })
      ]
    }));

    if (tituloOpt) {
      bodyChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({ text: tituloOpt, bold: true, size: 32 })
        ]
      }));
    }

    bodyChildren.push(new Paragraph({
      spacing: { after: 400 },
      children: [
        new TextRun({ text: "Señor(es),", bold: true, size: 24 }),
        new TextRun({ text: destinatario, bold: true, size: 24, break: 1 })
      ]
    }));

    // Plantillas de texto
    let parrafoBase = "";
    if (tipo === "CONSTANCIA") {
      parrafoBase = "Por medio de la presente hacemos constar que el ciudadano(a) titular de la Cédula de Identidad Nro. [CÉDULA], presta sus servicios en esta empresa desde el [FECHA], ocupando actualmente el cargo de [CARGO].";
    } else if (tipo === "COTIZACION") {
      parrafoBase = "Atendiendo a su amable solicitud, nos complace presentar la siguiente cotización por nuestros productos y servicios:";
    }

    bodyChildren.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({ text: parrafoBase, size: 24 })
      ]
    }));
    
    // Espacio para rellenar
    bodyChildren.push(new Paragraph({ text: "", spacing: { after: 2000 } }));

    // Despedida
    bodyChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 800 },
      children: [
        new TextRun({ text: "Atentamente,", size: 24 }),
        new TextRun({ text: "___________________________", size: 24, break: 3 }),
        new TextRun({ text: "La Gerencia", bold: true, size: 24, break: 1 }),
        new TextRun({ text: empresa, size: 24, break: 1 })
      ]
    }));

    const doc = new Document({
      sections: [{
        properties: {},
        headers: {
          default: new Header({ children: headerChildren })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Dirección: Av. Principal, Edificio Empresarial, Piso 1.  |  Teléfono: +58 412 1234567", size: 16, color: "888888" })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Página ", size: 16, color: "888888" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "888888" }),
                  new TextRun({ text: " de ", size: 16, color: "888888" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "888888" })
                ]
              })
            ]
          })
        },
        children: bodyChildren
      }]
    });

    try {
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Documento_${tipo}_${Utils.today()}.docx`);
      Toast.show('Documento descargado con éxito', 'success');
    } catch (err) {
      console.error(err);
      alert('Error: ' + err.message);
      Toast.show('Error al generar el documento', 'error');
    }
  }

  return { init, generarDocumento };
})();
