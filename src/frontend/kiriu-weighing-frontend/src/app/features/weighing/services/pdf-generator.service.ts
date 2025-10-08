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

    // Función helper para centrar texto
    const centerText = (text: string, y: number, fontSize: number = 10) => {
      doc.setFontSize(fontSize);
      const textWidth = doc.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2;
      doc.text(text, x, y);
    };

    // Función helper para agregar línea
    const addLine = (y: number) => {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
    };

    // Encabezado
    doc.setFont('helvetica', 'bold');
    centerText('SISTEMA DE PESAJE KIRIU', yPosition, 18);
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    centerText('TICKET DE PESAJE', yPosition, 14);
    yPosition += 10;
    addLine(yPosition);
    yPosition += 8;

    // Información general
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('INFORMACIÓN GENERAL', margin, yPosition);
    yPosition += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Folio: ${data.folio}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Fecha: ${this.formatDate(data.fecha)}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Tipo de Unidad: ${this.getTipoUnidadDisplayName(data.tipoUnidad)}`, margin, yPosition);
    yPosition += 8;

    // Cliente/Proveedor
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('CLIENTE/PROVEEDOR', margin, yPosition);
    yPosition += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nombre: ${data.clienteProveedor}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Tipo: ${data.tipo === 'client' ? 'Cliente' : 'Proveedor'}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Producto: ${data.producto}`, margin, yPosition);
    yPosition += 8;

    // Placas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PLACAS', margin, yPosition);
    yPosition += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Tráiler: ${data.placaTrailer}`, margin, yPosition);
    yPosition += 6;
    if (data.placaRemolque) {
      doc.text(`Remolque: ${data.placaRemolque}`, margin, yPosition);
      yPosition += 6;
    }
    yPosition += 2;

    // Datos de pesaje
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PESAJE', margin, yPosition);
    yPosition += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Entrada
    doc.setFont('helvetica', 'bold');
    doc.text('Entrada:', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    yPosition += 6;
    doc.text(`  Fecha: ${this.formatDate(data.fechaEntrada)}`, margin, yPosition);
    yPosition += 6;
    doc.text(`  Peso Bruto: ${this.formatWeight(data.pesoBrutoEntrada)} kg`, margin, yPosition);
    yPosition += 8;

    // Salida
    doc.setFont('helvetica', 'bold');
    doc.text('Salida:', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    yPosition += 6;
    doc.text(`  Fecha: ${this.formatDate(data.fechaSalida)}`, margin, yPosition);
    yPosition += 6;
    doc.text(`  Peso Bruto: ${this.formatWeight(data.pesoBrutoSalida)} kg`, margin, yPosition);
    yPosition += 6;
    doc.text(`  Peso Tara: ${this.formatWeight(data.pesoTara)} kg`, margin, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`  Peso Neto: ${this.formatWeight(data.pesoNeto)} kg`, margin, yPosition);
    yPosition += 10;

    // Remolques (si es doble remolque)
    if (data.remolque1 || data.remolque2) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('REMOLQUES', margin, yPosition);
      yPosition += 7;

      if (data.remolque1) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Remolque 1 (${data.remolque1.placa}):`, margin, yPosition);
        yPosition += 6;
        doc.text(`  Bruto: ${this.formatWeight(data.remolque1.pesoBruto)} kg`, margin, yPosition);
        yPosition += 6;
        doc.text(`  Tara: ${this.formatWeight(data.remolque1.pesoTara)} kg`, margin, yPosition);
        yPosition += 6;
        doc.text(`  Neto: ${this.formatWeight(data.remolque1.pesoNeto)} kg`, margin, yPosition);
        yPosition += 6;
      }

      if (data.remolque2) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Remolque 2 (${data.remolque2.placa}):`, margin, yPosition);
        yPosition += 6;
        doc.text(`  Bruto: ${this.formatWeight(data.remolque2.pesoBruto)} kg`, margin, yPosition);
        yPosition += 6;
        doc.text(`  Tara: ${this.formatWeight(data.remolque2.pesoTara)} kg`, margin, yPosition);
        yPosition += 6;
        doc.text(`  Neto: ${this.formatWeight(data.remolque2.pesoNeto)} kg`, margin, yPosition);
        yPosition += 6;
      }
      yPosition += 2;
    }

    // Generar código QR con los datos en JSON
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
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Calcular posición del QR (centrado)
      const qrSize = 40;
      const qrX = (pageWidth - qrSize) / 2;

      // Verificar si hay espacio suficiente, si no, agregar nueva página
      if (yPosition + qrSize + 20 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      doc.addImage(qrCodeDataUrl, 'PNG', qrX, yPosition, qrSize, qrSize);
      yPosition += qrSize + 8;

      // Texto debajo del QR
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      centerText('Escanea el código QR para obtener información digital', yPosition);
      yPosition += 10;

    } catch (error) {
      console.error('Error generando código QR:', error);
    }

    // Footer
    addLine(yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    centerText(`Impreso: ${this.formatDate(new Date())}`, yPosition);
    yPosition += 5;
    doc.setFontSize(8);
    centerText('Gracias por usar nuestro servicio', yPosition);
    yPosition += 4;
    centerText('Sistema Kiriu - Versión 1.0', yPosition);

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
