const escpos = require('escpos');
escpos.USB = require('escpos-usb');

// Função para detectar impressoras USB conectadas
function detectarImpressoras() {
  try {
    const devices = escpos.USB.findPrinter();
    console.log('🖨️  Impressoras encontradas:', devices.length);
    return devices;
  } catch (error) {
    console.error('❌ Erro ao detectar impressoras:', error);
    return [];
  }
}

// Função para imprimir cupom
function imprimirCupom(venda, itens, callback) {
  try {
    // Detecta a primeira impressora disponível
    const devices = escpos.USB.findPrinter();
    
    if (devices.length === 0) {
      callback(new Error('Nenhuma impressora térmica detectada!'));
      return;
    }

    console.log('🖨️  Conectando na impressora...');
    const device = new escpos.USB();
    const printer = new escpos.Printer(device);

    device.open(function(error) {
      if (error) {
        console.error('❌ Erro ao abrir conexão:', error);
        callback(error);
        return;
      }

      console.log('✅ Conexão aberta, imprimindo...');

      // Monta o cupom
      const dataHora = new Date(venda.data_hora);
      const dataFormatada = dataHora.toLocaleString('pt-BR');

      try {
        printer
          .font('a')
          .align('ct')
          .style('bu')
          .size(1, 1)
          .text('================================')
          .text('      PDV SIMPLES v1.0')
          .text('================================')
          .style('normal')
          .size(0, 0)
          .text('')
          .align('lt')
          .text(`Data: ${dataFormatada}`)
          .text(`Venda #${venda.id}`)
          .text('--------------------------------')
          .text('ITEM           QTD  UNIT  TOTAL')
          .text('--------------------------------');

        // Adiciona cada item
        itens.forEach(item => {
          const nome = item.produto_nome.substring(0, 15).padEnd(15);
          const qtd = String(item.quantidade).padStart(3);
          const unit = item.preco_unitario.toFixed(2).padStart(5);
          const total = item.subtotal.toFixed(2).padStart(6);
          
          printer.text(`${nome}${qtd} ${unit} ${total}`);
        });

        printer
          .text('--------------------------------')
          .align('rt')
          .size(1, 1)
          .style('b')
          .text(`TOTAL: R$ ${venda.total.toFixed(2)}`)
          .style('normal')
          .size(0, 0)
          .text('')
          .align('ct')
          .text(`Pagamento: ${venda.forma_pagamento || 'Dinheiro'}`)
          .text('')
          .text('Obrigado pela preferencia!')
          .text('Volte sempre!')
          .text('================================')
          .text('')
          .text('')
          .cut()
          .close(() => {
            console.log('✅ Cupom impresso com sucesso!');
            callback(null);
          });
      } catch (printError) {
        console.error('❌ Erro durante impressão:', printError);
        callback(printError);
      }
    });

  } catch (error) {
    console.error('❌ Erro ao imprimir:', error);
    callback(error);
  }
}

// Função para imprimir cupom de teste
function imprimirTeste(callback) {
  try {
    const devices = escpos.USB.findPrinter();
    
    if (devices.length === 0) {
      callback(new Error('Nenhuma impressora térmica detectada!'));
      return;
    }

    console.log('🖨️  Conectando na impressora para teste...');
    const device = new escpos.USB();
    const printer = new escpos.Printer(device);

    device.open(function(error) {
      if (error) {
        console.error('❌ Erro ao abrir conexão:', error);
        callback(error);
        return;
      }

      console.log('✅ Conexão aberta, imprimindo teste...');

      try {
        printer
          .font('a')
          .align('ct')
          .style('bu')
          .size(1, 1)
          .text('================================')
          .text('     IMPRESSAO DE TESTE')
          .text('================================')
          .style('normal')
          .size(0, 0)
          .text('')
          .text('Impressora conectada!')
          .text('Sistema funcionando corretamente')
          .text('')
          .text(`Data: ${new Date().toLocaleString('pt-BR')}`)
          .text('')
          .text('================================')
          .text('')
          .text('')
          .cut()
          .close(() => {
            console.log('✅ Teste impresso com sucesso!');
            callback(null);
          });
      } catch (printError) {
        console.error('❌ Erro durante impressão:', printError);
        callback(printError);
      }
    });

  } catch (error) {
    console.error('❌ Erro no teste de impressão:', error);
    callback(error);
  }
}

module.exports = {
  detectarImpressoras,
  imprimirCupom,
  imprimirTeste
};