const db = require('./database/db');
const exportador = require('./services/exportar');
const backup = require('./services/backup');
const sessao = require('./services/sessao');

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let carrinho = [];
let produtos = [];
let combos = [];
let vendasAtuais = [];
let estatisticasAtuais = {};
let usuarioLogado = null;

// Elementos do DOM
const appContainer = document.getElementById('app');

// ============================================
// INICIALIZAÇÃO
// ============================================
verificarLogin();

// ============================================
// SISTEMA DE LOGIN
// ============================================

function verificarLogin() {
  usuarioLogado = sessao.obterUsuarioLogado();
  
  if (!usuarioLogado) {
    mostrarTelaLogin();
  } else {
    inicializarSistema();
  }
}

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
            <small>👥 Admin: admin / admin123</small>
            <small>💰 Caixa: caixa / caixa123</small>
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
    alert('Por favor, preencha todos os campos!');
    return;
  }

  db.autenticarUsuario(login, senha, (err, usuario) => {
    if (err || !usuario) {
      alert('❌ Login ou senha incorretos!');
      document.getElementById('inputSenha').value = '';
      document.getElementById('inputSenha').focus();
      return;
    }

    sessao.fazerLogin(usuario);
    usuarioLogado = usuario;
    
    alert(`✅ Bem-vindo(a), ${usuario.nome}!`);
    
    // Recarregar a página para inicializar o sistema
    location.reload();
  });
}

function fazerLogout() {
  if (confirm('Deseja realmente sair do sistema?')) {
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
              ${usuarioLogado.tipo === 'admin' ? '👑' : '💰'} ${usuarioLogado.nome}
            </span>
            <button class="btn btn-secondary btn-sm" onclick="fazerLogout()">🚪 Sair</button>
          </div>
        </div>
      </header>

      <nav class="menu" id="menuPrincipal">
        <button class="btn btn-primary" id="btnVendas">💰 Vendas</button>
        <button class="btn btn-secondary" id="btnProdutos">📦 Produtos</button>
        ${usuarioLogado.tipo === 'admin' ? '<button class="btn btn-secondary" id="btnCombos">🎁 Combos</button>' : ''}
        <button class="btn btn-secondary" id="btnRelatorios">📊 Relatórios</button>
        <button class="btn btn-secondary" id="btnFechamento">🔒 Fechamento</button>
        ${usuarioLogado.tipo === 'admin' ? '<button class="btn btn-secondary" id="btnUsuarios">👥 Usuários</button>' : ''}
      </nav>

      <main id="mainContent"></main>
    </div>
  `;

  // Event listeners dos menus
  document.getElementById('btnVendas').addEventListener('click', () => {
    mostrarTelaVendas();
    ativarBotao('btnVendas');
  });

  document.getElementById('btnProdutos').addEventListener('click', () => {
    mostrarTelaProdutos();
    ativarBotao('btnProdutos');
  });

  if (usuarioLogado.tipo === 'admin') {
    document.getElementById('btnCombos').addEventListener('click', () => {
      mostrarTelaCombos();
      ativarBotao('btnCombos');
    });
    
    document.getElementById('btnUsuarios').addEventListener('click', () => {
      mostrarTelaUsuarios();
      ativarBotao('btnUsuarios');
    });
  }

  document.getElementById('btnRelatorios').addEventListener('click', () => {
    mostrarTelaRelatorios();
    ativarBotao('btnRelatorios');
  });

  document.getElementById('btnFechamento').addEventListener('click', () => {
    mostrarTelaFechamento();
    ativarBotao('btnFechamento');
  });

  // Atalhos de teclado
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modais = document.querySelectorAll('.modal-overlay');
      if (modais.length > 0) {
        modais[modais.length - 1].remove();
      }
    }
  });

  // Iniciar na tela de vendas
  setTimeout(() => {
    mostrarTelaVendas();
    ativarBotao('btnVendas');
  }, 100);
}

function ativarBotao(btnId) {
  document.querySelectorAll('.menu .btn').forEach(btn => {
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
  db.buscarProdutosComCategoria((err, rows) => {
    if (err) {
      console.error('❌ Erro ao carregar produtos:', err);
      return;
    }
    produtos = rows;
    console.log('✅ Produtos carregados:', produtos.length);
  });

  db.buscarCombos((err, rows) => {
    if (err) {
      console.error('❌ Erro ao carregar combos:', err);
      return;
    }
    combos = rows;
    console.log('✅ Combos carregados:', combos.length);
  });
}

// ============================================
// TELA DE VENDAS
// ============================================

function mostrarTelaVendas() {
  carrinho = [];
  
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = `
    <div class="tela-vendas">
      <div class="painel-produtos">
        <h2>📦 Produtos Disponíveis</h2>
        
        <div class="busca-produtos">
          <input type="text" id="inputBusca" placeholder="🔍 Buscar produtos e combos..." />
        </div>
        
        <div class="filtro-categorias" id="filtroCategorias">
          <button class="btn-categoria active" data-categoria="" data-tipo="todos">Todos</button>
          <button class="btn-categoria" data-tipo="combos">🎁 Combos</button>
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
          <div class="total-linha desconto-linha" id="descontoLinha" style="display: none;">
            <span>Desconto:</span>
            <span class="text-danger">- R$ <span id="descontoVenda">0.00</span></span>
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

  carregarProdutosECombos();
  carregarFiltroCategorias();

  document.getElementById('btnLimpar').addEventListener('click', limparCarrinho);
  document.getElementById('btnFinalizar').addEventListener('click', finalizarVenda);
  document.getElementById('inputBusca').addEventListener('input', (e) => {
    filtrarProdutosECombos(e.target.value);
  });
}

function carregarFiltroCategorias() {
  db.buscarCategorias((err, categorias) => {
    if (err) return;

    const filtro = document.getElementById('filtroCategorias');
    if (!filtro) return;

    const botoesCategorias = categorias
      .map(cat => `<button class="btn-categoria" data-categoria="${cat.id}" data-tipo="categoria" style="border-color: ${cat.cor}">${cat.nome}</button>`)
      .join('');

    filtro.innerHTML = `
      <button class="btn-categoria active" data-categoria="" data-tipo="todos">Todos</button>
      <button class="btn-categoria" data-tipo="combos">🎁 Combos</button>
      ${botoesCategorias}
    `;

    filtro.querySelectorAll('.btn-categoria').forEach(btn => {
      btn.addEventListener('click', () => {
        filtro.querySelectorAll('.btn-categoria').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tipo = btn.getAttribute('data-tipo');
        const categoriaId = btn.getAttribute('data-categoria');
        
        filtrarPorCategoriaETipo(tipo, categoriaId);
      });
    });
  });
}

function filtrarPorCategoriaETipo(tipo, categoriaId) {
  const listaProdutos = document.getElementById('listaProdutos');
  const termoBusca = document.getElementById('inputBusca').value.toLowerCase().trim();
  
  let itens = [];
  
  if (tipo === 'todos') {
    itens = [...produtos.filter(p => p.disponivel), ...combos.filter(c => c.disponivel)];
  } else if (tipo === 'combos') {
    itens = combos.filter(c => c.disponivel);
  } else if (categoriaId) {
    itens = produtos.filter(p => p.categoria_id == categoriaId && p.disponivel);
  }
  
  if (termoBusca) {
    itens = itens.filter(item => item.nome.toLowerCase().includes(termoBusca));
  }
  
  renderizarItens(itens);
}

function carregarProdutosECombos() {
  const listaProdutos = document.getElementById('listaProdutos');
  const itens = [...produtos.filter(p => p.disponivel), ...combos.filter(c => c.disponivel)];
  renderizarItens(itens);
}

function filtrarProdutosECombos(termo) {
  const termoBusca = termo.toLowerCase().trim();
  
  if (!termoBusca) {
    carregarProdutosECombos();
    return;
  }
  
  const itensFiltrados = [
    ...produtos.filter(p => p.disponivel && p.nome.toLowerCase().includes(termoBusca)),
    ...combos.filter(c => c.disponivel && c.nome.toLowerCase().includes(termoBusca))
  ];
  
  renderizarItens(itensFiltrados);
}

function renderizarItens(itens) {
  const listaProdutos = document.getElementById('listaProdutos');
  
  if (itens.length === 0) {
    listaProdutos.innerHTML = '<p class="carrinho-vazio">Nenhum item encontrado</p>';
    return;
  }
  
  listaProdutos.innerHTML = itens.map(item => {
    const isCombo = item.descricao !== undefined;
    
    if (isCombo) {
      return `
        <div class="produto-card combo-card" onclick="adicionarAoCarrinho('combo', ${item.id})">
          <div class="produto-badge">🎁 COMBO</div>
          <div class="produto-nome">${item.nome}</div>
          ${item.descricao ? `<div class="produto-descricao">${item.descricao}</div>` : ''}
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
        <div class="produto-card" onclick="adicionarAoCarrinho('produto', ${item.id})">
          ${categoria}
          <div class="produto-nome">${item.nome}</div>
          <div class="produto-preco">R$ ${item.preco.toFixed(2)}</div>
          <div class="produto-estoque">${estoqueDisplay}</div>
        </div>
      `;
    }
  }).join('');
}

function adicionarAoCarrinho(tipo, id) {
  let item;
  
  if (tipo === 'produto') {
    item = produtos.find(p => p.id === id);
    if (!item || !item.disponivel) {
      alert('Produto não disponível!');
      return;
    }
    
    if (item.controlar_estoque && item.estoque <= 0) {
      alert('Produto sem estoque!');
      return;
    }
  } else if (tipo === 'combo') {
    item = combos.find(c => c.id === id);
    if (!item || !item.disponivel) {
      alert('Combo não disponível!');
      return;
    }
  }
  
  const itemCarrinho = carrinho.find(c => c.tipo === tipo && c.id === id);
  
  if (itemCarrinho) {
    if (tipo === 'produto' && item.controlar_estoque && itemCarrinho.quantidade >= item.estoque) {
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
      estoque: item.estoque || 0
    });
  }
  
  atualizarCarrinho();
}

