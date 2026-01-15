const db = require('./database/db');
const exportador = require('./services/exportar');
const backup = require('./services/backup');

// ============================================
// SISTEMA DE SESSÃO (COM FALLBACK)
// ============================================
let sessao;
let usuarioLogado = null;

try {
  sessao = require('./services/sessao');
  usuarioLogado = sessao.obterUsuarioLogado();
} catch (e) {
  console.log('⚠️ Módulo sessao.js não encontrado - criando mock');
  sessao = {
    fazerLogin: (user) => {
      usuarioLogado = user;
      localStorage.setItem('user', JSON.stringify(user));
    },
    fazerLogout: () => {
      usuarioLogado = null;
      localStorage.removeItem('user');
    },
    obterUsuarioLogado: () => {
      if (!usuarioLogado) {
        const saved = localStorage.getItem('user');
        if (saved) usuarioLogado = JSON.parse(saved);
      }
      return usuarioLogado;
    },
    verificarPermissao: () => true,
  };
}

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let carrinho = [];
let produtos = [];
let combos = [];
let vendasAtuais = [];
let estatisticasAtuais = {};
let formasPagamentoVenda = [];

// ============================================
// VERIFICAR LOGIN E INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  verificarEInicializar();
});

function verificarEInicializar() {
  usuarioLogado = sessao.obterUsuarioLogado();

  // Se tiver tabela de usuários, verificar login
  if (db.autenticarUsuario) {
    if (!usuarioLogado) {
      mostrarTelaLogin();
      return;
    }
  } else {
    // Sem sistema de login - criar usuário mock
    usuarioLogado = { id: 1, nome: 'Sistema', tipo: 'admin', login: 'admin' };
  }

  inicializarSistema();
}

