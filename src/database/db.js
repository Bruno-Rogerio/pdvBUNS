const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../dados.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar no banco:', err.message);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite');
    inicializarTabelas();
  }
});

function inicializarTabelas() {
  // Tabela de Produtos
  db.run(
    `
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      estoque INTEGER DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      categoria_id INTEGER,
      controlar_estoque INTEGER DEFAULT 1,
      estoque_minimo INTEGER DEFAULT 10,
      disponivel INTEGER DEFAULT 1,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    )
  `,
    (err) => {
      if (err) console.error('❌ Erro ao criar tabela produtos:', err.message);
      else {
        console.log('✅ Tabela produtos OK');
        inserirProdutosIniciais();
      }
    }
  );

  // Tabela de Categorias
  db.run(
    `
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      cor TEXT DEFAULT '#667eea',
      ordem INTEGER DEFAULT 0
    )
  `,
    (err) => {
      if (err)
        console.error('❌ Erro ao criar tabela categorias:', err.message);
      else {
        console.log('✅ Tabela categorias OK');
        inserirCategoriasIniciais();
      }
    }
  );

  // Tabela de Combos
  db.run(
    `
    CREATE TABLE IF NOT EXISTS combos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      preco REAL NOT NULL,
      ativo INTEGER DEFAULT 1,
      disponivel INTEGER DEFAULT 1
    )
  `,
    (err) => {
      if (err) console.error('❌ Erro ao criar tabela combos:', err.message);
      else console.log('✅ Tabela combos OK');
    }
  );

  // Tabela de Itens do Combo
  db.run(
    `
    CREATE TABLE IF NOT EXISTS combos_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      combo_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      FOREIGN KEY (combo_id) REFERENCES combos(id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )
  `,
    (err) => {
      if (err)
        console.error('❌ Erro ao criar tabela combos_itens:', err.message);
      else console.log('✅ Tabela combos_itens OK');
    }
  );

  // Tabela de Vendas
  db.run(
    `
    CREATE TABLE IF NOT EXISTS vendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_hora TEXT NOT NULL,
      total REAL NOT NULL,
      desconto REAL DEFAULT 0,
      total_final REAL NOT NULL,
      quantidade_itens INTEGER DEFAULT 0,
      usuario_id INTEGER,
      status TEXT DEFAULT 'finalizada',
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `,
    (err) => {
      if (err) console.error('❌ Erro ao criar tabela vendas:', err.message);
      else console.log('✅ Tabela vendas OK');
    }
  );

  // Tabela de Formas de Pagamento da Venda
  db.run(
    `
    CREATE TABLE IF NOT EXISTS vendas_pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venda_id INTEGER NOT NULL,
      forma_pagamento TEXT NOT NULL,
      valor REAL NOT NULL,
      FOREIGN KEY (venda_id) REFERENCES vendas(id)
    )
  `,
    (err) => {
      if (err)
        console.error(
          '❌ Erro ao criar tabela vendas_pagamentos:',
          err.message
        );
      else console.log('✅ Tabela vendas_pagamentos OK');
    }
  );

  // Tabela de Itens da Venda
  db.run(
    `
    CREATE TABLE IF NOT EXISTS itens_venda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venda_id INTEGER NOT NULL,
      produto_id INTEGER,
      combo_id INTEGER,
      quantidade INTEGER NOT NULL,
      preco_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      observacao TEXT,
      tipo TEXT DEFAULT 'produto',
      FOREIGN KEY (venda_id) REFERENCES vendas(id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id),
      FOREIGN KEY (combo_id) REFERENCES combos(id)
    )
  `,
    (err) => {
      if (err)
        console.error('❌ Erro ao criar tabela itens_venda:', err.message);
      else console.log('✅ Tabela itens_venda OK');
    }
  );

  // Tabela de Usuários
  db.run(
    `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      login TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('admin', 'caixa')),
      ativo INTEGER DEFAULT 1
    )
  `,
    (err) => {
      if (err) console.error('❌ Erro ao criar tabela usuarios:', err.message);
      else {
        console.log('✅ Tabela usuarios OK');
        inserirUsuariosPadroes();
      }
    }
  );

  // Tabela de Fechamentos de Caixa
  db.run(
    `
    CREATE TABLE IF NOT EXISTS fechamentos_caixa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_hora TEXT NOT NULL,
      usuario_id INTEGER NOT NULL,
      total_dinheiro REAL DEFAULT 0,
      total_debito REAL DEFAULT 0,
      total_credito REAL DEFAULT 0,
      total_pix REAL DEFAULT 0,
      total_geral REAL DEFAULT 0,
      quantidade_vendas INTEGER DEFAULT 0,
      observacoes TEXT,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `,
    (err) => {
      if (err)
        console.error(
          '❌ Erro ao criar tabela fechamentos_caixa:',
          err.message
        );
      else console.log('✅ Tabela fechamentos_caixa OK');
    }
  );

  // Tabela de Impressões
  db.run(
    `
    CREATE TABLE IF NOT EXISTS impressoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venda_id INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('cliente', 'cozinha')),
      data_hora TEXT NOT NULL,
      usuario_id INTEGER,
      FOREIGN KEY (venda_id) REFERENCES vendas(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `,
    (err) => {
      if (err)
        console.error('❌ Erro ao criar tabela impressoes:', err.message);
      else console.log('✅ Tabela impressoes OK');
    }
  );
}

