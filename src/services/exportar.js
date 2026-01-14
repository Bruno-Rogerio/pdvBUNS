const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Importar jsPDF de forma correta
let jsPDF;
try {
  jsPDF = require('jspdf').jsPDF;
  require('jspdf-autotable');
} catch (error) {
  console.error('Erro ao carregar jsPDF:', error);
}

// ============================================
// EXPORTAR CSV
// ============================================
function exportarCSV(vendas, callback) {
  try {
    let csv = 'ID,Data/Hora,Itens,Total,Forma Pagamento\n';
    
    vendas.forEach(venda => {
      const data = new Date(venda.data_hora).toLocaleString('pt-BR');
      csv += `${venda.id},"${data}",${venda.quantidade_itens},${venda.total.toFixed(2)},"${venda.forma_pagamento || 'N/A'}"\n`;
    });
    
    const nomeArquivo = `relatorio_vendas_${Date.now()}.csv`;
    const caminhoArquivo = path.join(os.homedir(), 'Downloads', nomeArquivo);
    
    fs.writeFileSync(caminhoArquivo, csv, 'utf8');
    
    console.log('✅ CSV exportado:', caminhoArquivo);
    callback(null, caminhoArquivo);
    
  } catch (error) {
    console.error('❌ Erro ao exportar CSV:', error);
    callback(error);
  }
}

// ============================================
// EXPORTAR EXCEL
// ============================================
async function exportarExcel(vendas, callback) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório de Vendas');
    
    // Configurar colunas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Data/Hora', key: 'data_hora', width: 20 },
      { header: 'Itens', key: 'quantidade_itens', width: 10 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Forma Pagamento', key: 'forma_pagamento', width: 20 }
    ];
    
    // Estilizar cabeçalho
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF667EEA' }
    };
    worksheet.getRow(1).font.color = { argb: 'FFFFFFFF' };
    
    // Adicionar dados
    vendas.forEach(venda => {
      worksheet.addRow({
        id: venda.id,
        data_hora: new Date(venda.data_hora).toLocaleString('pt-BR'),
        quantidade_itens: venda.quantidade_itens,
        total: `R$ ${venda.total.toFixed(2)}`,
        forma_pagamento: venda.forma_pagamento || 'N/A'
      });
    });
    
    // Adicionar totais
    const totalVendas = vendas.length;
    const totalVendido = vendas.reduce((acc, v) => acc + v.total, 0);
    
    worksheet.addRow([]);
    const rowTotal = worksheet.addRow(['', '', 'TOTAIS:', totalVendas, `R$ ${totalVendido.toFixed(2)}`]);
    rowTotal.font = { bold: true };
    rowTotal.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE9ECEF' }
    };
    
    // Salvar arquivo
    const nomeArquivo = `relatorio_vendas_${Date.now()}.xlsx`;
    const caminhoArquivo = path.join(os.homedir(), 'Downloads', nomeArquivo);
    
    await workbook.xlsx.writeFile(caminhoArquivo);
    
    console.log('✅ Excel exportado:', caminhoArquivo);
    callback(null, caminhoArquivo);
    
  } catch (error) {
    console.error('❌ Erro ao exportar Excel:', error);
    callback(error);
  }
}

// ============================================
// EXPORTAR PDF
// ============================================
function exportarPDF(vendas, estatisticas, callback) {
  try {
    if (!jsPDF) {
      throw new Error('jsPDF não está disponível');
    }
    
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.setTextColor(102, 126, 234);
    doc.text('PDV SIMPLES', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Relatório de Vendas', 105, 30, { align: 'center' });
    
    // Data de emissão
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 105, 38, { align: 'center' });
    
    // Linha separadora
    doc.setDrawColor(102, 126, 234);
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);
    
    // Estatísticas
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    
    let y = 52;
    doc.text('ESTATÍSTICAS:', 20, y);
    doc.setFont(undefined, 'normal');
    y += 8;
    doc.text(`Total Vendido: R$ ${estatisticas.totalVendido.toFixed(2)}`, 25, y);
    y += 6;
    doc.text(`Total de Vendas: ${estatisticas.totalVendas}`, 25, y);
    y += 6;
    doc.text(`Itens Vendidos: ${estatisticas.itensVendidos}`, 25, y);
    y += 6;
    doc.text(`Ticket Médio: R$ ${estatisticas.ticketMedio.toFixed(2)}`, 25, y);
    
    y += 10;
    
    // Linha separadora
    doc.line(20, y, 190, y);
    
    y += 10;
    
    // Cabeçalho da tabela
    doc.setFont(undefined, 'bold');
    doc.setFillColor(102, 126, 234);
    doc.rect(20, y - 5, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('ID', 25, y);
    doc.text('Data/Hora', 45, y);
    doc.text('Itens', 105, y);
    doc.text('Total', 130, y);
    doc.text('Pagamento', 160, y);
    
    y += 8;
    
    // Dados da tabela
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    vendas.forEach((venda, index) => {
      // Verificar se precisa de nova página
      if (y > 270) {
        doc.addPage();
        y = 20;
        
        // Repetir cabeçalho
        doc.setFont(undefined, 'bold');
        doc.setFillColor(102, 126, 234);
        doc.rect(20, y - 5, 170, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('ID', 25, y);
        doc.text('Data/Hora', 45, y);
        doc.text('Itens', 105, y);
        doc.text('Total', 130, y);
        doc.text('Pagamento', 160, y);
        
        y += 8;
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
      }
      
      // Cor alternada nas linhas
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(20, y - 5, 170, 7, 'F');
      }
      
      const data = new Date(venda.data_hora).toLocaleString('pt-BR');
      
      doc.text(`#${venda.id}`, 25, y);
      doc.text(data, 45, y);
      doc.text(String(venda.quantidade_itens), 105, y);
      doc.text(`R$ ${venda.total.toFixed(2)}`, 130, y);
      doc.text(venda.forma_pagamento || 'N/A', 160, y);
      
      y += 7;
    });
    
    // Linha de totais
    y += 3;
    doc.setDrawColor(102, 126, 234);
    doc.line(20, y, 190, y);
    y += 7;
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('TOTAIS:', 25, y);
    doc.text(`${estatisticas.totalVendas} vendas`, 105, y);
    doc.text(`R$ ${estatisticas.totalVendido.toFixed(2)}`, 130, y);
    
    // Rodapé em todas as páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setFont(undefined, 'normal');
      doc.text(
        `Página ${i} de ${pageCount}`,
        105,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Salvar
    const nomeArquivo = `relatorio_vendas_${Date.now()}.pdf`;
    const caminhoArquivo = path.join(os.homedir(), 'Downloads', nomeArquivo);
    
    doc.save(caminhoArquivo);
    
    console.log('✅ PDF exportado:', caminhoArquivo);
    callback(null, caminhoArquivo);
    
  } catch (error) {
    console.error('❌ Erro ao exportar PDF:', error);
    callback(error);
  }
}

module.exports = {
  exportarCSV,
  exportarExcel,
  exportarPDF
};