// ============================================
// TELA DE LOGIN
// ============================================
function mostrarTelaLogin() {
  document.body.innerHTML = `
    <div class="tela-login">
      <div class="login-container">
        <div class="login-header">
          <h1>🛒 PDV Simples</h1>
          <p>Sistema de Vendas v2.0</p>
        </div>
        
        <form id="formLogin" class="login-form">
          <div class="form-group">
            <label>👤 Usuário</label>
            <input type="text" id="inputLogin" placeholder="Digite seu login" required autofocus>
          </div>
          
          <div class="form-group">
            <label>🔒 Senha</label>
            <input type="password" id="inputSenha" placeholder="Digite sua senha" required>
          </div>
          
          <button type="submit" class="btn btn-primary btn-login">Entrar</button>
          
          <div class="login-info">
            <small>👥 Padrão: admin / admin123</small>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('formLogin').addEventListener('submit', (e) => {
    e.preventDefault();
    realizarLogin();
  });
}

function realizarLogin() {
  const login = document.getElementById('inputLogin').value.trim();
  const senha = document.getElementById('inputSenha').value;

  if (!login || !senha) {
    alert('Preencha todos os campos!');
    return;
  }

  db.autenticarUsuario(login, senha, (err, usuario) => {
    if (err || !usuario) {
      alert('❌ Login ou senha incorretos!');
      document.getElementById('inputSenha').value = '';
      return;
    }

    sessao.fazerLogin(usuario);
    usuarioLogado = usuario;
    location.reload();
  });
}

function fazerLogout() {
  if (confirm('Deseja sair do sistema?')) {
    sessao.fazerLogout();
    location.reload();
  }
}

// ============================================
// INICIALIZAÇÃO DO SISTEMA
// ============================================
function inicializarSistema() {
  carregarDadosIniciais();

  document.body.innerHTML = `
    <div class="container">
      <header>
        <div class="header-content">
          <div class="header-titulo">
            <h1>🛒 PDV Simples</h1>
            <p class="subtitle">Sistema de Vendas v2.0</p>
          </div>
          <div class="header-usuario">
            <span class="usuario-info">
              ${usuarioLogado.tipo === 'admin' ? '👑' : '💰'} ${
    usuarioLogado.nome
  }
            </span>
            <button class="btn btn-secondary btn-sm" onclick="fazerLogout()">🚪 Sair</button>
          </div>
        </div>
      </header>

      <nav class="menu">
        <button class="btn btn-primary" id="btnVendas">💰 Vendas</button>
        <button class="btn btn-secondary" id="btnProdutos">📦 Produtos</button>
        ${
          usuarioLogado.tipo === 'admin' && db.buscarCombos
            ? '<button class="btn btn-secondary" id="btnCombos">🎁 Combos</button>'
            : ''
        }
        <button class="btn btn-secondary" id="btnRelatorios">📊 Relatórios</button>
        ${
          db.buscarFechamentos
            ? '<button class="btn btn-secondary" id="btnFechamento">🔒 Fechamento</button>'
            : ''
        }
        ${
          usuarioLogado.tipo === 'admin' && db.buscarUsuarios
            ? '<button class="btn btn-secondary" id="btnUsuarios">👥 Usuários</button>'
            : ''
        }
      </nav>

      <main id="mainContent"></main>
    </div>
  `;

  configurarEventListeners();

  setTimeout(() => {
    mostrarTelaVendas();
    ativarBotao('btnVendas');
  }, 100);
}

function configurarEventListeners() {
  document.getElementById('btnVendas').addEventListener('click', () => {
    mostrarTelaVendas();
    ativarBotao('btnVendas');
  });

  document.getElementById('btnProdutos').addEventListener('click', () => {
    mostrarTelaProdutos();
    ativarBotao('btnProdutos');
  });

  const btnCombos = document.getElementById('btnCombos');
  if (btnCombos) {
    btnCombos.addEventListener('click', () => {
      mostrarTelaCombos();
      ativarBotao('btnCombos');
    });
  }

  document.getElementById('btnRelatorios').addEventListener('click', () => {
    mostrarTelaRelatorios();
    ativarBotao('btnRelatorios');
  });

  const btnFechamento = document.getElementById('btnFechamento');
  if (btnFechamento) {
    btnFechamento.addEventListener('click', () => {
      mostrarTelaFechamento();
      ativarBotao('btnFechamento');
    });
  }

  const btnUsuarios = document.getElementById('btnUsuarios');
  if (btnUsuarios) {
    btnUsuarios.addEventListener('click', () => {
      mostrarTelaUsuarios();
      ativarBotao('btnUsuarios');
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modais = document.querySelectorAll('.modal-overlay');
      if (modais.length > 0) {
        modais[modais.length - 1].remove();
      }
    }
  });
}

function ativarBotao(btnId) {
  document.querySelectorAll('.menu .btn').forEach((btn) => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  });

  const btnAtivo = document.getElementById(btnId);
  if (btnAtivo) {
    btnAtivo.classList.remove('btn-secondary');
    btnAtivo.classList.add('btn-primary');
  }
}

function carregarDadosIniciais() {
  console.log('📦 Carregando dados...');

  db.buscarProdutosComCategoria((err, rows) => {
    if (err) {
      console.error('❌ Erro ao carregar produtos:', err);
      return;
    }
    produtos = rows || [];
    console.log('✅ Produtos:', produtos.length);
  });

  if (db.buscarCombos) {
    db.buscarCombos((err, rows) => {
      if (!err) {
        combos = rows || [];
        console.log('✅ Combos:', combos.length);
      }
    });
  }
}

// ============================================
// TELA DE VENDAS
// ============================================
function mostrarTelaVendas() {
  carrinho = [];
  formasPagamentoVenda = [];

  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = `
    <div class="tela-vendas">
      <div class="painel-produtos">
        <h2>📦 Produtos e Combos</h2>
        
        <div class="busca-produtos">
          <input type="text" id="inputBusca" placeholder="🔍 Buscar..." />
        </div>
        
        <div class="filtro-categorias" id="filtroCategorias">
          <button class="btn-categoria active" data-tipo="todos">Todos</button>
          ${
            combos.length > 0
              ? '<button class="btn-categoria" data-tipo="combos">🎁 Combos</button>'
              : ''
          }
        </div>
        
        <div class="lista-produtos" id="listaProdutos"></div>
      </div>
      
      <div class="painel-carrinho">
        <h2>🛒 Carrinho</h2>
        <div class="carrinho-itens" id="carrinhoItens">
          <p class="carrinho-vazio">Nenhum item adicionado</p>
        </div>
        
        <div class="carrinho-total">
          <div class="total-linha">
            <span>Subtotal:</span>
            <span>R$ <span id="subtotalVenda">0.00</span></span>
          </div>
          <div class="total-linha total-final">
            <span>Total:</span>
            <span>R$ <span id="totalVenda">0.00</span></span>
          </div>
        </div>
        
        <div class="carrinho-acoes">
          <button class="btn btn-danger" id="btnLimpar">🗑️ Limpar</button>
          <button class="btn btn-success" id="btnFinalizar">✅ Finalizar</button>
        </div>
      </div>
    </div>
  `;

  carregarItensVenda();
  carregarFiltroCategorias();

  document
    .getElementById('btnLimpar')
    .addEventListener('click', limparCarrinho);
  document
    .getElementById('btnFinalizar')
    .addEventListener('click', finalizarVenda);
  document.getElementById('inputBusca').addEventListener('input', (e) => {
    filtrarItens(e.target.value);
  });
}

function carregarFiltroCategorias() {
  db.buscarCategorias((err, categorias) => {
    if (err) return;

    const filtro = document.getElementById('filtroCategorias');
    if (!filtro) return;

    const botoesCat = (categorias || [])
      .map(
        (cat) =>
          `<button class="btn-categoria" data-tipo="categoria" data-id="${cat.id}" style="border-color: ${cat.cor}">${cat.nome}</button>`
      )
      .join('');

    let html =
      '<button class="btn-categoria active" data-tipo="todos">Todos</button>';
    if (combos.length > 0) {
      html +=
        '<button class="btn-categoria" data-tipo="combos">🎁 Combos</button>';
    }
    html += botoesCat;

    filtro.innerHTML = html;

    filtro.querySelectorAll('.btn-categoria').forEach((btn) => {
      btn.addEventListener('click', () => {
        filtro
          .querySelectorAll('.btn-categoria')
          .forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const tipo = btn.getAttribute('data-tipo');
        const id = btn.getAttribute('data-id');

        filtrarPorTipo(tipo, id);
      });
    });
  });
}

function filtrarPorTipo(tipo, categoriaId) {
  const termoBusca = document
    .getElementById('inputBusca')
    .value.toLowerCase()
    .trim();

  let itens = [];

  if (tipo === 'todos') {
    itens = [
      ...produtos.filter((p) => !p.disponivel || p.disponivel === 1),
      ...combos.filter((c) => !c.disponivel || c.disponivel === 1),
    ];
  } else if (tipo === 'combos') {
    itens = combos.filter((c) => !c.disponivel || c.disponivel === 1);
  } else if (categoriaId) {
    itens = produtos.filter(
      (p) =>
        p.categoria_id == categoriaId && (!p.disponivel || p.disponivel === 1)
    );
  }

  if (termoBusca) {
    itens = itens.filter((item) =>
      item.nome.toLowerCase().includes(termoBusca)
    );
  }

  renderizarItens(itens);
}

function carregarItensVenda() {
  const itens = [
    ...produtos.filter((p) => !p.disponivel || p.disponivel === 1),
    ...combos.filter((c) => !c.disponivel || c.disponivel === 1),
  ];
  renderizarItens(itens);
}

function filtrarItens(termo) {
  const termoBusca = termo.toLowerCase().trim();

  if (!termoBusca) {
    carregarItensVenda();
    return;
  }

  const itens = [
    ...produtos.filter(
      (p) =>
        (!p.disponivel || p.disponivel === 1) &&
        p.nome.toLowerCase().includes(termoBusca)
    ),
    ...combos.filter(
      (c) =>
        (!c.disponivel || c.disponivel === 1) &&
        c.nome.toLowerCase().includes(termoBusca)
    ),
  ];

  renderizarItens(itens);
}

function renderizarItens(itens) {
  const container = document.getElementById('listaProdutos');

  if (!container) return;

  if (itens.length === 0) {
    container.innerHTML =
      '<p class="carrinho-vazio">Nenhum item encontrado</p>';
    return;
  }

  container.innerHTML = itens
    .map((item) => {
      const isCombo = item.descricao !== undefined;

      if (isCombo) {
        return `
        <div class="produto-card combo-card" onclick="adicionarAoCarrinho('combo', ${
          item.id
        })">
          <div class="produto-badge">🎁 COMBO</div>
          <div class="produto-nome">${item.nome}</div>
          ${
            item.descricao
              ? `<div class="produto-descricao">${item.descricao}</div>`
              : ''
          }
          <div class="produto-preco">R$ ${item.preco.toFixed(2)}</div>
        </div>
      `;
      } else {
        const categoria = item.categoria_nome
          ? `<div class="produto-categoria" style="background-color: ${item.categoria_cor}">${item.categoria_nome}</div>`
          : '';

        const estoqueDisplay = item.controlar_estoque
          ? `Estoque: ${item.estoque}`
          : 'Estoque: ∞';

        return `
        <div class="produto-card" onclick="adicionarAoCarrinho('produto', ${
          item.id
        })">
          ${categoria}
          <div class="produto-nome">${item.nome}</div>
          <div class="produto-preco">R$ ${item.preco.toFixed(2)}</div>
          <div class="produto-estoque">${estoqueDisplay}</div>
        </div>
      `;
      }
    })
    .join('');
}

function adicionarAoCarrinho(tipo, id) {
  let item;

  if (tipo === 'produto') {
    item = produtos.find((p) => p.id === id);
    if (!item) {
      alert('Produto não encontrado!');
      return;
    }

    if (item.controlar_estoque && item.estoque <= 0) {
      alert('Produto sem estoque!');
      return;
    }
  } else if (tipo === 'combo') {
    item = combos.find((c) => c.id === id);
    if (!item) {
      alert('Combo não encontrado!');
      return;
    }
  }

  const itemCarrinho = carrinho.find((c) => c.tipo === tipo && c.id === id);

  if (itemCarrinho) {
    if (
      tipo === 'produto' &&
      item.controlar_estoque &&
      itemCarrinho.quantidade >= item.estoque
    ) {
      alert(`Estoque insuficiente! Disponível: ${item.estoque}`);
      return;
    }
    itemCarrinho.quantidade++;
  } else {
    carrinho.push({
      tipo: tipo,
      id: id,
      nome: item.nome,
      preco: item.preco,
      quantidade: 1,
      observacao: '',
      controlar_estoque: item.controlar_estoque || false,
      estoque: item.estoque || 0,
    });
  }

  atualizarCarrinho();
}

function atualizarCarrinho() {
  const carrinhoItens = document.getElementById('carrinhoItens');
  const subtotalVenda = document.getElementById('subtotalVenda');
  const totalVenda = document.getElementById('totalVenda');

  if (carrinho.length === 0) {
    carrinhoItens.innerHTML =
      '<p class="carrinho-vazio">Nenhum item adicionado</p>';
    subtotalVenda.textContent = '0.00';
    totalVenda.textContent = '0.00';
    return;
  }

  carrinhoItens.innerHTML = carrinho
    .map(
      (item, index) => `
    <div class="carrinho-item">
      <div class="item-info">
        <span class="item-tipo">${item.tipo === 'combo' ? '🎁' : '📦'}</span>
        <div class="item-detalhes">
          <span class="item-nome">${item.nome}</span>
          ${
            item.observacao
              ? `<small class="item-obs">💬 ${item.observacao}</small>`
              : ''
          }
        </div>
      </div>
      <div class="item-controles">
        <button class="btn-quantidade" onclick="alterarQuantidade(${index}, -1)">-</button>
        <span class="item-quantidade">${item.quantidade}</span>
        <button class="btn-quantidade" onclick="alterarQuantidade(${index}, 1)">+</button>
      </div>
      <div class="item-preco">R$ ${(item.preco * item.quantidade).toFixed(
        2
      )}</div>
      <div class="item-acoes">
        <button class="btn-acao-item" onclick="adicionarObservacao(${index})" title="Observação">💬</button>
        <button class="btn-acao-item btn-remover" onclick="removerDoCarrinho(${index})">✕</button>
      </div>
    </div>
  `
    )
    .join('');

  const subtotal = carrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0
  );
  subtotalVenda.textContent = subtotal.toFixed(2);
  totalVenda.textContent = subtotal.toFixed(2);
}

function alterarQuantidade(index, delta) {
  const item = carrinho[index];
  const novaQuantidade = item.quantidade + delta;

  if (novaQuantidade <= 0) {
    removerDoCarrinho(index);
    return;
  }

  if (
    item.tipo === 'produto' &&
    item.controlar_estoque &&
    novaQuantidade > item.estoque
  ) {
    alert(`Estoque insuficiente! Disponível: ${item.estoque}`);
    return;
  }

  item.quantidade = novaQuantidade;
  atualizarCarrinho();
}

function adicionarObservacao(index) {
  const item = carrinho[index];
  const observacao = prompt(
    `Observação para "${item.nome}":`,
    item.observacao || ''
  );

  if (observacao !== null) {
    item.observacao = observacao.trim();
    atualizarCarrinho();
  }
}

function removerDoCarrinho(index) {
  carrinho.splice(index, 1);
  atualizarCarrinho();
}

function limparCarrinho() {
  if (confirm('Limpar o carrinho?')) {
    carrinho = [];
    atualizarCarrinho();
  }
}

function finalizarVenda() {
  if (carrinho.length === 0) {
    alert('Adicione itens ao carrinho!');
    return;
  }

  const subtotal = carrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0
  );
  abrirModalPagamento(subtotal);
}

// Continua na próxima parte...
// ============================================
// MODAL DE PAGAMENTO COM DIVISÃO
// ============================================

function abrirModalPagamento(subtotal) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modalPagamento';

  const temDivisaoPagamento = db.inserirPagamentoVenda !== undefined;

  modal.innerHTML = `
    <div class="modal ${
      temDivisaoPagamento ? 'modal-pagamento-grande' : 'modal-pagamento'
    }">
      <button class="btn-fechar-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>💳 Finalizar Venda</h2>
      
      <div class="resumo-venda">
        <div class="resumo-linha">
          <span>Subtotal:</span>
          <span>R$ ${subtotal.toFixed(2)}</span>
        </div>
        ${
          temDivisaoPagamento
            ? `
        <div class="resumo-linha">
          <span>Desconto (%):</span>
          <input type="number" id="inputDesconto" min="0" max="100" value="0" step="0.1" class="input-desconto">
        </div>
        `
            : ''
        }
        <div class="resumo-linha total-final-linha">
          <span>Total Final:</span>
          <span class="valor-total">R$ <span id="totalFinalVenda">${subtotal.toFixed(
            2
          )}</span></span>
        </div>
      </div>
      
      ${
        temDivisaoPagamento
          ? `
      <div class="divisao-pagamento">
        <h3>💰 Formas de Pagamento</h3>
        <div id="formasPagamento">
          <div class="forma-pagamento-item" data-index="0">
            <select class="select-forma-pagamento">
              <option value="Dinheiro">💵 Dinheiro</option>
              <option value="Cartão Débito">💳 Débito</option>
              <option value="Cartão Crédito">💳 Crédito</option>
              <option value="PIX">📱 PIX</option>
            </select>
            <input type="number" class="input-valor-pagamento" placeholder="Valor" step="0.01" min="0">
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" id="btnAdicionarPagamento">➕ Adicionar Forma</button>
        
        <div class="resumo-pagamento">
          <div class="resumo-linha">
            <span>Valor Pago:</span>
            <span>R$ <span id="valorPago">0.00</span></span>
          </div>
          <div class="resumo-linha">
            <span>Falta Pagar:</span>
            <span class="text-danger">R$ <span id="faltaPagar">${subtotal.toFixed(
              2
            )}</span></span>
          </div>
          <div class="resumo-linha" id="trocoLinha" style="display: none;">
            <span>Troco:</span>
            <span class="text-success">R$ <span id="valorTroco">0.00</span></span>
          </div>
        </div>
      </div>
      `
          : `
      <div class="form-group">
        <label>Forma de Pagamento *</label>
        <select id="selectFormaPagamento" class="select-pagamento">
          <option value="Dinheiro">💵 Dinheiro</option>
          <option value="Cartão Débito">💳 Débito</option>
          <option value="Cartão Crédito">💳 Crédito</option>
          <option value="PIX">📱 PIX</option>
        </select>
      </div>
      
      <div class="form-group" id="grupoDinheiro">
        <label>Valor Recebido (R$)</label>
        <input type="number" id="inputValorRecebido" placeholder="0.00" step="0.01" min="0">
        <div class="troco-info" id="trocoInfo" style="display: none;">
          <p>💰 Troco: R$ <span id="valorTrocoSimples">0.00</span></p>
        </div>
      </div>
      `
      }
      
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        <button class="btn btn-success" id="btnConfirmarVenda">✅ Confirmar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  if (temDivisaoPagamento) {
    configurarPagamentoDividido(subtotal);
  } else {
    configurarPagamentoSimples(subtotal);
  }
}