function inserirProdutosIniciais() {
  db.get('SELECT COUNT(*) as total FROM produtos', (err, row) => {
    if (err || row.total > 0) return;

    const produtosIniciais = [
      { nome: 'Coca-Cola 2L', preco: 8.5, estoque: 50 },
      { nome: 'Arroz 5kg', preco: 25.0, estoque: 30 },
      { nome: 'Feijão 1kg', preco: 7.5, estoque: 40 },
      { nome: 'Açúcar 1kg', preco: 4.2, estoque: 60 },
      { nome: 'Café 500g', preco: 12.9, estoque: 25 },
    ];

    const stmt = db.prepare(
      'INSERT INTO produtos (nome, preco, estoque) VALUES (?, ?, ?)'
    );
    produtosIniciais.forEach((produto) => {
      stmt.run(produto.nome, produto.preco, produto.estoque);
    });
    stmt.finalize(() => console.log('✅ Produtos iniciais inseridos!'));
  });
}

function inserirCategoriasIniciais() {
  db.get('SELECT COUNT(*) as total FROM categorias', (err, row) => {
    if (err || row.total > 0) return;

    const categoriasIniciais = [
      { nome: 'Bebidas', cor: '#3498db' },
      { nome: 'Alimentos', cor: '#e74c3c' },
      { nome: 'Limpeza', cor: '#2ecc71' },
      { nome: 'Higiene', cor: '#9b59b6' },
      { nome: 'Outros', cor: '#95a5a6' },
    ];

    const stmt = db.prepare(
      'INSERT INTO categorias (nome, cor, ordem) VALUES (?, ?, ?)'
    );
    categoriasIniciais.forEach((cat, index) =>
      stmt.run(cat.nome, cat.cor, index)
    );
    stmt.finalize(() => console.log('✅ Categorias iniciais inseridas!'));
  });
}

function inserirUsuariosPadroes() {
  db.get('SELECT COUNT(*) as total FROM usuarios', (err, row) => {
    if (err || row.total > 0) return;

    const usuarios = [
      {
        nome: 'Administrador',
        login: 'admin',
        senha: 'admin123',
        tipo: 'admin',
      },
      { nome: 'Caixa', login: 'caixa', senha: 'caixa123', tipo: 'caixa' },
    ];

    const stmt = db.prepare(
      'INSERT INTO usuarios (nome, login, senha, tipo) VALUES (?, ?, ?, ?)'
    );
    usuarios.forEach((user) =>
      stmt.run(user.nome, user.login, user.senha, user.tipo)
    );
    stmt.finalize(() => console.log('✅ Usuários padrões inseridos!'));
  });
}

// ============================================
// FUNÇÕES DE PRODUTOS
// ============================================

function buscarProdutos(callback) {
  db.all('SELECT * FROM produtos WHERE ativo = 1 ORDER BY nome', [], callback);
}

function buscarProdutosComCategoria(callback) {
  db.all(
    `
    SELECT 
      p.*,
      c.nome as categoria_nome,
      c.cor as categoria_cor
    FROM produtos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.ativo = 1
    ORDER BY p.nome
  `,
    [],
    callback
  );
}

