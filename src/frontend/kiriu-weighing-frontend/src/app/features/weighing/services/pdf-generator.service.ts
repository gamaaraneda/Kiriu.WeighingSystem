import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface WeighingReceiptData {
  folio: string;
  fecha: Date;
  tipoUnidad: string;
  clienteProveedor: string;
  tipo: string;
  producto: string;

  // Datos de entrada
  fechaEntrada: Date;
  pesoBrutoEntrada: number;
  placaTrailer: string;
  placaRemolque?: string;

  // Datos de salida
  fechaSalida: Date;
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
  providedIn: 'root'
})
export class PdfGeneratorService {

  constructor() { }

  /**
   * Genera un PDF con los datos de la operación de pesaje y un código QR
   */
  async generateWeighingReceipt(data: WeighingReceiptData): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // Colores
    const primaryBlue = [41, 98, 255]; // RGB para #2962FF
    const lightGray = [245, 245, 245];
    const borderGray = [220, 220, 220];

    // Función helper para dibujar caja con borde
    const drawBox = (x: number, y: number, width: number, height: number, fillColor?: number[]) => {
      if (fillColor) {
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        doc.rect(x, y, width, height, 'F');
      }
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.rect(x, y, width, height);
    };

    // Función helper para dibujar badge de placa
    const drawBadge = (text: string, x: number, y: number, width: number, height: number) => {
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.roundedRect(x, y, width, height, 2, 2, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.roundedRect(x, y, width, height, 2, 2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, x + (width - textWidth) / 2, y + height / 2 + 1.5);
    };

    // ENCABEZADO
    // Línea superior azul
    doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.rect(0, 0, pageWidth, 2, 'F');

    yPosition = 10;

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text('Sistema de Pesaje KIRIU', margin, yPosition);

    // Folio (derecha)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const folioText = 'Folio';
    const folioWidth = doc.getTextWidth(folioText);
    doc.text(folioText, pageWidth - margin - folioWidth, yPosition - 2);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const folioValueWidth = doc.getTextWidth(data.folio);
    doc.text(data.folio, pageWidth - margin - folioValueWidth, yPosition + 5);

    yPosition += 8;

    // Subtítulo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Ticket de Pesaje', margin, yPosition);

    // Fecha (derecha)
    doc.setFontSize(9);
    const fechaText = `Fecha: ${this.formatDate(data.fecha)}`;
    const fechaWidth = doc.getTextWidth(fechaText);
    doc.text(fechaText, pageWidth - margin - fechaWidth, yPosition);

    yPosition += 3;

    // Línea separadora
    doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    yPosition += 8;

    // SECCIONES EN DOS COLUMNAS
    const columnWidth = (pageWidth - margin * 3) / 2;
    const column1X = margin;
    const column2X = margin * 2 + columnWidth;
    const sectionStartY = yPosition;

    // COLUMNA 1: INFORMACIÓN GENERAL
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('INFORMACIÓN GENERAL', column1X, yPosition);
    yPosition += 7;

    let col1Y = yPosition;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // Tipo de Unidad
    doc.setFont('helvetica', 'bold');
    doc.text('Tipo de Unidad', column1X, col1Y);
    doc.setFont('helvetica', 'normal');
    doc.text(this.getTipoUnidadDisplayName(data.tipoUnidad), column1X + 30, col1Y);
    col1Y += 6;

    // Movimiento
    doc.setFont('helvetica', 'bold');
    doc.text('Movimiento', column1X, col1Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 150, 0);
    doc.text('SALIDA', column1X + 30, col1Y);
    doc.setTextColor(0, 0, 0);
    col1Y += 6;

    // Fecha/Hora
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha/Hora', column1X, col1Y);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDate(data.fechaSalida), column1X + 30, col1Y);

    // COLUMNA 2: CLIENTE/PROVEEDOR
    let col2Y = sectionStartY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CLIENTE / PROVEEDOR', column2X, col2Y);
    col2Y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // Nombre
    doc.setFont('helvetica', 'bold');
    doc.text('Nombre', column2X, col2Y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clienteProveedor, column2X + 20, col2Y);
    col2Y += 6;

    // Tipo
    doc.setFont('helvetica', 'bold');
    doc.text('Tipo', column2X, col2Y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.tipo === 'client' ? 'Cliente' : 'Proveedor', column2X + 20, col2Y);
    col2Y += 6;

    // Producto
    doc.setFont('helvetica', 'bold');
    doc.text('Producto', column2X, col2Y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.producto, column2X + 20, col2Y);

    yPosition = Math.max(col1Y, col2Y) + 10;

    // SECCIÓN PLACAS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PLACAS', margin, yPosition);
    yPosition += 8;

    // Dibujar badges de placas
    const placas: string[] = [data.placaTrailer];
    if (data.remolque1?.placa) placas.push(data.remolque1.placa);
    if (data.remolque2?.placa) placas.push(data.remolque2.placa);

    const badgeHeight = 8;
    const badgeSpacing = 5;
    const badgePadding = 4;
    let badgeX = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);