let contadorFormas = 1;

function configurarPagamentoDividido(subtotal) {
  const inputDesconto = document.getElementById('inputDesconto');

  inputDesconto.addEventListener('input', () => {
    const descontoPercent = parseFloat(inputDesconto.value) || 0;
    const descontoValor = subtotal * (descontoPercent / 100);
    const totalFinal = subtotal - descontoValor;

    document.getElementById('totalFinalVenda').textContent =
      totalFinal.toFixed(2);
    document.getElementById('faltaPagar').textContent = totalFinal.toFixed(2);

    atualizarResumoPagamento();
  });

  document
    .getElementById('btnAdicionarPagamento')
    .addEventListener('click', () => {
      const container = document.getElementById('formasPagamento');
      const index = contadorFormas++;

      const div = document.createElement('div');
      div.className = 'forma-pagamento-item';
      div.setAttribute('data-index', index);
      div.innerHTML = `
      <select class="select-forma-pagamento">
        <option value="Dinheiro">💵 Dinheiro</option>
        <option value="Cartão Débito">💳 Débito</option>
        <option value="Cartão Crédito">💳 Crédito</option>
        <option value="PIX">📱 PIX</option>
      </select>
      <input type="number" class="input-valor-pagamento" placeholder="Valor" step="0.01" min="0">
      <button class="btn btn-danger btn-sm" onclick="removerFormaPagamento(${index})">✕</button>
    `;

      container.appendChild(div);

      div
        .querySelector('.input-valor-pagamento')
        .addEventListener('input', atualizarResumoPagamento);
      div.querySelector('.input-valor-pagamento').focus();
    });

  document.querySelectorAll('.input-valor-pagamento').forEach((input) => {
    input.addEventListener('input', atualizarResumoPagamento);
  });

  document
    .getElementById('btnConfirmarVenda')
    .addEventListener('click', confirmarVendaDividida);
}