function buscarProdutoPorId(id, callback) {
  db.get('SELECT * FROM produtos WHERE id = ?', [id], callback);
}

function inserirProduto(nome, preco, estoque, callback) {
  db.run(
    'INSERT INTO produtos (nome, preco, estoque) VALUES (?, ?, ?)',
    [nome, preco, estoque],
    callback
  );
}

function inserirProdutoCompleto(
  nome,
  preco,
  estoque,
  categoriaId,
  controlarEstoque,
  estoqueMinimo,
  callback
) {
  const estoqueReal = controlarEstoque ? estoque : 999999;
  const estoqueMin = controlarEstoque ? estoqueMinimo || 10 : 0;

  db.run(
    'INSERT INTO produtos (nome, preco, estoque, categoria_id, controlar_estoque, estoque_minimo) VALUES (?, ?, ?, ?, ?, ?)',
    [
      nome,
      preco,
      estoqueReal,
      categoriaId,
      controlarEstoque ? 1 : 0,
      estoqueMin,
    ],
    callback
  );
}

function atualizarProduto(id, nome, preco, estoque, callback) {
  db.run(
    'UPDATE produtos SET nome = ?, preco = ?, estoque = ? WHERE id = ?',
    [nome, preco, estoque, id],
    callback
  );
}

function atualizarProdutoCompleto(
  id,
  nome,
  preco,
  estoque,
  categoriaId,
  controlarEstoque,
  estoqueMinimo,
  callback
) {
  const estoqueReal = controlarEstoque ? estoque : 999999;
  const estoqueMin = controlarEstoque ? estoqueMinimo || 10 : 0;

  db.run(
    'UPDATE produtos SET nome = ?, preco = ?, estoque = ?, categoria_id = ?, controlar_estoque = ?, estoque_minimo = ? WHERE id = ?',
    [
      nome,
      preco,
      estoqueReal,
      categoriaId,
      controlarEstoque ? 1 : 0,
      estoqueMin,
      id,
    ],
    callback
  );
}

function deletarProduto(id, callback) {
  db.run('UPDATE produtos SET ativo = 0 WHERE id = ?', [id], callback);
}

function alternarDisponibilidadeProduto(id, disponivel, callback) {
  db.run(
    'UPDATE produtos SET disponivel = ? WHERE id = ?',
    [disponivel ? 1 : 0, id],
    callback
  );
}

function atualizarEstoque(id, novoEstoque, callback) {
  db.run(
    'UPDATE produtos SET estoque = ? WHERE id = ?',
    [novoEstoque, id],
    callback
  );
}

// ============================================
// FUNÇÕES DE CATEGORIAS
// ============================================

function buscarCategorias(callback) {
  db.all('SELECT * FROM categorias ORDER BY ordem, nome', [], callback);
}

function inserirCategoria(nome, cor, callback) {
  db.run(
    'INSERT INTO categorias (nome, cor) VALUES (?, ?)',
    [nome, cor],
    callback
  );
}

function atualizarCategoria(id, nome, cor, callback) {
  db.run(
    'UPDATE categorias SET nome = ?, cor = ? WHERE id = ?',
    [nome, cor, id],
    callback
  );
}

function deletarCategoria(id, callback) {
  db.run('DELETE FROM categorias WHERE id = ?', [id], callback);
}

function atualizarOrdemCategoria(id, ordem, callback) {
  db.run('UPDATE categorias SET ordem = ? WHERE id = ?', [ordem, id], callback);
}

// ============================================
// FUNÇÕES DE COMBOS
// ============================================

function buscarCombos(callback) {
  db.all('SELECT * FROM combos WHERE ativo = 1 ORDER BY nome', [], callback);
}

function buscarComboCompleto(id, callback) {
  db.get('SELECT * FROM combos WHERE id = ?', [id], (err, combo) => {
    if (err) {
      callback(err);
      return;
    }

    db.all(
      `
      SELECT ci.*, p.nome as produto_nome, p.preco as produto_preco
      FROM combos_itens ci
      JOIN produtos p ON ci.produto_id = p.id
      WHERE ci.combo_id = ?
    `,
      [id],
      (err, itens) => {
        if (err) {
          callback(err);
          return;
        }
        combo.itens = itens;
        callback(null, combo);
      }
    );
  });
}

