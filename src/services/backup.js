const fs = require('fs');
const path = require('path');

function criarBackup(callback) {
  try {
    const pastaBackups = path.join(__dirname, '../../backups');
    
    // Criar pasta de backups se não existir
    if (!fs.existsSync(pastaBackups)) {
      fs.mkdirSync(pastaBackups);
    }
    
    const dataHora = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeBackup = `backup_${dataHora}.db`;
    const caminhoBackup = path.join(pastaBackups, nomeBackup);
    
    const caminhoOriginal = path.join(__dirname, '../../dados.db');
    
    if (!fs.existsSync(caminhoOriginal)) {
      callback(new Error('Banco de dados não encontrado!'));
      return;
    }
    
    // Copiar arquivo
    fs.copyFileSync(caminhoOriginal, caminhoBackup);
    
    console.log('✅ Backup criado:', caminhoBackup);
    
    // Limpar backups antigos (manter apenas últimos 10)
    limparBackupsAntigos(pastaBackups);
    
    callback(null, caminhoBackup);
    
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error);
    callback(error);
  }
}

function limparBackupsAntigos(pastaBackups) {
  try {
    const arquivos = fs.readdirSync(pastaBackups)
      .filter(f => f.endsWith('.db'))
      .map(f => ({
        nome: f,
        caminho: path.join(pastaBackups, f),
        tempo: fs.statSync(path.join(pastaBackups, f)).mtime.getTime()
      }))
      .sort((a, b) => b.tempo - a.tempo);
    
    // Deletar backups além dos 10 mais recentes
    if (arquivos.length > 10) {
      arquivos.slice(10).forEach(arquivo => {
        fs.unlinkSync(arquivo.caminho);
        console.log('🗑️  Backup antigo removido:', arquivo.nome);
      });
    }
    
  } catch (error) {
    console.error('⚠️  Erro ao limpar backups antigos:', error);
  }
}

function restaurarBackup(caminhoBackup, callback) {
  try {
    const caminhoOriginal = path.join(__dirname, '../../dados.db');
    
    if (!fs.existsSync(caminhoBackup)) {
      callback(new Error('Arquivo de backup não encontrado!'));
      return;
    }
    
    // Fazer backup do banco atual antes de restaurar
    const backupAtual = path.join(__dirname, '../../dados_antes_restauracao.db');
    if (fs.existsSync(caminhoOriginal)) {
      fs.copyFileSync(caminhoOriginal, backupAtual);
    }
    
    // Restaurar
    fs.copyFileSync(caminhoBackup, caminhoOriginal);
    
    console.log('✅ Backup restaurado!');
    callback(null);
    
  } catch (error) {
    console.error('❌ Erro ao restaurar backup:', error);
    callback(error);
  }
}

function listarBackups(callback) {
  try {
    const pastaBackups = path.join(__dirname, '../../backups');
    
    if (!fs.existsSync(pastaBackups)) {
      callback(null, []);
      return;
    }
    
    const backups = fs.readdirSync(pastaBackups)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const caminho = path.join(pastaBackups, f);
        const stats = fs.statSync(caminho);
        return {
          nome: f,
          caminho: caminho,
          data: stats.mtime,
          tamanho: stats.size
        };
      })
      .sort((a, b) => b.data.getTime() - a.data.getTime());
    
    callback(null, backups);
    
  } catch (error) {
    console.error('❌ Erro ao listar backups:', error);
    callback(error);
  }
}

module.exports = {
  criarBackup,
  restaurarBackup,
  listarBackups
};