function removerFormaPagamento(index) {
  const item = document.querySelector(
    `.forma-pagamento-item[data-index="${index}"]`
  );
  if (item) {
    item.remove();
    atualizarResumoPagamento();
  }
}

function atualizarResumoPagamento() {
  const inputs = document.querySelectorAll('.input-valor-pagamento');
  let totalPago = 0;

  inputs.forEach((input) => {
    totalPago += parseFloat(input.value) || 0;
  });

  const totalFinal = parseFloat(
    document.getElementById('totalFinalVenda').textContent
  );
  const falta = totalFinal - totalPago;
  const troco = totalPago > totalFinal ? totalPago - totalFinal : 0;

  document.getElementById('valorPago').textContent = totalPago.toFixed(2);
  document.getElementById('faltaPagar').textContent = Math.max(
    0,
    falta
  ).toFixed(2);

  const trocoLinha = document.getElementById('trocoLinha');
  if (troco > 0) {
    trocoLinha.style.display = 'flex';
    document.getElementById('valorTroco').textContent = troco.toFixed(2);
  } else {
    trocoLinha.style.display = 'none';
  }
}

function confirmarVendaDividida() {
  const totalFinal = parseFloat(
    document.getElementById('totalFinalVenda').textContent
  );
  const valorPago = parseFloat(
    document.getElementById('valorPago').textContent
  );

  if (valorPago < totalFinal) {
    alert('Valor pago é menor que o total!');
    return;
  }

  const formasPagamento = [];
  document.querySelectorAll('.forma-pagamento-item').forEach((item) => {
    const select = item.querySelector('.select-forma-pagamento');
    const input = item.querySelector('.input-valor-pagamento');
    const valor = parseFloat(input.value) || 0;

    if (valor > 0) {
      formasPagamento.push({
        forma: select.value,
        valor: valor,
      });
    }
  });

  if (formasPagamento.length === 0) {
    alert('Adicione pelo menos uma forma de pagamento!');
    return;
  }

  const subtotal = carrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0
  );
  const descontoPercent =
    parseFloat(document.getElementById('inputDesconto').value) || 0;
  const descontoValor = subtotal * (descontoPercent / 100);
  const quantidadeItens = carrinho.reduce(
    (acc, item) => acc + item.quantidade,
    0
  );

  db.inserirVenda(
    subtotal,
    quantidadeItens,
    descontoValor,
    usuarioLogado.id,
    (err, vendaId) => {
      if (err) {
        alert('Erro ao finalizar venda!');
        return;
      }

      let pagamentosProcessados = 0;
      formasPagamento.forEach((pag) => {
        db.inserirPagamentoVenda(vendaId, pag.forma, pag.valor, (err) => {
          if (err) console.error('Erro ao inserir pagamento:', err);

          pagamentosProcessados++;

          if (pagamentosProcessados === formasPagamento.length) {
            inserirItensVenda(
              vendaId,
              subtotal,
              descontoValor,
              formasPagamento
            );
          }
        });
      });
    }
  );
}