function atualizarCarrinho() {
  const carrinhoItens = document.getElementById('carrinhoItens');
  const subtotalVenda = document.getElementById('subtotalVenda');
  const totalVenda = document.getElementById('totalVenda');
  
  if (carrinho.length === 0) {
    carrinhoItens.innerHTML = '<p class="carrinho-vazio">Nenhum item adicionado</p>';
    subtotalVenda.textContent = '0.00';
    totalVenda.textContent = '0.00';
    return;
  }
  
  carrinhoItens.innerHTML = carrinho.map((item, index) => `
    <div class="carrinho-item">
      <div class="item-info">
        <span class="item-tipo">${item.tipo === 'combo' ? '🎁' : '📦'}</span>
        <div class="item-detalhes">
          <span class="item-nome">${item.nome}</span>
          ${item.observacao ? `<small class="item-obs">💬 ${item.observacao}</small>` : ''}
        </div>
      </div>
      <div class="item-controles">
        <button class="btn-quantidade" onclick="alterarQuantidade(${index}, -1)">-</button>
        <span class="item-quantidade">${item.quantidade}</span>
        <button class="btn-quantidade" onclick="alterarQuantidade(${index}, 1)">+</button>
      </div>
      <div class="item-preco">R$ ${(item.preco * item.quantidade).toFixed(2)}</div>
      <div class="item-acoes">
        <button class="btn-acao-item" onclick="adicionarObservacao(${index})" title="Adicionar observação">💬</button>
        <button class="btn-acao-item btn-remover" onclick="removerDoCarrinho(${index})">✕</button>
      </div>
    </div>
  `).join('');
  
  const subtotal = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
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
  
  if (item.tipo === 'produto' && item.controlar_estoque && novaQuantidade > item.estoque) {
    alert(`Estoque insuficiente! Disponível: ${item.estoque}`);
    return;
  }
  
  item.quantidade = novaQuantidade;
  atualizarCarrinho();
}

function adicionarObservacao(index) {
  const item = carrinho[index];
  const observacao = prompt(`Observação para "${item.nome}":`, item.observacao || '');
  
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
  if (confirm('Deseja realmente limpar o carrinho?')) {
    carrinho = [];
    atualizarCarrinho();
  }
}

function finalizarVenda() {
  if (carrinho.length === 0) {
    alert('Adicione produtos ao carrinho antes de finalizar!');
    return;
  }
  
  const total = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  abrirModalPagamento(total);
}

// ============================================
// MODAL DE PAGAMENTO COM DIVISÃO E DESCONTO
// ============================================

function abrirModalPagamento(subtotal) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modalPagamento';
  
  modal.innerHTML = `
    <div class="modal modal-pagamento-grande">
      <button class="btn-fechar-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>💳 Finalizar Venda</h2>
      
      <div class="resumo-venda">
        <div class="resumo-linha">
          <span>Subtotal:</span>
          <span class="valor-destaque">R$ ${subtotal.toFixed(2)}</span>
        </div>
        <div class="resumo-linha desconto-linha">
          <span>Desconto (%):</span>
          <input type="number" id="inputDesconto" min="0" max="100" value="0" step="0.1" class="input-desconto">
        </div>
        <div class="resumo-linha total-final-linha">
          <span>Total Final:</span>
          <span class="valor-total">R$ <span id="totalFinalVenda">${subtotal.toFixed(2)}</span></span>
        </div>
      </div>
      
      <div class="divisao-pagamento">
        <h3>💰 Formas de Pagamento</h3>
        <div id="formasPagamento">
          <div class="forma-pagamento-item">
            <select class="select-forma-pagamento" data-index="0">
              <option value="Dinheiro">💵 Dinheiro</option>
              <option value="Cartão Débito">💳 Débito</option>
              <option value="Cartão Crédito">💳 Crédito</option>
              <option value="PIX">📱 PIX</option>
            </select>
            <input type="number" class="input-valor-pagamento" data-index="0" placeholder="Valor" step="0.01" min="0">
            <button class="btn btn-danger btn-sm" onclick="removerFormaPagamento(0)" style="display: none;">✕</button>
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
            <span class="text-danger">R$ <span id="faltaPagar">${subtotal.toFixed(2)}</span></span>
          </div>
          <div class="resumo-linha troco-linha" id="trocoLinha" style="display: none;">
            <span>Troco:</span>
            <span class="text-success">R$ <span id="valorTroco">0.00</span></span>
          </div>
        </div>
      </div>
      
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        <button class="btn btn-success" id="btnConfirmarVenda">✅ Confirmar Venda</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listeners
  document.getElementById('inputDesconto').addEventListener('input', atualizarTotalComDesconto);
  document.getElementById('btnAdicionarPagamento').addEventListener('click', adicionarFormaPagamento);
  document.getElementById('btnConfirmarVenda').addEventListener('click', confirmarVendaCompleta);
  
  // Listeners para os campos de pagamento
  modal.querySelectorAll('.input-valor-pagamento').forEach(input => {
    input.addEventListener('input', atualizarResumoPagamento);
  });
  
  // Foco no primeiro campo
  setTimeout(() => {
    modal.querySelector('.input-valor-pagamento').focus();
  }, 100);
}

let contadorFormasPagamento = 1;

function atualizarTotalComDesconto() {
  const inputDesconto = document.getElementById('inputDesconto');
  const subtotal = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  const descontoPercent = parseFloat(inputDesconto.value) || 0;
  const descontoValor = subtotal * (descontoPercent / 100);
  const totalFinal = subtotal - descontoValor;
  
  document.getElementById('totalFinalVenda').textContent = totalFinal.toFixed(2);
  document.getElementById('faltaPagar').textContent = totalFinal.toFixed(2);
  
  atualizarResumoPagamento();
}

function adicionarFormaPagamento() {
  const container = document.getElementById('formasPagamento');
  const index = contadorFormasPagamento++;
  
  const div = document.createElement('div');
  div.className = 'forma-pagamento-item';
  div.innerHTML = `
    <select class="select-forma-pagamento" data-index="${index}">
      <option value="Dinheiro">💵 Dinheiro</option>
      <option value="Cartão Débito">💳 Débito</option>
      <option value="Cartão Crédito">💳 Crédito</option>
      <option value="PIX">📱 PIX</option>
    </select>
    <input type="number" class="input-valor-pagamento" data-index="${index}" placeholder="Valor" step="0.01" min="0">
    <button class="btn btn-danger btn-sm" onclick="removerFormaPagamento(${index})">✕</button>
  `;
  
  container.appendChild(div);
  
  div.querySelector('.input-valor-pagamento').addEventListener('input', atualizarResumoPagamento);
  div.querySelector('.input-valor-pagamento').focus();
}

function removerFormaPagamento(index) {
  const items = document.querySelectorAll('.forma-pagamento-item');
  items.forEach(item => {
    const select = item.querySelector(`[data-index="${index}"]`);
    if (select) {
      item.remove();
      atualizarResumoPagamento();
    }
  });
}

function atualizarResumoPagamento() {
  const inputs = document.querySelectorAll('.input-valor-pagamento');
  let totalPago = 0;
  
  inputs.forEach(input => {
    totalPago += parseFloat(input.value) || 0;
  });
  
  const totalFinal = parseFloat(document.getElementById('totalFinalVenda').textContent);
  const falta = totalFinal - totalPago;
  const troco = totalPago > totalFinal ? totalPago - totalFinal : 0;
  
  document.getElementById('valorPago').textContent = totalPago.toFixed(2);
  document.getElementById('faltaPagar').textContent = Math.max(0, falta).toFixed(2);
  
  const trocoLinha = document.getElementById('trocoLinha');
  if (troco > 0) {
    trocoLinha.style.display = 'flex';
    document.getElementById('valorTroco').textContent = troco.toFixed(2);
  } else {
    trocoLinha.style.display = 'none';
  }
}

function confirmarVendaCompleta() {
  const totalFinal = parseFloat(document.getElementById('totalFinalVenda').textContent);
  const valorPago = parseFloat(document.getElementById('valorPago').textContent);
  
  if (valorPago < totalFinal) {
    alert('O valor pago é menor que o total da venda!');
    return;
  }
  
  // Coletar formas de pagamento
  const formasPagamento = [];
  const items = document.querySelectorAll('.forma-pagamento-item');
  
  items.forEach(item => {
    const select = item.querySelector('.select-forma-pagamento');
    const input = item.querySelector('.input-valor-pagamento');
    const valor = parseFloat(input.value) || 0;
    
    if (valor > 0) {
      formasPagamento.push({
        forma: select.value,
        valor: valor
      });
    }
  });
  
  if (formasPagamento.length === 0) {
    alert('Adicione pelo menos uma forma de pagamento!');
    return;
  }
  
  // Calcular valores
  const subtotal = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  const descontoPercent = parseFloat(document.getElementById('inputDesconto').value) || 0;
  const descontoValor = subtotal * (descontoPercent / 100);
  const quantidadeItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  
  // Inserir venda
  db.inserirVenda(subtotal, quantidadeItens, descontoValor, usuarioLogado.id, (err, vendaId) => {
    if (err) {
      console.error('❌ Erro ao inserir venda:', err);
      alert('Erro ao finalizar venda!');
      return;
    }
    
    // Inserir formas de pagamento
    let pagamentosProcessados = 0;
    formasPagamento.forEach(pagamento => {
      db.inserirPagamentoVenda(vendaId, pagamento.forma, pagamento.valor, (err) => {
        if (err) console.error('❌ Erro ao inserir pagamento:', err);
        
        pagamentosProcessados++;
        
        if (pagamentosProcessados === formasPagamento.length) {
          // Todos pagamentos inseridos, agora inserir itens
          inserirItensVenda(vendaId, subtotal, descontoValor);
        }
      });
    });
  });
}

function inserirItensVenda(vendaId, subtotal, desconto) {
  let itensProcessados = 0;
  
  carrinho.forEach(item => {
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
          console.error('❌ Erro ao inserir item:', err);
          return;
        }
        
        // Atualizar estoque se necessário
        if (item.tipo === 'produto' && item.controlar_estoque) {
          const produto = produtos.find(p => p.id === item.id);
          if (produto) {
            const novoEstoque = produto.estoque - item.quantidade;
            db.atualizarEstoque(item.id, novoEstoque, (err) => {
              if (err) console.error('❌ Erro ao atualizar estoque:', err);
            });
          }
        }
        
        itensProcessados++;
        
        if (itensProcessados === carrinho.length) {
          // Todos itens inseridos
          finalizarVendaComSucesso(vendaId, subtotal, desconto);
        }
      }
    );
  });
}

function finalizarVendaComSucesso(vendaId, subtotal, desconto) {
  document.getElementById('modalPagamento').remove();
  
  const totalFinal = subtotal - desconto;
  
  // Perguntar sobre impressão
  if (confirm(`✅ Venda #${vendaId} finalizada!\n\nTotal: R$ ${totalFinal.toFixed(2)}\n\nDeseja imprimir o cupom?`)) {
    abrirModalImpressao(vendaId);
  }
  
  carrinho = [];
  atualizarCarrinho();
  carregarDadosIniciais();
}

