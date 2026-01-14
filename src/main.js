const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const database = require('./database/db');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

console.log('🚀 PDV Simples iniciado!');

// ============================================
// FUNÇÕES DE IMPRESSÃO
// ============================================

const NOME_IMPRESSORA = 'POS58';

// Comandos ESC/POS
const ESC = '\x1B';
const GS = '\x1D';

function imprimirRAW(comandos) {
  return new Promise((resolve, reject) => {
    // Criar arquivo temporário
    const tempFile = path.join(os.tmpdir(), `cupom_${Date.now()}.prn`);

    // Escrever comandos como buffer binário
    const buffer = Buffer.from(comandos, 'binary');
    fs.writeFileSync(tempFile, buffer);

    console.log('🖨️  Arquivo criado:', tempFile);
    console.log('🖨️  Tamanho:', buffer.length, 'bytes');
    console.log('🖨️  Enviando para:', NOME_IMPRESSORA);

    // Usar type para enviar bytes direto
    const comando = `cmd /c "type "${tempFile}" > "\\\\localhost\\${NOME_IMPRESSORA}""`;

    console.log('🔧 Executando comando...');

    exec(comando, { timeout: 5000 }, (error, stdout, stderr) => {
      // Limpar arquivo temporário
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.log('⚠️  Não foi possível deletar temp');
      }

      if (error) {
        console.error('❌ Erro:', error.message);
        console.error('stderr:', stderr);

        // Tentar método fallback com Get-Content
        console.log('⚠️  Tentando método alternativo...');

        const tempFile2 = path.join(os.tmpdir(), `cupom2_${Date.now()}.txt`);
        fs.writeFileSync(tempFile2, comandos, 'utf8');

        const comando2 = `powershell -Command "Get-Content -Path '${tempFile2.replace(
          /\\/g,
          '\\\\'
        )}' -Raw | Out-Printer -Name '${NOME_IMPRESSORA}'"`;

        exec(comando2, (error2, stdout2, stderr2) => {
          try {
            fs.unlinkSync(tempFile2);
          } catch (e) {}

          if (error2) {
            console.error(
              '❌ Método alternativo também falhou:',
              error2.message
            );
            reject(error2);
            return;
          }

          console.log('✅ Enviado via método alternativo!');
          resolve({ success: true });
        });

        return;
      }

      console.log('✅ Comando executado!');
      if (stdout) console.log('stdout:', stdout);
      resolve({ success: true });
    });
  });
}

// ============================================
// HANDLERS DE IMPRESSÃO (IPC)
// ============================================

// Handler: Testar impressora
ipcMain.handle('testar-impressora', async (event) => {
  try {
    console.log('🖨️  Iniciando teste...');

    let comandos = '';

    // Inicializar
    comandos += ESC + '@';

    // Centralizar
    comandos += ESC + 'a1';

    // Texto
    comandos += '================================\n';
    comandos += '   IMPRESSAO DE TESTE\n';
    comandos += '================================\n';
    comandos += '\n';
    comandos += 'Impressora conectada!\n';
    comandos += 'Sistema funcionando!\n';
    comandos += '\n';
    comandos += 'Data: ' + new Date().toLocaleString('pt-BR') + '\n';
    comandos += '\n';
    comandos += '================================\n';
    comandos += '\n\n\n';

    // Cortar papel
    comandos += GS + 'V' + String.fromCharCode(66) + String.fromCharCode(0);

    console.log('📄 Comandos preparados, enviando...');

    await imprimirRAW(comandos);

    console.log('✅ Teste concluído!');
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao imprimir teste:', error);
    throw error;
  }
});

// Handler: Imprimir cupom
ipcMain.handle('imprimir-cupom', async (event, venda, itens) => {
  try {
    console.log('🖨️  Preparando cupom da venda #' + venda.id);

    const dataHora = new Date(venda.data_hora);
    const dataFormatada = dataHora.toLocaleString('pt-BR');

    let comandos = '';

    // Inicializar impressora
    comandos += ESC + '@';

    // Cabeçalho (centralizado)
    comandos += ESC + 'a1'; // Centralizar
    comandos += ESC + '!' + String.fromCharCode(0x10); // Tamanho duplo altura
    comandos += '================================\n';
    comandos += '     PDV SIMPLES v1.0\n';
    comandos += '================================\n';
    comandos += ESC + '!' + String.fromCharCode(0); // Tamanho normal
    comandos += '\n';

    // Dados da venda (esquerda)
    comandos += ESC + 'a0'; // Alinhar esquerda
    comandos += 'Data: ' + dataFormatada + '\n';
    comandos += 'Venda: #' + venda.id + '\n';
    comandos += '--------------------------------\n';

    // Itens
    itens.forEach((item) => {
      const nome = item.produto_nome.substring(0, 28);
      comandos += nome + '\n';
      comandos +=
        '  ' + item.quantidade + 'x R$ ' + item.preco_unitario.toFixed(2);
      comandos += ' = R$ ' + item.subtotal.toFixed(2) + '\n';
    });

    comandos += '--------------------------------\n';

    // Total (direita, negrito, tamanho grande)
    comandos += ESC + 'a2'; // Alinhar direita
    comandos += ESC + 'E1'; // Negrito ON
    comandos += ESC + '!' + String.fromCharCode(0x20); // Largura dupla
    comandos += 'TOTAL: R$ ' + venda.total.toFixed(2) + '\n';
    comandos += ESC + '!' + String.fromCharCode(0); // Tamanho normal
    comandos += ESC + 'E0'; // Negrito OFF
    comandos += '\n';

    // Rodapé (centralizado)
    comandos += ESC + 'a1'; // Centralizar
    comandos += 'Pagamento: ' + (venda.forma_pagamento || 'Dinheiro') + '\n';
    comandos += '\n';
    comandos += 'Obrigado pela preferencia!\n';
    comandos += 'Volte sempre!\n';
    comandos += '================================\n';
    comandos += '\n\n\n';

    // Cortar papel
    comandos += GS + 'V' + String.fromCharCode(66) + String.fromCharCode(0);

    console.log('📄 Cupom preparado, enviando...');

    await imprimirRAW(comandos);

    console.log('✅ Cupom impresso!');
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao imprimir cupom:', error);
    throw error;
  }
});

// Adicione após os outros ipcMain.handle
ipcMain.handle('restaurar-foco', async (event) => {
  const janela = BrowserWindow.getFocusedWindow() || mainWindow;
  if (janela) {
    janela.blur();
    setTimeout(() => {
      janela.focus();
    }, 50);
  }
  return { success: true };
});