function inserirCombo(nome, descricao, preco, itens, callback) {
  db.run(
    'INSERT INTO combos (nome, descricao, preco) VALUES (?, ?, ?)',
    [nome, descricao, preco],
    function (err) {
      if (err) {
        callback(err);
        return;
      }

      const comboId = this.lastID;
      const stmt = db.prepare(
        'INSERT INTO combos_itens (combo_id, produto_id, quantidade) VALUES (?, ?, ?)'
      );

      itens.forEach((item) => {
        stmt.run(comboId, item.produto_id, item.quantidade);
      });

      stmt.finalize(() => {
        callback(null, comboId);
      });
    }
  );
}

function atualizarCombo(id, nome, descricao, preco, callback) {
  db.run(
    'UPDATE combos SET nome = ?, descricao = ?, preco = ? WHERE id = ?',
    [nome, descricao, preco, id],
    callback
  );
}

function deletarCombo(id, callback) {
  db.run('UPDATE combos SET ativo = 0 WHERE id = ?', [id], callback);
}

function alternarDisponibilidadeCombo(id, disponivel, callback) {
  db.run(
    'UPDATE combos SET disponivel = ? WHERE id = ?',
    [disponivel ? 1 : 0, id],
    callback
  );
}

// ============================================
// FUNÇÕES DE VENDAS
// ============================================

function inserirVenda(total, quantidadeItens, desconto, usuarioId, callback) {
  const dataHora = new Date().toISOString();
  const totalFinal = total - desconto;

  db.run(
    'INSERT INTO vendas (data_hora, total, desconto, total_final, quantidade_itens, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
    [dataHora, total, desconto, totalFinal, quantidadeItens, usuarioId || null],
    function (err) {
      if (err) {
        callback(err);
        return;
      }
      callback(null, this.lastID);
    }
  );
}

function inserirPagamentoVenda(vendaId, formaPagamento, valor, callback) {
  db.run(
    'INSERT INTO vendas_pagamentos (venda_id, forma_pagamento, valor) VALUES (?, ?, ?)',
    [vendaId, formaPagamento, valor],
    callback
  );
}

function inserirItemVenda(
  vendaId,
  produtoId,
  comboId,
  quantidade,
  precoUnitario,
  observacao,
  tipo,
  callback
) {
  const subtotal = precoUnitario * quantidade;
  db.run(
    'INSERT INTO itens_venda (venda_id, produto_id, combo_id, quantidade, preco_unitario, subtotal, observacao, tipo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      vendaId,
      produtoId,
      comboId,
      quantidade,
      precoUnitario,
      subtotal,
      observacao,
      tipo,
    ],
    callback
  );
}

function buscarVendas(callback) {
  db.all(
    `
    SELECT 
      v.*,
      u.nome as usuario_nome
    FROM vendas v
    LEFT JOIN usuarios u ON v.usuario_id = u.id
    ORDER BY v.data_hora DESC
    LIMIT 1000
  `,
    [],
    callback
  );
}

function buscarVendasPorPeriodo(dataInicio, dataFim, callback) {
  db.all(
    `
    SELECT 
      v.*,
      u.nome as usuario_nome
    FROM vendas v
    LEFT JOIN usuarios u ON v.usuario_id = u.id
    WHERE v.data_hora >= ? AND v.data_hora <= ?
    ORDER BY v.data_hora DESC
  `,
    [dataInicio, dataFim],
    callback
  );
}

function buscarDetalhesVenda(vendaId, callback) {
  db.all(
    `
    SELECT 
      iv.*,
      p.nome as produto_nome,
      c.nome as combo_nome
    FROM itens_venda iv
    LEFT JOIN produtos p ON iv.produto_id = p.id
    LEFT JOIN combos c ON iv.combo_id = c.id
    WHERE iv.venda_id = ?
  `,
    [vendaId],
    callback
  );
}

function buscarPagamentosVenda(vendaId, callback) {
  db.all(
    'SELECT * FROM vendas_pagamentos WHERE venda_id = ?',
    [vendaId],
    callback
  );
}

// ============================================
// FUNÇÕES DE USUÁRIOS
// ============================================

function buscarUsuarios(callback) {
  db.all(
    'SELECT id, nome, login, tipo, ativo FROM usuarios ORDER BY nome',
    [],
    callback
  );
}