// ============================================
// MODAL DE IMPRESSÃO
// ============================================

function abrirModalImpressao(vendaId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  
  modal.innerHTML = `
    <div class="modal">
      <h2>🖨️ Imprimir Cupom</h2>
      
      <div class="opcoes-impressao">
        <button class="btn btn-primary btn-lg" onclick="imprimirCupom(${vendaId}, 'cliente')">
          🧾 Imprimir Via Cliente
        </button>
        <button class="btn btn-secondary btn-lg" onclick="imprimirCupom(${vendaId}, 'cozinha')">
          👨‍🍳 Imprimir Via Cozinha
        </button>
        <button class="btn btn-success btn-lg" onclick="imprimirAmbos(${vendaId})">
          📄 Imprimir Ambas
        </button>
      </div>
      
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function imprimirCupom(vendaId, tipo) {
  db.buscarDetalhesVenda(vendaId, (err, itens) => {
    if (err) {
      alert('Erro ao buscar detalhes da venda!');
      return;
    }
    
    db.buscarPagamentosVenda(vendaId, (errPag, pagamentos) => {
      if (errPag) {
        alert('Erro ao buscar formas de pagamento!');
        return;
      }
      
      // Registrar impressão
      db.registrarImpressao(vendaId, tipo, usuarioLogado.id, (err) => {
        if (err) console.error('❌ Erro ao registrar impressão:', err);
      });
      
      if (tipo === 'cozinha') {
        imprimirViaCozinha(vendaId, itens);
      } else {
        imprimirViaCliente(vendaId, itens, pagamentos);
      }
    });
  });
}

function imprimirAmbos(vendaId) {
  imprimirCupom(vendaId, 'cliente');
  setTimeout(() => imprimirCupom(vendaId, 'cozinha'), 1000);
}

function imprimirViaCliente(vendaId, itens, pagamentos) {
  console.log('🖨️ Imprimindo via cliente...', vendaId);
  
  const total = itens.reduce((acc, item) => acc + item.subtotal, 0);
  
  let cupom = '\n';
  cupom += '================================\n';
  cupom += '       PDV SIMPLES\n';
  cupom += '    Sistema de Vendas\n';
  cupom += '================================\n';
  cupom += `Venda #${vendaId}\n`;
  cupom += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
  cupom += `Atendente: ${usuarioLogado.nome}\n`;
  cupom += '================================\n\n';
  
  itens.forEach(item => {
    const nome = item.produto_nome || item.combo_nome;
    cupom += `${item.quantidade}x ${nome}\n`;
    cupom += `   R$ ${item.preco_unitario.toFixed(2)} = R$ ${item.subtotal.toFixed(2)}\n`;
    if (item.observacao) {
      cupom += `   Obs: ${item.observacao}\n`;
    }
    cupom += '\n';
  });
  
  cupom += '================================\n';
  cupom += `TOTAL: R$ ${total.toFixed(2)}\n`;
  cupom += '================================\n\n';
  
  cupom += 'FORMAS DE PAGAMENTO:\n';
  pagamentos.forEach(pag => {
    cupom += `${pag.forma_pagamento}: R$ ${pag.valor.toFixed(2)}\n`;
  });
  
  cupom += '\n================================\n';
  cupom += '  Obrigado pela preferência!\n';
  cupom += '================================\n\n\n';
  
  console.log(cupom);
  alert('✅ Cupom enviado para impressora!\n\n(Visualize no console)');
}

function imprimirViaCozinha(vendaId, itens) {
  console.log('👨‍🍳 Imprimindo via cozinha...', vendaId);
  
  let cupom = '\n';
  cupom += '================================\n';
  cupom += '      VIA COZINHA\n';
  cupom += '================================\n';
  cupom += `Pedido #${vendaId}\n`;
  cupom += `Hora: ${new Date().toLocaleTimeString('pt-BR')}\n`;
  cupom += '================================\n\n';
  
  itens.forEach(item => {
    const nome = item.produto_nome || item.combo_nome;
    cupom += `${item.quantidade}x ${nome}\n`;
    
    if (item.observacao) {
      cupom += '\n';
      cupom += '*** OBSERVAÇÃO ***\n';
      cupom += `${item.observacao}\n`;
      cupom += '******************\n';
    }
    cupom += '\n';
  });
  
  cupom += '================================\n\n\n';
  
  console.log(cupom);
  alert('✅ Pedido enviado para cozinha!\n\n(Visualize no console)');
}

// ============================================
// REIMPRESSÃO
// ============================================

function abrirModalReimpressao(vendaId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  
  modal.innerHTML = `
    <div class="modal">
      <h2>🖨️ Reimprimir Cupom</h2>
      <p>Deseja reimprimir o cupom da venda #${vendaId}?</p>
      
      <div class="opcoes-impressao">
        <button class="btn btn-primary" onclick="imprimirCupom(${vendaId}, 'cliente'); this.closest('.modal-overlay').remove();">
          🧾 Via Cliente
        </button>
        <button class="btn btn-secondary" onclick="imprimirCupom(${vendaId}, 'cozinha'); this.closest('.modal-overlay').remove();">
          👨‍🍳 Via Cozinha
        </button>
      </div>
      
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// ============================================
// TELA DE PRODUTOS (CONTINUAÇÃO)
// ============================================

function mostrarTelaProdutos() {
  if (!sessao.verificarPermissao('caixa')) {
    alert('Acesso negado!');
    return;
  }
  
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = `
    <div class="tela-produtos">
      <div class="produtos-header">
        <h2>📦 Gestão de Produtos</h2>
        <div class="produtos-acoes">
          ${usuarioLogado.tipo === 'admin' ? '<button class="btn btn-secondary" id="btnGerenciarCategorias">🏷️ Categorias</button>' : ''}
          <button class="btn btn-primary" id="btnNovoProduto">➕ Novo Produto</button>
        </div>
      </div>
      
      <div class="tabela-container">
        <table class="tabela-produtos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="listaProdutosTabela"></tbody>
        </table>
      </div>
    </div>
  `;
  
  carregarTabelaProdutos();
  
  document.getElementById('btnNovoProduto').addEventListener('click', () => abrirModalProduto());
  
  if (usuarioLogado.tipo === 'admin') {
    document.getElementById('btnGerenciarCategorias').addEventListener('click', abrirModalCategorias);
  }
}

function carregarTabelaProdutos() {
  const tbody = document.getElementById('listaProdutosTabela');
  
  if (produtos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum produto cadastrado</td></tr>';
    return;
  }
  
  tbody.innerHTML = produtos.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>
        ${p.nome}
        ${p.categoria_nome ? `<span class="badge" style="background: ${p.categoria_cor}">${p.categoria_nome}</span>` : ''}
      </td>
      <td>R$ ${p.preco.toFixed(2)}</td>
      <td>${p.controlar_estoque ? p.estoque : '∞'} ${p.controlar_estoque ? '✅' : '❌'}</td>
      <td>
        <button class="btn-toggle ${p.disponivel ? 'ativo' : 'inativo'}" onclick="toggleDisponibilidadeProduto(${p.id}, ${p.disponivel})">
          ${p.disponivel ? '✅ Disponível' : '❌ Indisponível'}
        </button>
      </td>
      <td>
        <button class="btn-acao" onclick="editarProduto(${p.id})" title="Editar">✏️</button>
        ${usuarioLogado.tipo === 'admin' ? `<button class="btn-acao btn-deletar" onclick="deletarProduto(${p.id})" title="Deletar">🗑️</button>` : ''}
      </td>
    </tr>
  `).join('');
}

function toggleDisponibilidadeProduto(id, disponivelAtual) {
  const novoStatus = !disponivelAtual;
  
  db.alternarDisponibilidadeProduto(id, novoStatus, (err) => {
    if (err) {
      alert('Erro ao alterar disponibilidade!');
      return;
    }
    
    carregarDadosIniciais();
    setTimeout(() => carregarTabelaProdutos(), 200);
  });
}