function configurarPagamentoSimples(subtotal) {
  const selectFormaPagamento = document.getElementById('selectFormaPagamento');
  const grupoDinheiro = document.getElementById('grupoDinheiro');
  const inputValorRecebido = document.getElementById('inputValorRecebido');
  const trocoInfo = document.getElementById('trocoInfo');
  const valorTrocoSimples = document.getElementById('valorTrocoSimples');

  selectFormaPagamento.addEventListener('change', () => {
    if (selectFormaPagamento.value === 'Dinheiro') {
      grupoDinheiro.style.display = 'block';
      setTimeout(() => inputValorRecebido.focus(), 100);
    } else {
      grupoDinheiro.style.display = 'none';
      trocoInfo.style.display = 'none';
    }
  });

  inputValorRecebido.addEventListener('input', () => {
    const valorRecebido = parseFloat(inputValorRecebido.value) || 0;
    const troco = valorRecebido - subtotal;

    if (troco >= 0) {
      trocoInfo.style.display = 'block';
      valorTrocoSimples.textContent = troco.toFixed(2);
    } else {
      trocoInfo.style.display = 'none';
    }
  });

  document.getElementById('btnConfirmarVenda').addEventListener('click', () => {
    confirmarVendaSimples(subtotal);
  });
}

function confirmarVendaSimples(subtotal) {
  const formaPagamento = document.getElementById('selectFormaPagamento').value;
  const valorRecebidoInput =
    document.getElementById('inputValorRecebido').value;

  if (formaPagamento === 'Dinheiro' && !valorRecebidoInput) {
    alert('Informe o valor recebido!');
    return;
  }

  const valorRecebido =
    formaPagamento === 'Dinheiro' ? parseFloat(valorRecebidoInput) : subtotal;
  const troco = formaPagamento === 'Dinheiro' ? valorRecebido - subtotal : 0;

  if (formaPagamento === 'Dinheiro' && valorRecebido < subtotal) {
    alert('Valor recebido é menor que o total!');
    return;
  }

  const quantidadeItens = carrinho.reduce(
    (acc, item) => acc + item.quantidade,
    0
  );

  db.registrarVenda(subtotal, formaPagamento, carrinho, (err, vendaId) => {
    if (err) {
      alert('Erro ao finalizar venda!');
      return;
    }

    carrinho.forEach((item) => {
      if (item.tipo === 'produto' && item.controlar_estoque) {
        const produto = produtos.find((p) => p.id === item.id);
        if (produto && db.atualizarEstoque) {
          const novoEstoque = produto.estoque - item.quantidade;
          db.atualizarEstoque(item.id, novoEstoque, (err) => {
            if (err) console.error('Erro ao atualizar estoque:', err);
          });
        }
      }
    });

    document.getElementById('modalPagamento').remove();

    let mensagem = `✅ Venda #${vendaId} finalizada!\n\n`;
    mensagem += `Total: R$ ${subtotal.toFixed(2)}\n`;
    mensagem += `Pagamento: ${formaPagamento}\n`;

    if (formaPagamento === 'Dinheiro' && troco > 0) {
      mensagem += `\n💰 TROCO: R$ ${troco.toFixed(2)}`;
    }

    alert(mensagem);

    carrinho = [];
    atualizarCarrinho();
    carregarDadosIniciais();
  });
}

