const fs = require('fs');
const path = require('path');

console.log('🚀 Criando estrutura do PDV...\n');

// Estrutura de pastas
const folders = [
  'src',
  'src/components',
  'src/pages',
  'src/services',
  'src/utils',
  'src/database',
  'public',
  'public/css',
];

// Criar pastas
folders.forEach(folder => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    console.log(`✅ Pasta criada: ${folder}`);
  } else {
    console.log(`⚠️  Pasta já existe: ${folder}`);
  }
});

// Criar arquivos iniciais vazios
const files = [
  '.gitignore',
  'package.json',
  'README.md',
  'src/main.js',
  'src/index.html',
  'public/css/styles.css'
];

files.forEach(file => {
  const filePath = path.join(file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
    console.log(`✅ Arquivo criado: ${file}`);
  } else {
    console.log(`⚠️  Arquivo já existe: ${file}`);
  }
});

console.log('\n✨ Estrutura criada com sucesso!');
console.log('📦 Próximo passo: npm install\n');