function abrirModalProduto(produtoId = null) {
  const produto = produtoId ? produtos.find(p => p.id === produtoId) : null;
  
  db.buscarCategorias((err, categorias) => {
    if (err) {
      alert('Erro ao carregar categorias!');
      return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const optionsCategorias = categorias
      .map(cat => `<option value="${cat.id}" ${produto && produto.categoria_id === cat.id ? 'selected' : ''}>${cat.nome}</option>`)
      .join('');
    
    modal.innerHTML = `
      <div class="modal">
        <button class="btn-fechar-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <h2>${produto ? '✏️ Editar Produto' : '➕ Novo Produto'}</h2>
        
        <form id="formProduto">
          <div class="form-group">
            <label>Nome *</label>
            <input type="text" id="inputNome" value="${produto ? produto.nome : ''}" required>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Preço (R$) *</label>
              <input type="number" id="inputPreco" step="0.01" min="0" value="${produto ? produto.preco : ''}" required>
            </div>
            
            <div class="form-group">
              <label>Categoria</label>
              <select id="selectCategoria">
                <option value="">Sem categoria</option>
                ${optionsCategorias}
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" id="checkControlarEstoque" ${produto && produto.controlar_estoque ? 'checked' : ''}>
              Controlar estoque
            </label>
          </div>
          
          <div id="camposEstoque" style="${produto && produto.controlar_estoque ? '' : 'display: none;'}">
            <div class="form-row">
              <div class="form-group">
                <label>Estoque Atual *</label>
                <input type="number" id="inputEstoque" min="0" value="${produto && produto.controlar_estoque ? produto.estoque : '0'}">
              </div>
              
              <div class="form-group">
                <label>Estoque Mínimo *</label>
                <input type="number" id="inputEstoqueMinimo" min="1" value="${produto ? produto.estoque_minimo || 10 : '10'}">
              </div>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
            <button type="submit" class="btn btn-success">Salvar</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('inputNome').focus();
    
    document.getElementById('checkControlarEstoque').addEventListener('change', (e) => {
      document.getElementById('camposEstoque').style.display = e.target.checked ? 'block' : 'none';
    });
    
    document.getElementById('formProduto').addEventListener('submit', (e) => {
      e.preventDefault();
      salvarProduto(produtoId);
    });
  });
}

function salvarProduto(produtoId) {
  const nome = document.getElementById('inputNome').value.trim();
  const preco = parseFloat(document.getElementById('inputPreco').value);
  const categoriaId = document.getElementById('selectCategoria').value || null;
  const controlarEstoque = document.getElementById('checkControlarEstoque').checked;
  const estoque = controlarEstoque ? parseInt(document.getElementById('inputEstoque').value) : 0;
  const estoqueMinimo = controlarEstoque ? parseInt(document.getElementById('inputEstoqueMinimo').value) : 0;
  
  if (!nome || isNaN(preco)) {
    alert('Preencha todos os campos obrigatórios!');
    return;
  }
  
  if (controlarEstoque && (isNaN(estoque) || isNaN(estoqueMinimo) || estoqueMinimo < 1)) {
    alert('Configure o estoque corretamente!');
    return;
  }
  
  const callback = (err) => {
    if (err) {
      alert('Erro ao salvar produto!');
      return;
    }
    
    alert('Produto salvo com sucesso!');
    document.querySelector('.modal-overlay').remove();
    carregarDadosIniciais();
    setTimeout(() => carregarTabelaProdutos(), 200);
  };
  
  if (produtoId) {
    db.atualizarProdutoCompleto(produtoId, nome, preco, estoque, categoriaId, controlarEstoque, estoqueMinimo, callback);
  } else {
    db.inserirProdutoCompleto(nome, preco, estoque, categoriaId, controlarEstoque, estoqueMinimo, callback);
  }
}

function editarProduto(id) {
  abrirModalProduto(id);
}

function deletarProduto(id) {
  const produto = produtos.find(p => p.id === id);
  
  if (!confirm(`Deletar "${produto.nome}"?`)) return;
  
  db.deletarProduto(id, (err) => {
    if (err) {
      alert('Erro ao deletar produto!');
      return;
    }
    
    alert('Produto deletado!');
    carregarDadosIniciais();
    setTimeout(() => carregarTabelaProdutos(), 200);
  });
}

function abrirModalCategorias() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  
  modal.innerHTML = `
    <div class="modal">
      <button class="btn-fechar-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>🏷️ Gerenciar Categorias</h2>
      
      <div class="form-group">
        <label>Nova Categoria</label>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="inputNovaCategoria" placeholder="Nome" style="flex: 1;">
          <input type="color" id="inputCorCategoria" value="#667eea">
          <button class="btn btn-primary" onclick="adicionarCategoria()">Adicionar</button>
        </div>
      </div>
      
      <div id="listaCategorias"></div>
    </div>
  `;
  
  document.body.appendChild(modal);
  carregarListaCategorias();
}

function carregarListaCategorias() {
  db.buscarCategorias((err, categorias) => {
    if (err) return;
    
    const lista = document.getElementById('listaCategorias');
    if (!lista) return;
    
    if (categorias.length === 0) {
      lista.innerHTML = '<p class="text-center text-muted">Nenhuma categoria cadastrada</p>';
      return;
    }
    
    lista.innerHTML = categorias.map(cat => `
      <div class="categoria-item">
        <div class="categoria-cor" style="background: ${cat.cor}"></div>
        <span>${cat.nome}</span>
        <button class="btn-acao btn-deletar" onclick="deletarCategoria(${cat.id})">🗑️</button>
      </div>
    `).join('');
  });
}

function adicionarCategoria() {
  const nome = document.getElementById('inputNovaCategoria').value.trim();
  const cor = document.getElementById('inputCorCategoria').value;
  
  if (!nome) {
    alert('Digite o nome da categoria!');
    return;
  }
  
  db.inserirCategoria(nome, cor, (err) => {
    if (err) {
      alert('Erro ao adicionar categoria!');
      return;
    }
    
    document.getElementById('inputNovaCategoria').value = '';
    document.getElementById('inputCorCategoria').value = '#667eea';
    carregarListaCategorias();
  });
}

function deletarCategoria(id) {
  if (!confirm('Deletar esta categoria?')) return;
  
  db.deletarCategoria(id, (err) => {
    if (err) {
      alert('Erro ao deletar categoria!');
      return;
    }
    
    carregarListaCategorias();
    carregarDadosIniciais();
  });
}

// ============================================
// TELA DE COMBOS
// ============================================

function mostrarTelaCombos() {
  if (usuarioLogado.tipo !== 'admin') {
    alert('Acesso negado!');
    return;
  }
  
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = `
    <div class="tela-combos">
      <div class="combos-header">
        <h2>🎁 Combos Promocionais</h2>
        <button class="btn btn-primary" id="btnNovoCombo">➕ Novo Combo</button>
      </div>
      
      <div class="tabela-container">
        <table class="tabela-produtos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Descrição</th>
              <th>Preço</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="listaCombosTabela"></tbody>
        </table>
      </div>
    </div>
  `;
  
  carregarTabelaCombos();
  
  document.getElementById('btnNovoCombo').addEventListener('click', () => abrirModalCombo());
}

function carregarTabelaCombos() {
  const tbody = document.getElementById('listaCombosTabela');
  
  if (combos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum combo cadastrado</td></tr>';
    return;
  }
  
  tbody.innerHTML = combos.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.nome}</td>
      <td>${c.descricao || '-'}</td>
      <td>R$ ${c.preco.toFixed(2)}</td>
      <td>
        <button class="btn-toggle ${c.disponivel ? 'ativo' : 'inativo'}" onclick="toggleDisponibilidadeCombo(${c.id}, ${c.disponivel})">
          ${c.disponivel ? '✅ Disponível' : '❌ Indisponível'}
        </button>
      </td>
      <td>
        <button class="btn-acao" onclick="verDetalhesCombo(${c.id})" title="Ver itens">👁️</button>
        <button class="btn-acao" onclick="editarCombo(${c.id})" title="Editar">✏️</button>
        <button class="btn-acao btn-deletar" onclick="deletarCombo(${c.id})" title="Deletar">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function toggleDisponibilidadeCombo(id, disponivelAtual) {
  const novoStatus = !disponivelAtual;
  
  db.alternarDisponibilidadeCombo(id, novoStatus, (err) => {
    if (err) {
      alert('Erro ao alterar disponibilidade!');
      return;
    }
    
    carregarDadosIniciais();
    setTimeout(() => carregarTabelaCombos(), 200);
  });
}

function abrirModalCombo(comboId = null) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  
  modal.innerHTML = `
    <div class="modal modal-grande">
      <button class="btn-fechar-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>${comboId ? '✏️ Editar Combo' : '➕ Novo Combo'}</h2>
      
      <form id="formCombo">
        <div class="form-group">
          <label>Nome do Combo *</label>
          <input type="text" id="inputNomeCombo" required>
        </div>
        
        <div class="form-group">
          <label>Descrição</label>
          <textarea id="inputDescricaoCombo" rows="2"></textarea>
        </div>
        
        <div class="form-group">
          <label>Preço (R$) *</label>
          <input type="number" id="inputPrecoCombo" step="0.01" min="0" required>
        </div>
        
        <div class="form-group">
          <label>Produtos do Combo *</label>
          <div id="produtosCombo"></div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="adicionarProdutoAoCombo()">➕ Adicionar Produto</button>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button type="submit" class="btn btn-success">Salvar</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  if (comboId) {
    carregarDadosCombo(comboId);
  } else {
    adicionarProdutoAoCombo();
  }
  
  document.getElementById('formCombo').addEventListener('submit', (e) => {
    e.preventDefault();
    salvarCombo(comboId);
  });
}

let contadorProdutosCombo = 0;

function adicionarProdutoAoCombo() {
  const container = document.getElementById('produtosCombo');
  const index = contadorProdutosCombo++;
  
  const div = document.createElement('div');
  div.className = 'produto-combo-item';
  div.innerHTML = `
    <select class="select-produto-combo" data-index="${index}" required>
      <option value="">Selecione um produto</option>
      ${produtos.map(p => `<option value="${p.id}">${p.nome} - R$ ${p.preco.toFixed(2)}</option>`).join('')}
    </select>
    <input type="number" class="input-qtd-combo" data-index="${index}" min="1" value="1" required>
    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✕</button>
  `;
  
  container.appendChild(div);
}

function carregarDadosCombo(comboId) {
  db.buscarComboCompleto(comboId, (err, combo) => {
    if (err) {
      alert('Erro ao carregar combo!');
      return;
    }
    
    document.getElementById('inputNomeCombo').value = combo.nome;
    document.getElementById('inputDescricaoCombo').value = combo.descricao || '';
    document.getElementById('inputPrecoCombo').value = combo.preco;
    
    combo.itens.forEach(item => {
      adicionarProdutoAoCombo();
      const selects = document.querySelectorAll('.select-produto-combo');
      const inputs = document.querySelectorAll('.input-qtd-combo');
      const ultimo = selects.length - 1;
      selects[ultimo].value = item.produto_id;
      inputs[ultimo].value = item.quantidade;
    });
  });
}

function salvarCombo(comboId) {
  const nome = document.getElementById('inputNomeCombo').value.trim();
  const descricao = document.getElementById('inputDescricaoCombo').value.trim();
  const preco = parseFloat(document.getElementById('inputPrecoCombo').value);
  
  const itens = [];
  document.querySelectorAll('.produto-combo-item').forEach(item => {
    const produtoId = parseInt(item.querySelector('.select-produto-combo').value);
    const quantidade = parseInt(item.querySelector('.input-qtd-combo').value);
    
    if (produtoId && quantidade > 0) {
      itens.push({ produto_id: produtoId, quantidade });
    }
  });
  
  if (!nome || isNaN(preco) || itens.length === 0) {
    alert('Preencha todos os campos e adicione pelo menos 1 produto!');
    return;
  }
  
  if (comboId) {
    db.atualizarCombo(comboId, nome, descricao, preco, (err) => {
      if (err) {
        alert('Erro ao atualizar combo!');
        return;
      }
      
      alert('Combo atualizado!');
      document.querySelector('.modal-overlay').remove();
      carregarDadosIniciais();
      setTimeout(() => carregarTabelaCombos(), 200);
    });
  } else {
    db.inserirCombo(nome, descricao, preco, itens, (err) => {
      if (err) {
        alert('Erro ao criar combo!');
        return;
      }
      
      alert('Combo criado!');
      document.querySelector('.modal-overlay').remove();
      carregarDadosIniciais();
      setTimeout(() => carregarTabelaCombos(), 200);
    });
  }
}

function editarCombo(id) {
  abrirModalCombo(id);
}

function deletarCombo(id) {
  const combo = combos.find(c => c.id === id);
  
  if (!confirm(`Deletar "${combo.nome}"?`)) return;
  
  db.deletarCombo(id, (err) => {
    if (err) {
      alert('Erro ao deletar combo!');
      return;
    }
    
    alert('Combo deletado!');
    carregarDadosIniciais();
    setTimeout(() => carregarTabelaCombos(), 200);
  });
}

function verDetalhesCombo(id) {
  db.buscarComboCompleto(id, (err, combo) => {
    if (err) {
      alert('Erro ao carregar detalhes!');
      return;
    }
    
    let detalhes = `🎁 ${combo.nome}\n\n`;
    if (combo.descricao) detalhes += `${combo.descricao}\n\n`;
    detalhes += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    detalhes += 'ITENS:\n\n';
    
    combo.itens.forEach(item => {
      detalhes += `${item.quantidade}x ${item.produto_nome}\n`;
    });
    
    detalhes += '\n━━━━━━━━━━━━━━━━━━━━━━━━\n';
    detalhes += `PREÇO: R$ ${combo.preco.toFixed(2)}`;
    
    alert(detalhes);
  });
}

// ============================================
// TELA DE USUÁRIOS
// ============================================

function mostrarTelaUsuarios() {
  if (usuarioLogado.tipo !== 'admin') {
    alert('Acesso negado!');
    return;
  }
  
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = `
    <div class="tela-usuarios">
      <div class="usuarios-header">
        <h2>👥 Gestão de Usuários</h2>
        <button class="btn btn-primary" id="btnNovoUsuario">➕ Novo Usuário</button>
      </div>
      
      <div class="tabela-container">
        <table class="tabela-produtos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Login</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="listaUsuariosTabela"></tbody>
        </table>
      </div>
    </div>
  `;
  
  carregarTabelaUsuarios();
  
  document.getElementById('btnNovoUsuario').addEventListener('click', () => abrirModalUsuario());
}

function carregarTabelaUsuarios() {
  db.buscarUsuarios((err, usuarios) => {
    if (err) {
      alert('Erro ao carregar usuários!');
      return;
    }
    
    const tbody = document.getElementById('listaUsuariosTabela');
    
    tbody.innerHTML = usuarios.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.nome}</td>
        <td>${u.login}</td>
        <td><span class="badge ${u.tipo === 'admin' ? 'badge-admin' : 'badge-caixa'}">${u.tipo === 'admin' ? '👑 Admin' : '💰 Caixa'}</span></td>
        <td>${u.ativo ? '✅ Ativo' : '❌ Inativo'}</td>
        <td>
          <button class="btn-acao" onclick="editarUsuario(${u.id})" title="Editar">✏️</button>
          ${u.id !== usuarioLogado.id ? `<button class="btn-acao btn-deletar" onclick="deletarUsuario(${u.id})" title="Desativar">🗑️</button>` : ''}
        </td>
      </tr>
    `).join('');
  });
}

function abrirModalUsuario(usuarioId = null) {
  db.buscarUsuarios((err, usuarios) => {
    if (err) return;
    
    const usuario = usuarioId ? usuarios.find(u => u.id === usuarioId) : null;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
      <div class="modal">
        <button class="btn-fechar-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <h2>${usuario ? '✏️ Editar Usuário' : '➕ Novo Usuário'}</h2>
        
        <form id="formUsuario">
          <div class="form-group">
            <label>Nome Completo *</label>
            <input type="text" id="inputNomeUsuario" value="${usuario ? usuario.nome : ''}" required>
          </div>
          
          <div class="form-group">
            <label>Login *</label>
            <input type="text" id="inputLoginUsuario" value="${usuario ? usuario.login : ''}" required>
          </div>
          
          <div class="form-group">
            <label>Senha ${usuario ? '(deixe em branco para não alterar)' : '*'}</label>
            <input type="password" id="inputSenhaUsuario" ${!usuario ? 'required' : ''}>
          </div>
          
          <div class="form-group">
            <label>Tipo *</label>
            <select id="selectTipoUsuario" required>
              <option value="caixa" ${usuario && usuario.tipo === 'caixa' ? 'selected' : ''}>💰 Caixa</option>
              <option value="admin" ${usuario && usuario.tipo === 'admin' ? 'selected' : ''}>👑 Administrador</option>
            </select>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
            <button type="submit" class="btn btn-success">Salvar</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('formUsuario').addEventListener('submit', (e) => {
      e.preventDefault();
      salvarUsuario(usuarioId);
    });
  });
}

function salvarUsuario(usuarioId) {
  const nome = document.getElementById('inputNomeUsuario').value.trim();
  const login = document.getElementById('inputLoginUsuario').value.trim();
  const senha = document.getElementById('inputSenhaUsuario').value;
  const tipo = document.getElementById('selectTipoUsuario').value;
  
  if (!nome || !login || !tipo) {
    alert('Preencha todos os campos obrigatórios!');
    return;
  }
  
  if (!usuarioId && !senha) {
    alert('Senha é obrigatória para novos usuários!');
    return;
  }
  
  const callback = (err) => {
    if (err) {
      alert('Erro ao salvar usuário!');
      return;
    }
    
    alert('Usuário salvo com sucesso!');
    document.querySelector('.modal-overlay').remove();
    carregarTabelaUsuarios();
  };
  
  if (usuarioId) {
    db.atualizarUsuario(usuarioId, nome, login, senha, tipo, callback);
  } else {
    db.inserirUsuario(nome, login, senha, tipo, callback);
  }
}

function editarUsuario(id) {
  abrirModalUsuario(id);
}

function deletarUsuario(id) {
  if (!confirm('Desativar este usuário?')) return;
  
  db.deletarUsuario(id, (err) => {
    if (err) {
      alert('Erro ao desativar usuário!');
      return;
    }
    
    alert('Usuário desativado!');
    carregarTabelaUsuarios();
  });
}

// ============================================
// TELA DE FECHAMENTO DE CAIXA
// ============================================

function mostrarTelaFechamento() {
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = `
    <div class="tela-fechamento">
      <div class="fechamento-header">
        <h2>🔒 Fechamento de Caixa</h2>
        <button class="btn btn-primary" id="btnNovoFechamento">🔒 Realizar Fechamento</button>
      </div>
      
      <div class="cards-fechamento" id="cardsFechamento">
        <div class="card-stat">
          <div class="card-stat-icone">💰</div>
          <div class="card-stat-info">
            <p>Total em Dinheiro</p>
            <h3 id="statDinheiro">R$ 0.00</h3>
          </div>
        </div>
        
        <div class="card-stat">
          <div class="card-stat-icone">💳</div>
          <div class="card-stat-info">
            <p>Total em Débito</p>
            <h3 id="statDebito">R$ 0.00</h3>
          </div>
        </div>
        
        <div class="card-stat">
          <div class="card-stat-icone">💳</div>
          <div class="card-stat-info">
            <p>Total em Crédito</p>
            <h3 id="statCredito">R$ 0.00</h3>
          </div>
        </div>
        
        <div class="card-stat">
          <div class="card-stat-icone">📱</div>
          <div class="card-stat-info">
            <p>Total em PIX</p>
            <h3 id="statPix">R$ 0.00</h3>
          </div>
        </div>
      </div>
      
      <div class="tabela-container">
        <h3>📋 Histórico de Fechamentos</h3>
        <table class="tabela-produtos">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Usuário</th>
              <th>Vendas</th>
              <th>Dinheiro</th>
              <th>Débito</th>
              <th>Crédito</th>
              <th>PIX</th>
              <th>Total</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="listaFechamentos"></tbody>
        </table>
      </div>
    </div>
  `;
  
  carregarDadosFechamento();
  
  document.getElementById('btnNovoFechamento').addEventListener('click', abrirModalFechamento);
}

function carregarDadosFechamento() {
  // Calcular totais do dia atual
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
  const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString();
  
  db.buscarVendasPorPeriodo(inicioHoje, fimHoje, (err, vendas) => {
    if (err) return;
    
    let totalDinheiro = 0, totalDebito = 0, totalCredito = 0, totalPix = 0;
    let vendasProcessadas = 0;
    
    if (vendas.length === 0) {
      document.getElementById('statDinheiro').textContent = 'R$ 0.00';
      document.getElementById('statDebito').textContent = 'R$ 0.00';
      document.getElementById('statCredito').textContent = 'R$ 0.00';
      document.getElementById('statPix').textContent = 'R$ 0.00';
    } else {
      vendas.forEach(venda => {
        db.buscarPagamentosVenda(venda.id, (err, pagamentos) => {
          if (!err && pagamentos) {
            pagamentos.forEach(pag => {
              if (pag.forma_pagamento === 'Dinheiro') totalDinheiro += pag.valor;
              else if (pag.forma_pagamento === 'Cartão Débito') totalDebito += pag.valor;
              else if (pag.forma_pagamento === 'Cartão Crédito') totalCredito += pag.valor;
              else if (pag.forma_pagamento === 'PIX') totalPix += pag.valor;
            });
          }
          
          vendasProcessadas++;
          
          if (vendasProcessadas === vendas.length) {
            document.getElementById('statDinheiro').textContent = `R$ ${totalDinheiro.toFixed(2)}`;
            document.getElementById('statDebito').textContent = `R$ ${totalDebito.toFixed(2)}`;
            document.getElementById('statCredito').textContent = `R$ ${totalCredito.toFixed(2)}`;
            document.getElementById('statPix').textContent = `R$ ${totalPix.toFixed(2)}`;
          }
        });
      });
    }
  });
  
  // Carregar histórico de fechamentos
  db.buscarFechamentos((err, fechamentos) => {
    if (err) return;
    
    const tbody = document.getElementById('listaFechamentos');
    
    if (fechamentos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center">Nenhum fechamento realizado</td></tr>';
      return;
    }
    
    tbody.innerHTML = fechamentos.map(f => {
      const data = new Date(f.data_hora).toLocaleString('pt-BR');
      
      return `
        <tr>
          <td>${data}</td>
          <td>${f.usuario_nome}</td>
          <td>${f.quantidade_vendas}</td>
          <td>R$ ${f.total_dinheiro.toFixed(2)}</td>
          <td>R$ ${f.total_debito.toFixed(2)}</td>
          <td>R$ ${f.total_credito.toFixed(2)}</td>
          <td>R$ ${f.total_pix.toFixed(2)}</td>
          <td class="font-weight-bold">R$ ${f.total_geral.toFixed(2)}</td>
          <td>
            <button class="btn-acao" onclick="verDetalhesFechamento(${f.id})" title="Ver detalhes">👁️</button>
          </td>
        </tr>
      `;
    }).join('');
  });
}

function abrirModalFechamento() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  
  modal.innerHTML = `
    <div class="modal">
      <button class="btn-fechar-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>🔒 Realizar Fechamento de Caixa</h2>
      
      <p class="text-muted">Confira os valores e adicione observações se necessário.</p>
      
      <div class="resumo-fechamento">
        <div class="resumo-linha">
          <span>💵 Dinheiro:</span>
          <span id="fechamentoDinheiro">R$ 0.00</span>
        </div>
        <div class="resumo-linha">
          <span>💳 Débito:</span>
          <span id="fechamentoDebito">R$ 0.00</span>
        </div>
        <div class="resumo-linha">
          <span>💳 Crédito:</span>
          <span id="fechamentoCredito">R$ 0.00</span>
        </div>
        <div class="resumo-linha">
          <span>📱 PIX:</span>
          <span id="fechamentoPix">R$ 0.00</span>
        </div>
        <div class="resumo-linha">
          <span>🛒 Quantidade de Vendas:</span>
          <span id="fechamentoQtdVendas">0</span>
        </div>
        <div class="resumo-linha total-final-linha">
          <span>💰 Total Geral:</span>
          <span id="fechamentoTotal">R$ 0.00</span>
        </div>
      </div>
      
      <div class="form-group">
        <label>Observações</label>
        <textarea id="inputObservacoesFechamento" rows="3" placeholder="Adicione observações se necessário..."></textarea>
      </div>
      
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        <button class="btn btn-success" id="btnConfirmarFechamento">✅ Confirmar Fechamento</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Carregar dados do dia
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
  const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString();
  
  db.buscarVendasPorPeriodo(inicioHoje, fimHoje, (err, vendas) => {
    if (err) return;
    
    let totalDinheiro = 0, totalDebito = 0, totalCredito = 0, totalPix = 0;
    let vendasProcessadas = 0;
    
    if (vendas.length > 0) {
      vendas.forEach(venda => {
        db.buscarPagamentosVenda(venda.id, (err, pagamentos) => {
          if (!err && pagamentos) {
            pagamentos.forEach(pag => {
              if (pag.forma_pagamento === 'Dinheiro') totalDinheiro += pag.valor;
              else if (pag.forma_pagamento === 'Cartão Débito') totalDebito += pag.valor;
              else if (pag.forma_pagamento === 'Cartão Crédito') totalCredito += pag.valor;
              else if (pag.forma_pagamento === 'PIX') totalPix += pag.valor;
            });
          }
          
          vendasProcessadas++;
          
          if (vendasProcessadas === vendas.length) {
            const totalGeral = totalDinheiro + totalDebito + totalCredito + totalPix;
            
            document.getElementById('fechamentoDinheiro').textContent = `R$ ${totalDinheiro.toFixed(2)}`;
            document.getElementById('fechamentoDebito').textContent = `R$ ${totalDebito.toFixed(2)}`;
            document.getElementById('fechamentoCredito').textContent = `R$ ${totalCredito.toFixed(2)}`;
            document.getElementById('fechamentoPix').textContent = `R$ ${totalPix.toFixed(2)}`;
            document.getElementById('fechamentoQtdVendas').textContent = vendas.length;
            document.getElementById('fechamentoTotal').textContent = `R$ ${totalGeral.toFixed(2)}`;
            
            document.getElementById('btnConfirmarFechamento').onclick = () => {
              confirmarFechamento(totalDinheiro, totalDebito, totalCredito, totalPix, totalGeral, vendas.length);
            };
          }
        });
      });
    }
  });
}

function confirmarFechamento(totalDinheiro, totalDebito, totalCredito, totalPix, totalGeral, qtdVendas) {
  const observacoes = document.getElementById('inputObservacoesFechamento').value.trim();
  
  if (!confirm(`Confirmar fechamento de caixa?\n\nTotal: R$ ${totalGeral.toFixed(2)}\nVendas: ${qtdVendas}`)) {
    return;
  }
  
  db.inserirFechamentoCaixa(
    usuarioLogado.id,
    totalDinheiro,
    totalDebito,
    totalCredito,
    totalPix,
    totalGeral,
    qtdVendas,
    observacoes,
    (err) => {
      if (err) {
        alert('Erro ao realizar fechamento!');
        return;
      }
      
      alert('✅ Fechamento realizado com sucesso!');
      document.querySelector('.modal-overlay').remove();
      carregarDadosFechamento();
    }
  );
}

function verDetalhesFechamento(id) {
  db.buscarFechamentos((err, fechamentos) => {
    if (err) return;
    
    const fechamento = fechamentos.find(f => f.id === id);
    if (!fechamento) return;
    
    let detalhes = `🔒 FECHAMENTO DE CAIXA\n\n`;
    detalhes += `Data: ${new Date(fechamento.data_hora).toLocaleString('pt-BR')}\n`;
    detalhes += `Usuário: ${fechamento.usuario_nome}\n`;
    detalhes += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    detalhes += `💵 Dinheiro: R$ ${fechamento.total_dinheiro.toFixed(2)}\n`;
    detalhes += `💳 Débito: R$ ${fechamento.total_debito.toFixed(2)}\n`;
    detalhes += `💳 Crédito: R$ ${fechamento.total_credito.toFixed(2)}\n`;
    detalhes += `📱 PIX: R$ ${fechamento.total_pix.toFixed(2)}\n`;
    detalhes += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    detalhes += `🛒 Vendas: ${fechamento.quantidade_vendas}\n`;
    detalhes += `💰 TOTAL: R$ ${fechamento.total_geral.toFixed(2)}\n`;
    
    if (fechamento.observacoes) {
      detalhes += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      detalhes += `📝 Observações:\n${fechamento.observacoes}`;
    }
    
    alert(detalhes);
  });
}

// ============================================
// TELA DE RELATÓRIOS AVANÇADOS
// ============================================

function mostrarTelaRelatorios() {
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = `
    <div class="tela-relatorios">
      <h2>📊 Relatórios e Análises</h2>
      
      <div class="filtros-relatorio-avancado">
        <div class="filtro-grupo">
          <label>📅 Período:</label>
          <select id="filtroPeriodoRapido" class="select-filtro">
            <option value="hoje">Hoje</option>
            <option value="ontem">Ontem</option>
            <option value="semana">Esta Semana</option>
            <option value="mes">Este Mês</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </div>
        
        <div id="filtroPersonalizado" style="display: none;">
          <div class="filtro-grupo">
            <label>De:</label>
            <input type="date" id="inputDataInicio" class="input-filtro">
          </div>
          <div class="filtro-grupo">
            <label>Até:</label>
            <input type="date" id="inputDataFim" class="input-filtro">
          </div>
        </div>
        
        <div class="filtro-grupo">
          <label>💳 Pagamento:</label>
          <select id="filtroPagamento" class="select-filtro">
            <option value="todos">Todos</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Cartão Débito">Débito</option>
            <option value="Cartão Crédito">Crédito</option>
            <option value="PIX">PIX</option>
          </select>
        </div>
        
        <button class="btn btn-primary" id="btnAtualizarRelatorio">🔄 Atualizar</button>
        <button class="btn btn-success" id="btnExportarExcel">📊 Exportar Excel</button>
      </div>
      
      <div class="abas-relatorio">
        <button class="aba-btn active" data-aba="geral">📊 Geral</button>
        <button class="aba-btn" data-aba="horarios">🕐 Horários</button>
        <button class="aba-btn" data-aba="comparativo">📈 Comparativo</button>
        <button class="aba-btn" data-aba="vendas">💰 Vendas</button>
      </div>
      
      <!-- ABA GERAL -->
      <div class="aba-conteudo" id="abaGeral">
        <div class="cards-estatisticas">
          <div class="card-stat">
            <div class="card-stat-icone">💰</div>
            <div class="card-stat-info">
              <p>Total Vendido</p>
              <h3 id="statTotalVendido">R$ 0.00</h3>
            </div>
          </div>
          
          <div class="card-stat">
            <div class="card-stat-icone">🛒</div>
            <div class="card-stat-info">
              <p>Vendas</p>
              <h3 id="statTotalVendas">0</h3>
            </div>
          </div>
          
          <div class="card-stat">
            <div class="card-stat-icone">📦</div>
            <div class="card-stat-info">
              <p>Itens Vendidos</p>
              <h3 id="statItensVendidos">0</h3>
            </div>
          </div>
          
          <div class="card-stat">
            <div class="card-stat-icone">💳</div>
            <div class="card-stat-info">
              <p>Ticket Médio</p>
              <h3 id="statTicketMedio">R$ 0.00</h3>
            </div>
          </div>
        </div>
        
        <div class="graficos-container">
          <div class="grafico-card">
            <h3>💳 Formas de Pagamento</h3>
            <div id="graficoPagamentos"></div>
          </div>
          
          <div class="grafico-card">
            <h3>🏆 Top 5 Produtos</h3>
            <div id="topProdutos"></div>
          </div>
        </div>
      </div>
      
      <!-- ABA HORÁRIOS -->
      <div class="aba-conteudo" id="abaHorarios" style="display: none;">
        <div class="grafico-card-grande">
          <h3>🕐 Distribuição de Vendas por Horário</h3>
          <div id="graficoHorarios"></div>
        </div>
        
        <div class="cards-estatisticas">
          <div class="card-stat">
            <div class="card-stat-icone">🌅</div>
            <div class="card-stat-info">
              <p>Manhã (6h-12h)</p>
              <h3 id="statManha">R$ 0.00</h3>
              <small id="statManhaQtd">0 vendas</small>
            </div>
          </div>
          
          <div class="card-stat">
            <div class="card-stat-icone">☀️</div>
            <div class="card-stat-info">
              <p>Tarde (12h-18h)</p>
              <h3 id="statTarde">R$ 0.00</h3>
              <small id="statTardeQtd">0 vendas</small>
            </div>
          </div>
          
          <div class="card-stat">
            <div class="card-stat-icone">🌙</div>
            <div class="card-stat-info">
              <p>Noite (18h-24h)</p>
              <h3 id="statNoite">R$ 0.00</h3>
              <small id="statNoiteQtd">0 vendas</small>
            </div>
          </div>
        </div>
      </div>
      
      <!-- ABA COMPARATIVO -->
      <div class="aba-conteudo" id="abaComparativo" style="display: none;">
        <div class="comparativo-controles">
          <div class="filtro-grupo">
            <label>Comparar:</label>
            <select id="selectTipoComparacao" class="select-filtro">
              <option value="dia">Dia a Dia</option>
              <option value="semana">Semana a Semana</option>
              <option value="mes">Mês a Mês</option>
            </select>
          </div>
          <button class="btn btn-primary" id="btnGerarComparativo">📊 Gerar</button>
        </div>
        
        <div id="resultadoComparativo"></div>
      </div>
      
      <!-- ABA VENDAS -->
      <div class="aba-conteudo" id="abaVendas" style="display: none;">
        <div class="tabela-container">
          <table class="tabela-produtos">
            <thead>
              <tr>
                <th>ID</th>
                <th>Data/Hora</th>
                <th>Itens</th>
                <th>Subtotal</th>
                <th>Desconto</th>
                <th>Total</th>
                <th>Pagamento</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="listaVendasRelatorio"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  // Event listeners
  document.getElementById('filtroPeriodoRapido').addEventListener('change', (e) => {
    const personalizado = document.getElementById('filtroPersonalizado');
    personalizado.style.display = e.target.value === 'personalizado' ? 'flex' : 'none';
  });
  
  document.querySelectorAll('.aba-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const aba = btn.getAttribute('data-aba');
      trocarAbaRelatorio(aba);
    });
  });
  
  document.getElementById('btnAtualizarRelatorio').addEventListener('click', carregarDadosRelatorio);
  document.getElementById('btnExportarExcel').addEventListener('click', exportarRelatorioExcel);
  document.getElementById('btnGerarComparativo').addEventListener('click', gerarComparativo);
  
  // Inicializar datas
  const hoje = new Date();
  document.getElementById('inputDataInicio').valueAsDate = hoje;
  document.getElementById('inputDataFim').valueAsDate = hoje;
  
  // Carregar dados iniciais
  carregarDadosRelatorio();
}

function trocarAbaRelatorio(nomeAba) {
  document.querySelectorAll('.aba-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-aba="${nomeAba}"]`).classList.add('active');
  
  document.querySelectorAll('.aba-conteudo').forEach(aba => aba.style.display = 'none');
  document.getElementById(`aba${nomeAba.charAt(0).toUpperCase() + nomeAba.slice(1)}`).style.display = 'block';
  
  if (nomeAba === 'horarios') analisarHorarios();
}

function obterPeriodoSelecionado() {
  const periodo = document.getElementById('filtroPeriodoRapido').value;
  const hoje = new Date();
  
  let dataInicio, dataFim;
  
  if (periodo === 'personalizado') {
    dataInicio = new Date(document.getElementById('inputDataInicio').value);
    dataFim = new Date(document.getElementById('inputDataFim').value);
    dataFim.setHours(23, 59, 59, 999);
  } else if (periodo === 'hoje') {
    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
  } else if (periodo === 'ontem') {
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    dataInicio = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate());
    dataFim = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23, 59, 59);
  } else if (periodo === 'semana') {
    dataInicio = new Date(hoje);
    dataInicio.setDate(hoje.getDate() - hoje.getDay());
    dataInicio.setHours(0, 0, 0, 0);
    dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
  } else if (periodo === 'mes') {
    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
  }
  
  return {
    inicio: dataInicio.toISOString(),
    fim: dataFim.toISOString()
  };
}

function carregarDadosRelatorio() {
  const periodo = obterPeriodoSelecionado();
  const filtroPagamento = document.getElementById('filtroPagamento').value;
  
  db.buscarVendasPorPeriodo(periodo.inicio, periodo.fim, (err, vendas) => {
    if (err) {
      console.error('Erro ao carregar vendas:', err);
      return;
    }
    
    vendasAtuais = vendas;
    
    // Aplicar filtro de pagamento
    if (filtroPagamento !== 'todos') {
      // Filtrar vendas que tenham essa forma de pagamento
      filtrarPorFormaPagamento(vendas, filtroPagamento);
    } else {
      atualizarRelatorioGeral(vendas);
    }
  });
}

function filtrarPorFormaPagamento(vendas, forma) {
  let vendasFiltradas = [];
  let processadas = 0;
  
  if (vendas.length === 0) {
    atualizarRelatorioGeral([]);
    return;
  }
  
  vendas.forEach(venda => {
    db.buscarPagamentosVenda(venda.id, (err, pagamentos) => {
      if (!err && pagamentos) {
        const temFormaPagamento = pagamentos.some(p => p.forma_pagamento === forma);
        if (temFormaPagamento) {
          vendasFiltradas.push(venda);
        }
      }
      
      processadas++;
      
      if (processadas === vendas.length) {
        atualizarRelatorioGeral(vendasFiltradas);
      }
    });
  });
}

function atualizarRelatorioGeral(vendas) {
  const totalVendido = vendas.reduce((acc, v) => acc + v.total_final, 0);
  const totalVendas = vendas.length;
  const itensVendidos = vendas.reduce((acc, v) => acc + v.quantidade_itens, 0);
  const ticketMedio = totalVendas > 0 ? totalVendido / totalVendas : 0;
  
  document.getElementById('statTotalVendido').textContent = `R$ ${totalVendido.toFixed(2)}`;
  document.getElementById('statTotalVendas').textContent = totalVendas;
  document.getElementById('statItensVendidos').textContent = itensVendidos;
  document.getElementById('statTicketMedio').textContent = `R$ ${ticketMedio.toFixed(2)}`;
  
  atualizarGraficoPagamentos(vendas);
  atualizarTopProdutos(vendas);
  atualizarTabelaVendas(vendas);
}

function atualizarGraficoPagamentos(vendas) {
  const container = document.getElementById('graficoPagamentos');
  
  if (vendas.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">Nenhuma venda no período</p>';
    return;
  }
  
  const pagamentos = {};
  let processadas = 0;
  
  vendas.forEach(venda => {
    db.buscarPagamentosVenda(venda.id, (err, pags) => {
      if (!err && pags) {
        pags.forEach(pag => {
          if (!pagamentos[pag.forma_pagamento]) {
            pagamentos[pag.forma_pagamento] = { total: 0, quantidade: 0 };
          }
          pagamentos[pag.forma_pagamento].total += pag.valor;
          pagamentos[pag.forma_pagamento].quantidade++;
        });
      }
      
      processadas++;
      
      if (processadas === vendas.length) {
        const totalGeral = Object.values(pagamentos).reduce((acc, p) => acc + p.total, 0);
        
        let html = '';
        Object.keys(pagamentos).forEach(forma => {
          const dados = pagamentos[forma];
          const porcentagem = ((dados.total / totalGeral) * 100).toFixed(1);
          
          html += `
            <div class="barra-pagamento">
              <div class="barra-info">
                <span>${forma}</span>
                <span>R$ ${dados.total.toFixed(2)} (${porcentagem}%)</span>
              </div>
              <div class="barra-container">
                <div class="barra-preenchimento" style="width: ${porcentagem}%"></div>
              </div>
              <small>${dados.quantidade} transações</small>
            </div>
          `;
        });
        
        container.innerHTML = html;
      }
    });
  });
}

function atualizarTopProdutos(vendas) {
  const container = document.getElementById('topProdutos');
  
  if (vendas.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">Nenhuma venda no período</p>';
    return;
  }
  
  const todosProdutos = {};
  let processadas = 0;
  
  vendas.forEach(venda => {
    db.buscarDetalhesVenda(venda.id, (err, itens) => {
      if (!err && itens) {
        itens.forEach(item => {
          const nome = item.produto_nome || item.combo_nome;
          if (!todosProdutos[nome]) {
            todosProdutos[nome] = { quantidade: 0, total: 0 };
          }
          todosProdutos[nome].quantidade += item.quantidade;
          todosProdutos[nome].total += item.subtotal;
        });
      }
      
      processadas++;
      
      if (processadas === vendas.length) {
        const ranking = Object.keys(todosProdutos)
          .map(nome => ({
            nome,
            quantidade: todosProdutos[nome].quantidade,
            total: todosProdutos[nome].total
          }))
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 5);
        
        if (ranking.length === 0) {
          container.innerHTML = '<p class="text-muted text-center">Nenhum produto vendido</p>';
          return;
        }
        
        let html = '<div class="lista-top-produtos">';
        ranking.forEach((produto, index) => {
          html += `
            <div class="item-top-produto">
              <div class="produto-posicao">${index + 1}º</div>
              <div class="produto-detalhes">
                <div class="produto-nome-top">${produto.nome}</div>
                <div class="produto-stats">
                  <span>📦 ${produto.quantidade} vendidos</span>
                  <span>💰 R$ ${produto.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          `;
        });
        html += '</div>';
        
        container.innerHTML = html;
      }
    });
  });
}