    placas.forEach(placa => {
      // Calcular ancho dinámico basado en el texto
      const textWidth = doc.getTextWidth(placa);
      const badgeWidth = textWidth + (badgePadding * 2);

      drawBadge(placa, badgeX, yPosition, badgeWidth, badgeHeight);
      badgeX += badgeWidth + badgeSpacing;
    });

    yPosition += badgeHeight + 12;

    // TABLA PESAJE - ENTRADA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PESAJE - ENTRADA', margin, yPosition);
    yPosition += 6;

    const tableX = margin;
    const tableWidth = pageWidth - margin * 2;
    const rowHeight = 8;
    const colWidths = [tableWidth / 2, tableWidth / 2];

    // Encabezado tabla entrada
    drawBox(tableX, yPosition, colWidths[0], rowHeight, lightGray);
    drawBox(tableX + colWidths[0], yPosition, colWidths[1], rowHeight, lightGray);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Fecha', tableX + 2, yPosition + 5.5);
    doc.text('Peso Bruto', tableX + colWidths[0] + 2, yPosition + 5.5);
    yPosition += rowHeight;

    // Datos entrada
    drawBox(tableX, yPosition, colWidths[0], rowHeight);
    drawBox(tableX + colWidths[0], yPosition, colWidths[1], rowHeight);

    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDate(data.fechaEntrada), tableX + 2, yPosition + 5.5);
    doc.text(`${this.formatWeight(data.pesoBrutoEntrada)} kg`, tableX + colWidths[0] + 2, yPosition + 5.5);
    yPosition += rowHeight + 8;

    // TABLA PESAJE - SALIDA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PESAJE - SALIDA', margin, yPosition);
    yPosition += 6;

    const colWidthsSalida = [tableWidth / 4, tableWidth / 4, tableWidth / 4, tableWidth / 4];

    // Encabezado tabla salida
    drawBox(tableX, yPosition, colWidthsSalida[0], rowHeight, lightGray);
    drawBox(tableX + colWidthsSalida[0], yPosition, colWidthsSalida[1], rowHeight, lightGray);
    drawBox(tableX + colWidthsSalida[0] + colWidthsSalida[1], yPosition, colWidthsSalida[2], rowHeight, lightGray);
    drawBox(tableX + colWidthsSalida[0] + colWidthsSalida[1] + colWidthsSalida[2], yPosition, colWidthsSalida[3], rowHeight, lightGray);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Fecha', tableX + 2, yPosition + 5.5);
    doc.text('Bruto', tableX + colWidthsSalida[0] + 2, yPosition + 5.5);
    doc.text('Tara', tableX + colWidthsSalida[0] + colWidthsSalida[1] + 2, yPosition + 5.5);
    doc.text('Neto', tableX + colWidthsSalida[0] + colWidthsSalida[1] + colWidthsSalida[2] + 2, yPosition + 5.5);
    yPosition += rowHeight;

    // Datos salida
    drawBox(tableX, yPosition, colWidthsSalida[0], rowHeight);
    drawBox(tableX + colWidthsSalida[0], yPosition, colWidthsSalida[1], rowHeight);
    drawBox(tableX + colWidthsSalida[0] + colWidthsSalida[1], yPosition, colWidthsSalida[2], rowHeight);
    drawBox(tableX + colWidthsSalida[0] + colWidthsSalida[1] + colWidthsSalida[2], yPosition, colWidthsSalida[3], rowHeight);

    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDate(data.fechaSalida), tableX + 2, yPosition + 5.5);
    doc.text(`${this.formatWeight(data.pesoBrutoSalida)} kg`, tableX + colWidthsSalida[0] + 2, yPosition + 5.5);
    doc.text(`${this.formatWeight(data.pesoTara)} kg`, tableX + colWidthsSalida[0] + colWidthsSalida[1] + 2, yPosition + 5.5);
    doc.text(`${this.formatWeight(data.pesoNeto)} kg`, tableX + colWidthsSalida[0] + colWidthsSalida[1] + colWidthsSalida[2] + 2, yPosition + 5.5);
    yPosition += rowHeight;

    // Total Neto (fila destacada)
    const totalNetoRowHeight = 9;
    drawBox(tableX, yPosition, tableWidth - colWidthsSalida[3], totalNetoRowHeight);
    drawBox(tableX + tableWidth - colWidthsSalida[3], yPosition, colWidthsSalida[3], totalNetoRowHeight, lightGray);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Total Neto', tableX + 2, yPosition + 6);
    doc.text(`${this.formatWeight(data.pesoNeto)} kg`, tableX + tableWidth - colWidthsSalida[3] + 2, yPosition + 6);
    yPosition += totalNetoRowHeight + 8;

    // TABLA REMOLQUES (si aplica)
    if (data.remolque1 || data.remolque2) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('REMOLQUES', margin, yPosition);
      yPosition += 6;

      const colWidthsRemolque = [tableWidth / 4, tableWidth / 4, tableWidth / 4, tableWidth / 4];

      // Encabezado tabla remolques
      drawBox(tableX, yPosition, colWidthsRemolque[0], rowHeight, lightGray);
      drawBox(tableX + colWidthsRemolque[0], yPosition, colWidthsRemolque[1], rowHeight, lightGray);
      drawBox(tableX + colWidthsRemolque[0] + colWidthsRemolque[1], yPosition, colWidthsRemolque[2], rowHeight, lightGray);
      drawBox(tableX + colWidthsRemolque[0] + colWidthsRemolque[1] + colWidthsRemolque[2], yPosition, colWidthsRemolque[3], rowHeight, lightGray);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Remolque', tableX + 2, yPosition + 5.5);
      doc.text('Bruto (kg)', tableX + colWidthsRemolque[0] + 2, yPosition + 5.5);
      doc.text('Tara (kg)', tableX + colWidthsRemolque[0] + colWidthsRemolque[1] + 2, yPosition + 5.5);
      doc.text('Neto (kg)', tableX + colWidthsRemolque[0] + colWidthsRemolque[1] + colWidthsRemolque[2] + 2, yPosition + 5.5);
      yPosition += rowHeight;

      // Remolque 1
      if (data.remolque1) {
        drawBox(tableX, yPosition, colWidthsRemolque[0], rowHeight);
        drawBox(tableX + colWidthsRemolque[0], yPosition, colWidthsRemolque[1], rowHeight);
        drawBox(tableX + colWidthsRemolque[0] + colWidthsRemolque[1], yPosition, colWidthsRemolque[2], rowHeight);
        drawBox(tableX + colWidthsRemolque[0] + colWidthsRemolque[1] + colWidthsRemolque[2], yPosition, colWidthsRemolque[3], rowHeight);

        doc.setFont('helvetica', 'normal');
        doc.text('Remolque 1', tableX + 2, yPosition + 5.5);
        doc.text(this.formatWeight(data.remolque1.pesoBruto), tableX + colWidthsRemolque[0] + 2, yPosition + 5.5);
        doc.text(this.formatWeight(data.remolque1.pesoTara), tableX + colWidthsRemolque[0] + colWidthsRemolque[1] + 2, yPosition + 5.5);
        doc.text(this.formatWeight(data.remolque1.pesoNeto), tableX + colWidthsRemolque[0] + colWidthsRemolque[1] + colWidthsRemolque[2] + 2, yPosition + 5.5);
        yPosition += rowHeight;
      }

      // Remolque 2
      if (data.remolque2) {
        drawBox(tableX, yPosition, colWidthsRemolque[0], rowHeight);
        drawBox(tableX + colWidthsRemolque[0], yPosition, colWidthsRemolque[1], rowHeight);
        drawBox(tableX + colWidthsRemolque[0] + colWidthsRemolque[1], yPosition, colWidthsRemolque[2], rowHeight);
        drawBox(tableX + colWidthsRemolque[0] + colWidthsRemolque[1] + colWidthsRemolque[2], yPosition, colWidthsRemolque[3], rowHeight);

        doc.setFont('helvetica', 'normal');
        doc.text('Remolque 2', tableX + 2, yPosition + 5.5);
        doc.text(this.formatWeight(data.remolque2.pesoBruto), tableX + colWidthsRemolque[0] + 2, yPosition + 5.5);
        doc.text(this.formatWeight(data.remolque2.pesoTara), tableX + colWidthsRemolque[0] + colWidthsRemolque[1] + 2, yPosition + 5.5);
        doc.text(this.formatWeight(data.remolque2.pesoNeto), tableX + colWidthsRemolque[0] + colWidthsRemolque[1] + colWidthsRemolque[2] + 2, yPosition + 5.5);
        yPosition += rowHeight;
      }

      // Nota al pie de la tabla
      yPosition += 3;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text('* Si la unidad tiene un solo remolque, la fila de "Remolque 2" no se muestra.', tableX + 2, yPosition);
      yPosition += 8;
    }

    // CÓDIGO QR
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
      fechaSalida: data.fechaSalida
    });

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Verificar si hay espacio suficiente
      const qrSize = 45;
      if (yPosition + qrSize + 20 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin + 10;
      } else {
        yPosition += 10;
      }

      const qrX = (pageWidth - qrSize) / 2;
      doc.addImage(qrCodeDataUrl, 'PNG', qrX, yPosition, qrSize, qrSize);
      yPosition += qrSize + 5;

      // Texto debajo del QR
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const qrText = 'Escanea para ver el ticket digital';
      const qrTextWidth = doc.getTextWidth(qrText);
      doc.text(qrText, (pageWidth - qrTextWidth) / 2, yPosition);
      yPosition += 10;

    } catch (error) {
      console.error('Error generando código QR:', error);
    }

    // FOOTER
    yPosition = pageHeight - margin - 5;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const footerText = `Impreso: ${this.formatDate(new Date())}`;
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, yPosition);

    // Guardar el PDF
    const fileName = `Ticket_${data.folio}_${this.formatDateForFilename(new Date())}.pdf`;
    doc.save(fileName);
  }

  /**
   * Formatea una fecha para mostrarla en el PDF
   */
  private formatDate(date: Date): string {
    if (!date) return '-';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Formatea una fecha para nombre de archivo
   */
  private formatDateForFilename(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
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
      'remolque': 'Remolque',
      'doble-remolque': 'Doble Remolque',
      'contenedor': 'Contenedor',
      'contenedor-con-remolque': 'Contenedor con Remolque'
    };
    return displayNames[tipoUnidad] || tipoUnidad;
  }
}
