import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface WeighingReceiptData {
  folio: string;
  fecha: Date | string;
  tipoUnidad: string;
  clienteProveedor: string;
  tipo: string;
  producto: string;

  // Datos de entrada
  fechaEntrada: Date | string;
  pesoBrutoEntrada: number;
  placaTrailer: string;
  placaRemolque?: string;

  // Datos de salida
  fechaSalida: Date | string;
  pesoBrutoSalida: number;
  pesoTara: number;
  pesoNeto: number;

  // Remolques (para doble remolque)
  remolque1?: {
    placa: string;
    pesoBruto: number;
    pesoTara: number;
    pesoNeto: number;
  };
  remolque2?: {
    placa: string;
    pesoBruto: number;
    pesoTara: number;
    pesoNeto: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class PdfGeneratorService {
  constructor() {}

  /**
   * Genera un PDF con los datos de la operación de pesaje y un código QR
   * El ticket se imprime dos veces en media carta cada uno
   */
  async generateWeighingReceipt(data: WeighingReceiptData): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Generar dos tickets en la misma página (media carta cada uno)
    await this.generateHalfPageTicket(doc, data, 0); // Primera mitad
    await this.generateHalfPageTicket(doc, data, pageHeight / 2); // Segunda mitad

    // Guardar el PDF
    const fileName = `Ticket_${data.folio}_${this.formatDateForFilename(
      new Date()
    )}.pdf`;
    doc.save(fileName);
  }

  /**
   * Genera un ticket en media página
   */
  private async generateHalfPageTicket(
    doc: jsPDF,
    data: WeighingReceiptData,
    startY: number
  ): Promise<void> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const halfPageHeight = doc.internal.pageSize.getHeight() / 2;
    const margin = 10;
    let yPosition = startY + margin;

    // Colores
    const primaryBlue = [41, 98, 255]; // RGB para #2962FF
    const lightGray = [245, 245, 245];
    const borderGray = [220, 220, 220];

    // Función helper para dibujar caja con borde
    const drawBox = (
      x: number,
      y: number,
      width: number,
      height: number,
      fillColor?: number[]
    ) => {
      if (fillColor) {
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        doc.rect(x, y, width, height, 'F');
      }
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.rect(x, y, width, height);
    };

    // Función helper para dibujar badge de placa
    const drawBadge = (
      text: string,
      x: number,
      y: number,
      width: number,
      height: number
    ) => {
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.roundedRect(x, y, width, height, 2, 2, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.roundedRect(x, y, width, height, 2, 2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, x + (width - textWidth) / 2, y + height / 2 + 1.5);
    };

    // ENCABEZADO COMPACTO
    // Línea superior azul
    doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.rect(0, startY, pageWidth, 1.5, 'F');

    // Título y Folio en la misma línea
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text('KIRIU - Ticket de Pesaje', margin, yPosition);

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    const folioText = `Folio: ${data.folio}`;
    const folioWidth = doc.getTextWidth(folioText);
    doc.text(folioText, pageWidth - margin - folioWidth, yPosition);

    yPosition += 5;

    // Fecha
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    const fechaText = `Fecha: ${this.formatDate(data.fecha)}`;
    doc.text(fechaText, margin, yPosition);

    yPosition += 2;

    // Línea separadora
    doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    yPosition += 5;

    // INFORMACIÓN GENERAL (compacta)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);

    // Primera línea: Tipo de Unidad y Movimiento
    doc.text('Tipo:', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(
      this.getTipoUnidadDisplayName(data.tipoUnidad),
      margin + 15,
      yPosition
    );

    doc.setFont('helvetica', 'bold');
    const midPoint = pageWidth / 2;
    doc.text('Movimiento:', midPoint, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 150, 0);
    doc.text('SALIDA', midPoint + 30, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 4;

    // Segunda línea: Cliente/Proveedor y Tipo
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente/Prov:', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clienteProveedor, margin + 30, yPosition);

    doc.setFont('helvetica', 'bold');
    doc.text('Tipo:', midPoint, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(
      data.tipo === 'client' ? 'Cliente' : 'Proveedor',
      midPoint + 15,
      yPosition
    );
    yPosition += 4;

    // Tercera línea: Producto
    doc.setFont('helvetica', 'bold');
    doc.text('Producto:', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.producto, margin + 23, yPosition);
    yPosition += 5;

    // SECCIÓN PLACAS (compacta)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Placas:', margin, yPosition);

    doc.setFont('helvetica', 'normal');
    const placas: string[] = [];
    if (data.tipoUnidad === 'doble-remolque') {
      const trailerPlate = data.placaTrailer;
      const remolque1Plate = data.remolque1?.placa || data.placaRemolque;
      const remolque2Plate = data.remolque2?.placa;

      if (trailerPlate) placas.push(`T:${trailerPlate}`);
      if (remolque1Plate) placas.push(`R1:${remolque1Plate}`);
      if (remolque2Plate) placas.push(`R2:${remolque2Plate}`);
    } else {
      if (data.placaTrailer) placas.push(`T:${data.placaTrailer}`);
      if (data.tipoUnidad === 'remolque' && data.placaRemolque) {
        placas.push(`R:${data.placaRemolque}`);
      }
    }

    const placasText = placas.join(' | ');
    doc.text(placasText, margin + 20, yPosition);
    yPosition += 5;

    const tableX = margin;
    const tableWidth = pageWidth - margin * 2;
    const rowHeight = 5;

    // TABLA COMPACTA DE PESAJE
    const colWidths = [
      tableWidth / 4,
      tableWidth / 4,
      tableWidth / 4,
      tableWidth / 4,
    ];
    const pesoBrutoSalida =
      data.tipoUnidad === 'doble-remolque'
        ? this.getDoubleTrailerExitWeight(data)
        : data.pesoBrutoSalida;

    // Encabezado
    drawBox(tableX, yPosition, colWidths[0], rowHeight, lightGray);
    drawBox(
      tableX + colWidths[0],
      yPosition,
      colWidths[1],
      rowHeight,
      lightGray
    );
    drawBox(
      tableX + colWidths[0] + colWidths[1],
      yPosition,
      colWidths[2],
      rowHeight,
      lightGray
    );
    drawBox(
      tableX + colWidths[0] + colWidths[1] + colWidths[2],
      yPosition,
      colWidths[3],
      rowHeight,
      lightGray
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Hora de entrada', tableX + 1, yPosition + 3.5);
    doc.text('Peso a la entrada', tableX + colWidths[0] + 1, yPosition + 3.5);
    doc.text(
      'Hora de salida',
      tableX + colWidths[0] + colWidths[1] + 1,
      yPosition + 3.5
    );
    doc.text(
      'Peso a la salida',
      tableX + colWidths[0] + colWidths[1] + colWidths[2] + 1,
      yPosition + 3.5
    );
    yPosition += rowHeight;

    // Datos
    drawBox(tableX, yPosition, colWidths[0], rowHeight);
    drawBox(tableX + colWidths[0], yPosition, colWidths[1], rowHeight);
    drawBox(
      tableX + colWidths[0] + colWidths[1],
      yPosition,
      colWidths[2],
      rowHeight
    );
    drawBox(
      tableX + colWidths[0] + colWidths[1] + colWidths[2],
      yPosition,
      colWidths[3],
      rowHeight
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(this.formatDate(data.fechaEntrada), tableX + 1, yPosition + 3.5);
    doc.text(
      `${this.formatWeight(data.pesoBrutoEntrada)} kg`,
      tableX + colWidths[0] + 1,
      yPosition + 3.5
    );
    doc.text(
      this.formatDate(data.fechaSalida),
      tableX + colWidths[0] + colWidths[1] + 1,
      yPosition + 3.5
    );
    doc.text(
      `${this.formatWeight(pesoBrutoSalida)} kg`,
      tableX + colWidths[0] + colWidths[1] + colWidths[2] + 1,
      yPosition + 3.5
    );
    yPosition += rowHeight;

    // Peso Neto
    const netRowHeight = 6;
    drawBox(tableX, yPosition, tableWidth, netRowHeight, lightGray);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Peso Neto', tableX + 2, yPosition + 4);
    doc.setFont('helvetica', 'normal');
    const pesoNetoText = `${this.formatWeight(data.pesoNeto)} kg`;
    const pesoNetoTextWidth = doc.getTextWidth(pesoNetoText);
    doc.text(
      pesoNetoText,
      tableX + tableWidth - pesoNetoTextWidth - 2,
      yPosition + 4
    );
    yPosition += netRowHeight + 4;

    // Sección de remolques deshabilitada para doble remolque
    // No se muestra la tabla de remolques cuando el tipo de unidad es "doble-remolque"
    if (
      data.tipoUnidad === 'doble-remolque' &&
      data.tipoUnidad !== 'doble-remolque' // Condición siempre falsa para deshabilitar la sección
    ) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Remolques:', margin, yPosition);
      yPosition += 4;

      const colWidthsRem = [
        tableWidth / 4,
        tableWidth / 4,
        tableWidth / 4,
        tableWidth / 4,
      ];

      // Encabezado
      drawBox(tableX, yPosition, colWidthsRem[0], rowHeight, lightGray);
      drawBox(
        tableX + colWidthsRem[0],
        yPosition,
        colWidthsRem[1],
        rowHeight,
        lightGray
      );
      drawBox(
        tableX + colWidthsRem[0] + colWidthsRem[1],
        yPosition,
        colWidthsRem[2],
        rowHeight,
        lightGray
      );
      drawBox(
        tableX + colWidthsRem[0] + colWidthsRem[1] + colWidthsRem[2],
        yPosition,
        colWidthsRem[3],
        rowHeight,
        lightGray
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Remolque', tableX + 1, yPosition + 3.5);
      doc.text('Bruto', tableX + colWidthsRem[0] + 1, yPosition + 3.5);
      doc.text(
        'Tara',
        tableX + colWidthsRem[0] + colWidthsRem[1] + 1,
        yPosition + 3.5
      );
      doc.text(
        'Neto',
        tableX + colWidthsRem[0] + colWidthsRem[1] + colWidthsRem[2] + 1,
        yPosition + 3.5
      );
      yPosition += rowHeight;

      // Remolque 1
      if (data.remolque1) {
        drawBox(tableX, yPosition, colWidthsRem[0], rowHeight);
        drawBox(
          tableX + colWidthsRem[0],
          yPosition,
          colWidthsRem[1],
          rowHeight
        );
        drawBox(
          tableX + colWidthsRem[0] + colWidthsRem[1],
          yPosition,
          colWidthsRem[2],
          rowHeight
        );
        drawBox(
          tableX + colWidthsRem[0] + colWidthsRem[1] + colWidthsRem[2],
          yPosition,
          colWidthsRem[3],
          rowHeight
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text('R1', tableX + 1, yPosition + 3.5);
        doc.text(
          this.formatWeight(data.remolque1.pesoBruto),
          tableX + colWidthsRem[0] + 1,
          yPosition + 3.5
        );
        doc.text(
          this.formatWeight(data.remolque1.pesoTara),
          tableX + colWidthsRem[0] + colWidthsRem[1] + 1,
          yPosition + 3.5
        );
        doc.text(
          this.formatWeight(data.remolque1.pesoNeto),
          tableX + colWidthsRem[0] + colWidthsRem[1] + colWidthsRem[2] + 1,
          yPosition + 3.5
        );
        yPosition += rowHeight;
      }

      // Remolque 2
      if (data.remolque2) {
        drawBox(tableX, yPosition, colWidthsRem[0], rowHeight);
        drawBox(
          tableX + colWidthsRem[0],
          yPosition,
          colWidthsRem[1],
          rowHeight
        );
        drawBox(
          tableX + colWidthsRem[0] + colWidthsRem[1],
          yPosition,
          colWidthsRem[2],
          rowHeight
        );
        drawBox(
          tableX + colWidthsRem[0] + colWidthsRem[1] + colWidthsRem[2],
          yPosition,
          colWidthsRem[3],
          rowHeight
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text('R2', tableX + 1, yPosition + 3.5);
        doc.text(
          this.formatWeight(data.remolque2.pesoBruto),
          tableX + colWidthsRem[0] + 1,
          yPosition + 3.5
        );
        doc.text(
          this.formatWeight(data.remolque2.pesoTara),
          tableX + colWidthsRem[0] + colWidthsRem[1] + 1,
          yPosition + 3.5
        );
        doc.text(
          this.formatWeight(data.remolque2.pesoNeto),
          tableX + colWidthsRem[0] + colWidthsRem[1] + colWidthsRem[2] + 1,
          yPosition + 3.5
        );
        yPosition += rowHeight;
      }

      yPosition += 4;
    }

    // CÓDIGO QR COMPACTO
    const qrData = JSON.stringify({
      folio: data.folio,
      fecha: data.fecha,
      tipoUnidad: data.tipoUnidad,
      clienteProveedor: data.clienteProveedor,
      producto: data.producto,
      placaTrailer: data.placaTrailer,
      placaRemolque: data.placaRemolque,
      pesoNeto: data.pesoNeto,
      fechaEntrada: data.fechaEntrada,
      fechaSalida: data.fechaSalida,
    });

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 150,
        margin: 0.5,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // QR más pequeño para media página
      const qrSize = 45; // Aumentado 50% desde 25
      const qrX = (pageWidth - qrSize) / 2;
      doc.addImage(qrCodeDataUrl, 'PNG', qrX, yPosition, qrSize, qrSize);
      yPosition += qrSize + 2;

      // Texto debajo del QR
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      const qrText = 'Escanea el código QR';
      const qrTextWidth = doc.getTextWidth(qrText);
      doc.text(qrText, (pageWidth - qrTextWidth) / 2, yPosition);
      yPosition += 3;
    } catch (error) {
      console.error('Error generando código QR:', error);
    }

    // FOOTER COMPACTO
    const maxFooterY = startY + halfPageHeight - 3;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    const footerText = `Impreso: ${this.formatDate(new Date())}`;
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, maxFooterY);

    // Línea divisoria entre tickets (solo para el primero)
    if (startY === 0) {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, halfPageHeight, pageWidth - margin, halfPageHeight);
    }
  }

  /**
   * Formatea una fecha para mostrarla en el PDF
   * Convierte de UTC a hora local de México (America/Mexico_City)
   */
  private formatDate(date: Date | string): string {
    if (!date) return '-';

    // Si es string, asegurar que tiene 'Z' al final para que se interprete como UTC
    let dateObj: Date;
    if (typeof date === 'string') {
      // Si el string no termina en 'Z', agregarlo (viene del backend sin 'Z')
      const dateStr = date.endsWith('Z') ? date : date + 'Z';
      dateObj = new Date(dateStr);
    } else {
      dateObj = new Date(date);
    }

    // Crear fecha y convertir a timezone de México
    const mexicoDate = dateObj.toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // Formato: "20/10/2025, 13:00" -> "20/10/2025 13:00"
    return mexicoDate.replace(',', '');
  }

  /**
   * Formatea una fecha para nombre de archivo
   * Usa hora local de México
   */
  private formatDateForFilename(date: Date | string): string {
    // Si es string, asegurar que tiene 'Z' al final para que se interprete como UTC
    let dateObj: Date;
    if (typeof date === 'string') {
      const dateStr = date.endsWith('Z') ? date : date + 'Z';
      dateObj = new Date(dateStr);
    } else {
      dateObj = new Date(date);
    }

    // Convertir a hora de México
    const mexicoDateParts = dateObj
      .toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      .split(/[\s,/:]+/);

    // mexicoDateParts = ['20', '10', '2025', '13', '00', '00']
    const [day, month, year, hours, minutes, seconds] = mexicoDateParts;
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  }

  /**
   * Obtiene el peso de salida total para doble remolque.
   * Prefiere la suma de las taras capturadas y, si no existen,
   * usa el peso de salida general.
   */
  private getDoubleTrailerExitWeight(data: WeighingReceiptData): number {
    const sumaTaraRemolques =
      (data.remolque1?.pesoTara ?? 0) + (data.remolque2?.pesoTara ?? 0);

    if (sumaTaraRemolques > 0) {
      return sumaTaraRemolques;
    }

    return data.pesoBrutoSalida || 0;
  }

  /**
   * Formatea un peso
   */
  private formatWeight(weight: number): string {
    if (weight === null || weight === undefined) return '0.00';
    return weight.toFixed(2);
  }

  /**
   * Obtiene el nombre para mostrar del tipo de unidad
   */
  private getTipoUnidadDisplayName(tipoUnidad: string): string {
    const displayNames: { [key: string]: string } = {
      remolque: 'Remolque',
      'doble-remolque': 'Doble Remolque',
      contenedor: 'Contenedor',
      'contenedor-con-remolque': 'Contenedor con Remolque',
    };
    return displayNames[tipoUnidad] || tipoUnidad;
  }
}