function atualizarTabelaVendas(vendas) {
  const tbody = document.getElementById('listaVendasRelatorio');
  
  if (vendas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">Nenhuma venda no período</td></tr>';
    return;
  }
  
  tbody.innerHTML = vendas.map(v => {
    const data = new Date(v.data_hora).toLocaleString('pt-BR');
    
    return `
      <tr>
        <td>#${v.id}</td>
        <td>${data}</td>
        <td>${v.quantidade_itens}</td>
        <td>R$ ${v.total.toFixed(2)}</td>
        <td>${v.desconto > 0 ? `R$ ${v.desconto.toFixed(2)}` : '-'}</td>
        <td class="font-weight-bold">R$ ${v.total_final.toFixed(2)}</td>
        <td><span id="pagamentos-${v.id}">...</span></td>
        <td>
          <button class="btn-acao" onclick="verDetalhesVenda(${v.id})" title="Detalhes">👁️</button>
          <button class="btn-acao" onclick="abrirModalReimpressao(${v.id})" title="Reimprimir">🖨️</button>
        </td>
      </tr>
    `;
  }).join('');
  
  // Carregar formas de pagamento
  vendas.forEach(v => {
    db.buscarPagamentosVenda(v.id, (err, pags) => {
      if (!err && pags) {
        const formas = pags.map(p => p.forma_pagamento).join(', ');
        const elem = document.getElementById(`pagamentos-${v.id}`);
        if (elem) elem.textContent = formas;
      }
    });
  });
}