function inserirItensVenda(vendaId, subtotal, desconto, formasPagamento) {
  let itensProcessados = 0;

  carrinho.forEach((item) => {
    const produtoId = item.tipo === 'produto' ? item.id : null;
    const comboId = item.tipo === 'combo' ? item.id : null;

    db.inserirItemVenda(
      vendaId,
      produtoId,
      comboId,
      item.quantidade,
      item.preco,
      item.observacao || null,
      item.tipo,
      (err) => {
        if (err) {
          console.error('Erro ao inserir item:', err);
          return;
        }

        if (item.tipo === 'produto' && item.controlar_estoque) {
          const produto = produtos.find((p) => p.id === item.id);
          if (produto) {
            const novoEstoque = produto.estoque - item.quantidade;
            db.atualizarEstoque(item.id, novoEstoque, (err) => {
              if (err) console.error('Erro ao atualizar estoque:', err);
            });
          }
        }

        itensProcessados++;

        if (itensProcessados === carrinho.length) {
          finalizarVendaComSucesso(
            vendaId,
            subtotal,
            desconto,
            formasPagamento
          );
        }
      }
    );
  });
}

function finalizarVendaComSucesso(
  vendaId,
  subtotal,
  desconto,
  formasPagamento
) {
  document.getElementById('modalPagamento').remove();

  const totalFinal = subtotal - desconto;

  let mensagem = `✅ Venda #${vendaId} finalizada!\n\n`;
  mensagem += `Total: R$ ${totalFinal.toFixed(2)}\n`;

  if (formasPagamento.length > 1) {
    mensagem += '\nPagamentos:\n';
    formasPagamento.forEach((p) => {
      mensagem += `  ${p.forma}: R$ ${p.valor.toFixed(2)}\n`;
    });
  } else {
    mensagem += `Pagamento: ${formasPagamento[0].forma}\n`;
  }

  alert(mensagem);

  carrinho = [];
  atualizarCarrinho();
  carregarDadosIniciais();
}

// Continua na parte 3...

// ============================================
// TELA DE PRODUTOS (COMPLETA E FUNCIONAL)
// ============================================
function mostrarTelaProdutos() {
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = `
    <div class="tela-produtos">
      <div class="produtos-header">
        <h2>📦 Produtos</h2>
        <div class="produtos-acoes">
          <button class="btn btn-secondary" id="btnCategorias">🏷️ Categorias</button>
          <button class="btn btn-primary" id="btnNovoProduto">➕ Novo</button>
        </div>
      </div>
      <div class="tabela-container">
        <table class="tabela-produtos">
          <thead><tr><th>ID</th><th>Nome</th><th>Preço</th><th>Estoque</th><th>Ações</th></tr></thead>
          <tbody id="listaProdutosTabela"></tbody>
        </table>
      </div>
    </div>
  `;
  carregarTabelaProdutos();
  document.getElementById('btnNovoProduto').onclick = () => abrirModalProduto();
  document.getElementById('btnCategorias').onclick = abrirModalCategorias;
}

function carregarTabelaProdutos() {
  const tbody = document.getElementById('listaProdutosTabela');
  if (produtos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center">Nenhum produto</td></tr>';
    return;
  }
  tbody.innerHTML = produtos
    .map(
      (p) => `
    <tr>
      <td>${p.id}</td>
      <td>${p.nome}${
        p.categoria_nome
          ? ` <span class="badge" style="background:${p.categoria_cor}">${p.categoria_nome}</span>`
          : ''
      }</td>
      <td>R$ ${p.preco.toFixed(2)}</td>
      <td>${p.controlar_estoque ? p.estoque + ' ✅' : '∞ ❌'}</td>
      <td>
        <button class="btn-acao" onclick="editarProduto(${p.id})">✏️</button>
        ${
          usuarioLogado.tipo === 'admin'
            ? `<button class="btn-acao btn-deletar" onclick="deletarProduto(${p.id})">🗑️</button>`
            : ''
        }
      </td>
    </tr>
  `
    )
    .join('');
}