function autenticarUsuario(login, senha, callback) {
  db.get(
    'SELECT * FROM usuarios WHERE login = ? AND senha = ? AND ativo = 1',
    [login, senha],
    callback
  );
}

function inserirUsuario(nome, login, senha, tipo, callback) {
  db.run(
    'INSERT INTO usuarios (nome, login, senha, tipo) VALUES (?, ?, ?, ?)',
    [nome, login, senha, tipo],
    callback
  );
}

function atualizarUsuario(id, nome, login, senha, tipo, callback) {
  if (senha) {
    db.run(
      'UPDATE usuarios SET nome = ?, login = ?, senha = ?, tipo = ? WHERE id = ?',
      [nome, login, senha, tipo, id],
      callback
    );
  } else {
    db.run(
      'UPDATE usuarios SET nome = ?, login = ?, tipo = ? WHERE id = ?',
      [nome, login, tipo, id],
      callback
    );
  }
}

function deletarUsuario(id, callback) {
  db.run('UPDATE usuarios SET ativo = 0 WHERE id = ?', [id], callback);
}

// ============================================
// FUNÇÕES DE FECHAMENTO DE CAIXA
// ============================================

function inserirFechamentoCaixa(
  usuarioId,
  totalDinheiro,
  totalDebito,
  totalCredito,
  totalPix,
  totalGeral,
  quantidadeVendas,
  observacoes,
  callback
) {
  const dataHora = new Date().toISOString();

  db.run(
    `INSERT INTO fechamentos_caixa 
    (data_hora, usuario_id, total_dinheiro, total_debito, total_credito, total_pix, total_geral, quantidade_vendas, observacoes) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dataHora,
      usuarioId,
      totalDinheiro,
      totalDebito,
      totalCredito,
      totalPix,
      totalGeral,
      quantidadeVendas,
      observacoes,
    ],
    callback
  );
}

function buscarFechamentos(callback) {
  db.all(
    `
    SELECT 
      f.*,
      u.nome as usuario_nome
    FROM fechamentos_caixa f
    LEFT JOIN usuarios u ON f.usuario_id = u.id
    ORDER BY f.data_hora DESC
    LIMIT 100
  `,
    [],
    callback
  );
}

// ============================================
// FUNÇÕES DE IMPRESSÕES
// ============================================

function registrarImpressao(vendaId, tipo, usuarioId, callback) {
  const dataHora = new Date().toISOString();
  db.run(
    'INSERT INTO impressoes (venda_id, tipo, data_hora, usuario_id) VALUES (?, ?, ?, ?)',
    [vendaId, tipo, dataHora, usuarioId],
    callback
  );
}

function buscarImpressoesVenda(vendaId, callback) {
  db.all(
    `
    SELECT 
      i.*,
      u.nome as usuario_nome
    FROM impressoes i
    LEFT JOIN usuarios u ON i.usuario_id = u.id
    WHERE i.venda_id = ?
    ORDER BY i.data_hora DESC
  `,
    [vendaId],
    callback
  );
}

// ============================================
// EXPORTAR FUNÇÕES
// ============================================

module.exports = {
  db,
  // Produtos
  buscarProdutos,
  buscarProdutosComCategoria,
  buscarProdutoPorId,
  inserirProduto,
  inserirProdutoCompleto,
  atualizarProduto,
  atualizarProdutoCompleto,
  deletarProduto,
  alternarDisponibilidadeProduto,
  atualizarEstoque,
  // Categorias
  buscarCategorias,
  inserirCategoria,
  atualizarCategoria,
  deletarCategoria,
  atualizarOrdemCategoria,
  // Combos
  buscarCombos,
  buscarComboCompleto,
  inserirCombo,
  atualizarCombo,
  deletarCombo,
  alternarDisponibilidadeCombo,
  // Vendas
  inserirVenda,
  inserirPagamentoVenda,
  inserirItemVenda,
  buscarVendas,
  buscarVendasPorPeriodo,
  buscarDetalhesVenda,
  buscarPagamentosVenda,
  // Usuários
  buscarUsuarios,
  autenticarUsuario,
  inserirUsuario,
  atualizarUsuario,
  deletarUsuario,
  // Fechamento
  inserirFechamentoCaixa,
  buscarFechamentos,
  // Impressões
  registrarImpressao,
  buscarImpressoesVenda,
};