function verDetalhesVenda(vendaId) {
  db.buscarDetalhesVenda(vendaId, (err, itens) => {
    if (err) {
      alert('Erro ao carregar detalhes!');
      return;
    }
    
    let detalhes = `📋 VENDA #${vendaId}\n\n`;
    
    itens.forEach(item => {
      const nome = item.produto_nome || item.combo_nome;
      detalhes += `${item.quantidade}x ${nome}\n`;
      detalhes += `   R$ ${item.preco_unitario.toFixed(2)} = R$ ${item.subtotal.toFixed(2)}\n`;
      if (item.observacao) {
        detalhes += `   💬 ${item.observacao}\n`;
      }
      detalhes += '\n';
    });
    
    const total = itens.reduce((acc, item) => acc + item.subtotal, 0);
    detalhes += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    detalhes += `TOTAL: R$ ${total.toFixed(2)}`;
    
    alert(detalhes);
  });
}

function analisarHorarios() {
  const periodo = obterPeriodoSelecionado();
  
  db.buscarVendasPorPeriodo(periodo.inicio, periodo.fim, (err, vendas) => {
    if (err) return;
    
    const horarios = Array(24).fill(0).map(() => ({ vendas: 0, total: 0 }));
    
    vendas.forEach(venda => {
      const hora = new Date(venda.data_hora).getHours();
      horarios[hora].vendas++;
      horarios[hora].total += venda.total_final;
    });
    
    // Calcular totais por período
    let manha = { total: 0, vendas: 0 };
    let tarde = { total: 0, vendas: 0 };
    let noite = { total: 0, vendas: 0 };
    
    for (let h = 6; h < 12; h++) {
      manha.total += horarios[h].total;
      manha.vendas += horarios[h].vendas;
    }
    
    for (let h = 12; h < 18; h++) {
      tarde.total += horarios[h].total;
      tarde.vendas += horarios[h].vendas;
    }
    
    for (let h = 18; h < 24; h++) {
      noite.total += horarios[h].total;
      noite.vendas += horarios[h].vendas;
    }
    
    document.getElementById('statManha').textContent = `R$ ${manha.total.toFixed(2)}`;
    document.getElementById('statManhaQtd').textContent = `${manha.vendas} vendas`;
    
    document.getElementById('statTarde').textContent = `R$ ${tarde.total.toFixed(2)}`;
    document.getElementById('statTardeQtd').textContent = `${tarde.vendas} vendas`;
    
    document.getElementById('statNoite').textContent = `R$ ${noite.total.toFixed(2)}`;
    document.getElementById('statNoiteQtd').textContent = `${noite.vendas} vendas`;
    
    // Gerar gráfico
    const container = document.getElementById('graficoHorarios');
    const maxVendas = Math.max(...horarios.map(h => h.vendas));
    
    let html = '<div class="grafico-barras-horario">';
    
    horarios.forEach((h, hora) => {
      const altura = maxVendas > 0 ? (h.vendas / maxVendas) * 100 : 0;
      
      html += `
        <div class="barra-horario">
          <div class="barra-coluna" style="height: ${altura}%" title="${h.vendas} vendas - R$ ${h.total.toFixed(2)}"></div>
          <div class="barra-label">${hora}h</div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  });
}

function gerarComparativo() {
  const tipo = document.getElementById('selectTipoComparacao').value;
  const container = document.getElementById('resultadoComparativo');
  
  container.innerHTML = '<p class="text-center">⏳ Gerando comparativo...</p>';
  
  // Implementação simplificada - pode ser expandida
  setTimeout(() => {
    container.innerHTML = `
      <div class="alert alert-info">
        📊 Funcionalidade de comparativo em desenvolvimento!
        <br><br>
        Em breve você poderá comparar:
        <ul>
          <li>Vendas dia a dia</li>
          <li>Semanas comparadas</li>
          <li>Meses do ano</li>
        </ul>
      </div>
    `;
  }, 500);
}

function exportarRelatorioExcel() {
  if (vendasAtuais.length === 0) {
    alert('Nenhuma venda para exportar!');
    return;
  }
  
  exportador.exportarExcel(vendasAtuais, (err, caminho) => {
    if (err) {
      alert('Erro ao exportar!');
      return;
    }
    
    alert(`✅ Relatório exportado!\n\n${caminho}`);
  });
}

// Exportar funções globais
window.fazerLogout = fazerLogout;
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.alterarQuantidade = alterarQuantidade;
window.adicionarObservacao = adicionarObservacao;
window.removerDoCarrinho = removerDoCarrinho;
window.imprimirCupom = imprimirCupom;
window.imprimirAmbos = imprimirAmbos;
window.abrirModalReimpressao = abrirModalReimpressao;
window.toggleDisponibilidadeProduto = toggleDisponibilidadeProduto;
window.editarProduto = editarProduto;
window.deletarProduto = deletarProduto;
window.adicionarCategoria = adicionarCategoria;
window.deletarCategoria = deletarCategoria;
window.toggleDisponibilidadeCombo = toggleDisponibilidadeCombo;
window.verDetalhesCombo = verDetalhesCombo;
window.editarCombo = editarCombo;
window.deletarCombo = deletarCombo;
window.adicionarProdutoAoCombo = adicionarProdutoAoCombo;
window.editarUsuario = editarUsuario;
window.deletarUsuario = deletarUsuario;
window.verDetalhesFechamento = verDetalhesFechamento;
window.verDetalhesVenda = verDetalhesVenda;