function abrirModalProduto(produtoId = null) {
  const produto = produtoId ? produtos.find((p) => p.id === produtoId) : null;
  db.buscarCategorias((err, categorias) => {
    if (err) return alert('Erro!');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    const optsCat = (categorias || [])
      .map(
        (c) =>
          `<option value="${c.id}" ${
            produto && produto.categoria_id === c.id ? 'selected' : ''
          }>${c.nome}</option>`
      )
      .join('');
    modal.innerHTML = `
      <div class="modal">
        <button class="btn-fechar-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <h2>${produto ? '✏️ Editar' : '➕ Novo'} Produto</h2>
        <form id="formProduto">
          <div class="form-group"><label>Nome *</label><input type="text" id="inputNome" value="${
            produto ? produto.nome : ''
          }" required></div>
          <div class="form-group"><label>Preço *</label><input type="number" id="inputPreco" step="0.01" value="${
            produto ? produto.preco : ''
          }" required></div>
          <div class="form-group"><label>Categoria</label><select id="selectCategoria"><option value="">Sem categoria</option>${optsCat}</select></div>
          <div class="form-group"><label><input type="checkbox" id="checkEstoque" ${
            produto && produto.controlar_estoque ? 'checked' : ''
          }> Controlar estoque</label></div>
          <div id="camposEstoque" style="${
            produto && produto.controlar_estoque ? '' : 'display:none'
          }">
            <div class="form-group"><label>Estoque</label><input type="number" id="inputEstoque" value="${
              produto && produto.controlar_estoque ? produto.estoque : 0
            }"></div>
            <div class="form-group"><label>Mínimo</label><input type="number" id="inputEstoqueMin" value="${
              produto ? produto.estoque_minimo || 10 : 10
            }"></div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
            <button type="submit" class="btn btn-success">Salvar</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('checkEstoque').onchange = (e) => {
      document.getElementById('camposEstoque').style.display = e.target.checked
        ? 'block'
        : 'none';
    };
    document.getElementById('formProduto').onsubmit = (e) => {
      e.preventDefault();
      salvarProduto(produtoId);
    };
  });
}

function salvarProduto(produtoId) {
  const nome = document.getElementById('inputNome').value.trim();
  const preco = parseFloat(document.getElementById('inputPreco').value);
  const categoriaId = document.getElementById('selectCategoria').value || null;
  const controlarEstoque = document.getElementById('checkEstoque').checked;
  const estoque = controlarEstoque
    ? parseInt(document.getElementById('inputEstoque').value)
    : 0;
  const estoqueMin = controlarEstoque
    ? parseInt(document.getElementById('inputEstoqueMin').value)
    : 0;
  if (!nome || isNaN(preco)) return alert('Preencha os campos!');
  const cb = (err) => {
    if (err) return alert('Erro!');
    alert('Salvo!');
    document.querySelector('.modal-overlay').remove();
    carregarDadosIniciais();
    setTimeout(carregarTabelaProdutos, 200);
  };
  if (produtoId) {
    db.atualizarProdutoCompleto(
      produtoId,
      nome,
      preco,
      estoque,
      categoriaId,
      controlarEstoque,
      estoqueMin,
      cb
    );
  } else {
    db.inserirProdutoCompleto(
      nome,
      preco,
      estoque,
      categoriaId,
      controlarEstoque,
      estoqueMin,
      cb
    );
  }
}

function editarProduto(id) {
  abrirModalProduto(id);
}
function deletarProduto(id) {
  if (!confirm('Deletar?')) return;
  db.deletarProduto(id, (err) => {
    if (err) return alert('Erro!');
    alert('Deletado!');
    carregarDadosIniciais();
    setTimeout(carregarTabelaProdutos, 200);
  });
}

function abrirModalCategorias() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <button class="btn-fechar-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>🏷️ Categorias</h2>
      <div class="form-group">
        <div style="display:flex;gap:10px">
          <input type="text" id="inputNovaCat" placeholder="Nome" style="flex:1">
          <input type="color" id="inputCorCat" value="#667eea">
          <button class="btn btn-primary" onclick="adicionarCategoria()">+</button>
        </div>
      </div>
      <div id="listaCategorias"></div>
    </div>
  `;
  document.body.appendChild(modal);
  carregarListaCategorias();
}

function carregarListaCategorias() {
  db.buscarCategorias((err, cats) => {
    const lista = document.getElementById('listaCategorias');
    if (!lista) return;
    if (!cats || cats.length === 0) {
      lista.innerHTML = '<p class="text-center text-muted">Nenhuma</p>';
      return;
    }
    lista.innerHTML = cats
      .map(
        (c) => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #ddd;border-radius:5px;margin:5px 0">
        <div style="width:30px;height:30px;background:${c.cor};border-radius:5px"></div>
        <span style="flex:1">${c.nome}</span>
        <button class="btn-acao btn-deletar" onclick="deletarCategoria(${c.id})">🗑️</button>
      </div>
    `
      )
      .join('');
  });
}

function adicionarCategoria() {
  const nome = document.getElementById('inputNovaCat').value.trim();
  const cor = document.getElementById('inputCorCat').value;
  if (!nome) return alert('Digite o nome!');
  db.inserirCategoria(nome, cor, (err) => {
    if (err) return alert('Erro!');
    document.getElementById('inputNovaCat').value = '';
    carregarListaCategorias();
  });
}

function deletarCategoria(id) {
  if (!confirm('Deletar?')) return;
  db.deletarCategoria(id, (err) => {
    if (err) return alert('Erro!');
    carregarListaCategorias();
    carregarDadosIniciais();
  });
}

// ============================================
// TELA DE COMBOS
// ============================================
function mostrarTelaCombos() {
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = `
    <div class="tela-combos">
      <div class="combos-header">
        <h2>🎁 Combos</h2>
        <button class="btn btn-primary" id="btnNovoCombo">➕ Novo</button>
      </div>
      <div class="tabela-container">
        <table class="tabela-produtos">
          <thead><tr><th>ID</th><th>Nome</th><th>Preço</th><th>Ações</th></tr></thead>
          <tbody id="listaCombosTabela"></tbody>
        </table>
      </div>
    </div>
  `;
  carregarTabelaCombos();
  document.getElementById('btnNovoCombo').onclick = () =>
    alert('Função de combos em desenvolvimento');
}

function carregarTabelaCombos() {
  const tbody = document.getElementById('listaCombosTabela');
  if (combos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center">Nenhum combo</td></tr>';
    return;
  }
  tbody.innerHTML = combos
    .map(
      (c) => `
    <tr><td>${c.id}</td><td>${c.nome}</td><td>R$ ${c.preco.toFixed(
        2
      )}</td><td>-</td></tr>
  `
    )
    .join('');
}

// ============================================
// TELA DE RELATÓRIOS
// ============================================
function mostrarTelaRelatorios() {
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = `
    <div class="tela-relatorios">
      <h2>📊 Relatórios</h2>
      <div class="filtros-relatorio">
        <select id="filtroPeriodo" class="select-filtro">
          <option value="todos">Todos</option>
          <option value="hoje">Hoje</option>
          <option value="semana">Semana</option>
          <option value="mes">Mês</option>
        </select>
        <button class="btn btn-primary" id="btnAtualizar">🔄</button>
      </div>
      <div class="cards-estatisticas">
        <div class="card-stat"><div class="card-stat-icone">💰</div><div class="card-stat-info"><p>Total</p><h3 id="statTotal">R$ 0.00</h3></div></div>
        <div class="card-stat"><div class="card-stat-icone">🛒</div><div class="card-stat-info"><p>Vendas</p><h3 id="statVendas">0</h3></div></div>
      </div>
      <div class="tabela-container">
        <table class="tabela-produtos">
          <thead><tr><th>ID</th><th>Data</th><th>Total</th><th>Ações</th></tr></thead>
          <tbody id="listaVendas"></tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById('btnAtualizar').onclick = carregarRelatorios;
  carregarRelatorios();
}

function carregarRelatorios() {
  const periodo = document.getElementById('filtroPeriodo').value;
  db.buscarVendas((err, vendas) => {
    if (err) return;
    let filtradas = filtrarPorPeriodo(vendas || [], periodo);
    const total = filtradas.reduce((a, v) => a + (v.total_final || v.total), 0);
    document.getElementById('statTotal').textContent = `R$ ${total.toFixed(2)}`;
    document.getElementById('statVendas').textContent = filtradas.length;
    const tbody = document.getElementById('listaVendas');
    if (filtradas.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="text-center">Nenhuma venda</td></tr>';
      return;
    }
    tbody.innerHTML = filtradas
      .map((v) => {
        const data = new Date(v.data_hora).toLocaleString('pt-BR');
        return `
        <tr>
          <td>#${v.id}</td>
          <td>${data}</td>
          <td>R$ ${(v.total_final || v.total).toFixed(2)}</td>
          <td><button class="btn-acao" onclick="verDetalhesVenda(${
            v.id
          })">👁️</button></td>
        </tr>
      `;
      })
      .join('');
  });
}

function filtrarPorPeriodo(vendas, periodo) {
  const agora = new Date();
  switch (periodo) {
    case 'hoje':
      const hoje = new Date(
        agora.getFullYear(),
        agora.getMonth(),
        agora.getDate()
      );
      return vendas.filter((v) => new Date(v.data_hora) >= hoje);
    case 'semana':
      const semana = new Date(agora);
      semana.setDate(agora.getDate() - agora.getDay());
      semana.setHours(0, 0, 0, 0);
      return vendas.filter((v) => new Date(v.data_hora) >= semana);
    case 'mes':
      const mes = new Date(agora.getFullYear(), agora.getMonth(), 1);
      return vendas.filter((v) => new Date(v.data_hora) >= mes);
    default:
      return vendas;
  }
}

function verDetalhesVenda(vendaId) {
  db.buscarDetalhesVenda(vendaId, (err, itens) => {
    if (err) return alert('Erro!');
    let det = `Venda #${vendaId}\n\n`;
    itens.forEach((i) => {
      det += `${i.quantidade}x ${i.produto_nome || i.combo_nome}\n`;
      det += `  R$ ${i.preco_unitario.toFixed(2)} = R$ ${i.subtotal.toFixed(
        2
      )}\n`;
      if (i.observacao) det += `  💬 ${i.observacao}\n`;
      det += '\n';
    });
    const total = itens.reduce((a, i) => a + i.subtotal, 0);
    det += `TOTAL: R$ ${total.toFixed(2)}`;
    alert(det);
  });
}

// ============================================
// TELA DE FECHAMENTO
// ============================================
function mostrarTelaFechamento() {
  if (!db.buscarFechamentos) {
    alert('Função de fechamento não disponível');
    return;
  }
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = `
    <div class="tela-fechamento">
      <h2>🔒 Fechamento de Caixa</h2>
      <p>Função em desenvolvimento</p>
    </div>
  `;
}

// ============================================
// TELA DE USUÁRIOS
// ============================================
function mostrarTelaUsuarios() {
  if (!db.buscarUsuarios) {
    alert('Função de usuários não disponível');
    return;
  }
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = `
    <div class="tela-usuarios">
      <h2>👥 Usuários</h2>
      <p>Função em desenvolvimento</p>
    </div>
  `;
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================
window.fazerLogout = fazerLogout;
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.alterarQuantidade = alterarQuantidade;
window.adicionarObservacao = adicionarObservacao;
window.removerDoCarrinho = removerDoCarrinho;
window.removerFormaPagamento = removerFormaPagamento;
window.editarProduto = editarProduto;
window.deletarProduto = deletarProduto;
window.adicionarCategoria = adicionarCategoria;
window.deletarCategoria = deletarCategoria;
window.verDetalhesVenda = verDetalhesVenda;

console.log('✅ PDV v2.0 - Sistema completo carregado!');
