const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho do banco de dados
const dbPath = path.join(__dirname, '../../dados.db');

// Conectar ao banco
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar no banco:', err.message);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite');
    inicializarTabelas();
  }
});

// Criar tabelas se não existirem
function inicializarTabelas() {
  // Tabela de Produtos
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      estoque INTEGER DEFAULT 0,
      ativo INTEGER DEFAULT 1
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela produtos:', err.message);
    } else {
      console.log('✅ Tabela produtos OK');
      inserirProdutosIniciais();
    }
  });

  // Tabela de Vendas
  db.run(`
    CREATE TABLE IF NOT EXISTS vendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_hora TEXT NOT NULL,
      total REAL NOT NULL,
      forma_pagamento TEXT
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela vendas:', err.message);
    } else {
      console.log('✅ Tabela vendas OK');
    }
  });

  // Tabela de Itens da Venda
  db.run(`
    CREATE TABLE IF NOT EXISTS itens_venda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venda_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      preco_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (venda_id) REFERENCES vendas(id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela itens_venda:', err.message);
    } else {
      console.log('✅ Tabela itens_venda OK');
    }
  });
}

// Inserir produtos iniciais (só se tabela estiver vazia)
function inserirProdutosIniciais() {
  db.get('SELECT COUNT(*) as total FROM produtos', (err, row) => {
    if (err) {
      console.error('❌ Erro ao verificar produtos:', err.message);
      return;
    }

    if (row.total === 0) {
      const produtosIniciais = [
        { nome: 'Coca-Cola 2L', preco: 8.50, estoque: 50 },
        { nome: 'Arroz 5kg', preco: 25.00, estoque: 30 },
        { nome: 'Feijão 1kg', preco: 7.50, estoque: 40 },
        { nome: 'Açúcar 1kg', preco: 4.20, estoque: 60 },
        { nome: 'Café 500g', preco: 12.90, estoque: 25 }
      ];

      const stmt = db.prepare('INSERT INTO produtos (nome, preco, estoque) VALUES (?, ?, ?)');
      
      produtosIniciais.forEach(produto => {
        stmt.run(produto.nome, produto.preco, produto.estoque);
      });

      stmt.finalize(() => {
        console.log('✅ Produtos iniciais inseridos!');
      });
    }
  });
}

// ============================================
// FUNÇÕES DE PRODUTOS
// ============================================

// Buscar todos os produtos ativos
function buscarProdutos(callback) {
  db.all('SELECT * FROM produtos WHERE ativo = 1 ORDER BY nome', [], callback);
}

// Buscar produto por ID
function buscarProdutoPorId(id, callback) {
  db.get('SELECT * FROM produtos WHERE id = ?', [id], callback);
}

// Inserir novo produto
function inserirProduto(nome, preco, estoque, callback) {
  db.run('INSERT INTO produtos (nome, preco, estoque) VALUES (?, ?, ?)', 
    [nome, preco, estoque], 
    callback
  );
}

// Atualizar produto
function atualizarProduto(id, nome, preco, estoque, callback) {
  db.run('UPDATE produtos SET nome = ?, preco = ?, estoque = ? WHERE id = ?',
    [nome, preco, estoque, id],
    callback
  );
}

// Deletar produto (soft delete)
function deletarProduto(id, callback) {
  db.run('UPDATE produtos SET ativo = 0 WHERE id = ?', [id], callback);
}

// ============================================
// FUNÇÕES DE VENDAS
// ============================================

// Registrar nova venda
function registrarVenda(total, formaPagamento, itens, callback) {
  const dataHora = new Date().toISOString();
  
  db.run('INSERT INTO vendas (data_hora, total, forma_pagamento) VALUES (?, ?, ?)',
    [dataHora, total, formaPagamento],
    function(err) {
      if (err) {
        callback(err);
        return;
      }

      const vendaId = this.lastID;
      const stmt = db.prepare('INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)');

      itens.forEach(item => {
        const subtotal = item.preco * item.quantidade;
        stmt.run(vendaId, item.id, item.quantidade, item.preco, subtotal);
      });

      stmt.finalize(() => {
        callback(null, vendaId);
      });
    }
  );
}

// Buscar todas as vendas
function buscarVendas(callback) {
  db.all(`
    SELECT 
      v.id,
      v.data_hora,
      v.total,
      v.forma_pagamento,
      COUNT(iv.id) as quantidade_itens
    FROM vendas v
    LEFT JOIN itens_venda iv ON v.id = iv.venda_id
    GROUP BY v.id
    ORDER BY v.data_hora DESC
    LIMIT 100
  `, [], callback);
}

// Buscar detalhes de uma venda
function buscarDetalhesVenda(vendaId, callback) {
  db.all(`
    SELECT 
      iv.*,
      p.nome as produto_nome
    FROM itens_venda iv
    JOIN produtos p ON iv.produto_id = p.id
    WHERE iv.venda_id = ?
  `, [vendaId], callback);
}

// Exportar funções
module.exports = {
  db,
  buscarProdutos,
  buscarProdutoPorId,
  inserirProduto,
  atualizarProduto,
  deletarProduto,
  registrarVenda,
  buscarVendas,
  buscarDetalhesVenda
};