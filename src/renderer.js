const db = require('./database/db');
const exportador = require('./services/exportar');
const backup = require('./services/backup');
const { ipcRenderer } = require('electron');

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

// Controle de navegação entre telas
const btnVendas = document.getElementById('btnVendas');
const btnProdutos = document.getElementById('btnProdutos');
const btnRelatorios = document.getElementById('btnRelatorios');
const mainContent = document.getElementById('mainContent');

// Dados temporários
let carrinho = [];
let produtos = [];

// ============================================
// INICIALIZAÇÃO
// ============================================

// Carregar produtos do banco ao iniciar
carregarProdutosDoBanco();

// Aguardar produtos carregarem antes de mostrar tela
setTimeout(() => {
  mostrarTelaVendas();
  ativarBotao(btnVendas);
}, 500);

// Evento: Clique no botão Vendas
btnVendas.addEventListener('click', () => {
  mostrarTelaVendas();
  ativarBotao(btnVendas);
});

// Evento: Clique no botão Produtos
btnProdutos.addEventListener('click', () => {
  mostrarTelaProdutos();
  ativarBotao(btnProdutos);
});

// Evento: Clique no botão Relatórios
btnRelatorios.addEventListener('click', () => {
  mostrarTelaRelatorios();
  ativarBotao(btnRelatorios);
});

// Executar limpeza a cada 2 segundos
setInterval(limparModaisOrfaos, 2000);

// Adicione esta função auxiliar no início do arquivo, após as variáveis globais
function restaurarFoco() {
  // Aguarda um momento para garantir que o modal foi removido
  setTimeout(() => {
    // Tenta focar no input de busca de produtos (tela de vendas)
    const inputBusca = document.getElementById('inputBusca');
    if (inputBusca && inputBusca.offsetParent !== null) {
      inputBusca.focus();
      return;
    }

    // Se não estiver na tela de vendas, foca no corpo do documento
    document.body.focus();

    // Força o blur/focus para "acordar" os inputs
    const elementoAtivo = document.activeElement;
    if (elementoAtivo) {
      elementoAtivo.blur();
    }
  }, 100);
}

// Adicione esta função
function restaurarFocoWorkaround() {
  // Cria um overlay invisível temporário
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.zIndex = '9999';
  overlay.style.opacity = '0';
  overlay.tabIndex = 0; // Torna focável

  document.body.appendChild(overlay);

  // Foca no overlay
  overlay.focus();

  // Remove após um momento
  setTimeout(() => {
    overlay.remove();

    // Agora tenta focar no input desejado
    const inputBusca = document.getElementById('inputBusca');
    if (inputBusca && window.getComputedStyle(inputBusca).display !== 'none') {
      inputBusca.focus();
    }
  }, 50);
}

async function restaurarFocoElectron() {
  try {
    // Pede ao processo principal para restaurar foco
    await ipcRenderer.invoke('restaurar-foco');

    // Aguarda um pouco e tenta focar no input
    setTimeout(() => {
      const inputBusca = document.getElementById('inputBusca');
      if (
        inputBusca &&
        window.getComputedStyle(inputBusca).display !== 'none'
      ) {
        inputBusca.focus();
        inputBusca.select(); // Seleciona o texto se houver
      } else {
        // Se não tem input de busca, foca no documento
        document.body.focus();
      }

      // Força um reflow do DOM
      document.body.style.display = 'none';
      document.body.offsetHeight; // Trigger reflow
      document.body.style.display = '';
    }, 100);
  } catch (error) {
    console.error('Erro ao restaurar foco:', error);
    // Fallback simples
    document.body.focus();
  }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Limpar modais órfãos
function limparModaisOrfaos() {
  const modais = document.querySelectorAll('.modal-overlay');
  modais.forEach((modal) => {
    if (
      !modal.querySelector('.modal') &&
      !modal.querySelector('.modal-pagamento')
    ) {
      modal.remove();
      console.log('🧹 Modal órfão removido');
    }
  });
}

// Função: Ativar botão do menu
function ativarBotao(botaoAtivo) {
  [btnVendas, btnProdutos, btnRelatorios].forEach((btn) => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  });
  botaoAtivo.classList.remove('btn-secondary');
  botaoAtivo.classList.add('btn-primary');
}

// Função: Carregar produtos do banco
function carregarProdutosDoBanco() {
  db.buscarProdutosComCategoria((err, rows) => {
    if (err) {
      console.error('❌ Erro ao carregar produtos:', err);
      alert('Erro ao carregar produtos do banco de dados!');
      return;
    }
    produtos = rows;
    console.log('✅ Produtos carregados:', produtos.length);
  });
}

// ============================================
// TELA DE VENDAS
// ============================================
function mostrarTelaVendas() {
  carrinho = []; // Limpa carrinho ao entrar

  mainContent.innerHTML = `
    <div class="tela-vendas">
      <div class="painel-produtos">
  <h2>Produtos Disponíveis</h2>
  <button class="btn btn-secondary btn-teste-impressora" id="btnTesteImpressora">
    🖨️ Testar Impressora
  </button>
  
  <div class="busca-produtos">
    <input type="text" id="inputBusca" placeholder="🔍 Buscar produtos..." />
  </div>
  
  <div class="filtro-categorias" id="filtroCategorias">
    <button class="btn-categoria active" data-categoria="">Todos</button>
  </div>
  
  <div class="lista-produtos" id="listaProdutos"></div>
</div>
      
      <div class="painel-carrinho">
        <h2>Carrinho</h2>
        <div class="carrinho-itens" id="carrinhoItens">
          <p class="carrinho-vazio">Nenhum item adicionado</p>
        </div>
        
        <div class="carrinho-total">
          <h3>Total: R$ <span id="totalVenda">0.00</span></h3>
        </div>
        
        <div class="carrinho-acoes">
          <button class="btn btn-danger" id="btnLimpar">Limpar Carrinho</button>
          <button class="btn btn-success" id="btnFinalizar">Finalizar Venda</button>
        </div>
      </div>
    </div>
  `;

  carregarProdutos();
  carregarFiltroCategorias();

  // Eventos dos botões
  document
    .getElementById('btnLimpar')
    .addEventListener('click', limparCarrinho);
  document
    .getElementById('btnFinalizar')
    .addEventListener('click', finalizarVenda);
  document
    .getElementById('btnTesteImpressora')
    .addEventListener('click', testarImpressora);

  // Evento de busca
  document.getElementById('inputBusca').addEventListener('input', (e) => {
    filtrarProdutos(e.target.value);
  });
}

// Carregar categorias no filtro
function carregarFiltroCategorias() {
  db.buscarCategorias((err, categorias) => {
    if (err) return;

    const filtro = document.getElementById('filtroCategorias');
    if (!filtro) return;

    const botoes = categorias
      .map(
        (cat) =>
          `<button class="btn-categoria" data-categoria="${cat.id}" style="border-color: ${cat.cor}">${cat.nome}</button>`
      )
      .join('');

    filtro.innerHTML = `
      <button class="btn-categoria active" data-categoria="">Todos</button>
      ${botoes}
    `;

    // Eventos dos botões de categoria
    filtro.querySelectorAll('.btn-categoria').forEach((btn) => {
      btn.addEventListener('click', () => {
        // Remover active de todos
        filtro
          .querySelectorAll('.btn-categoria')
          .forEach((b) => b.classList.remove('active'));
        // Adicionar active no clicado
        btn.classList.add('active');
        // Filtrar
        const categoriaId = btn.getAttribute('data-categoria');
        filtrarPorCategoria(categoriaId);
      });
    });
  });
}

function filtrarPorCategoria(categoriaId) {
  const listaProdutos = document.getElementById('listaProdutos');
  const termoBusca = document
    .getElementById('inputBusca')
    .value.toLowerCase()
    .trim();

  let produtosFiltrados = produtos;

  if (categoriaId) {
    produtosFiltrados = produtosFiltrados.filter(
      (p) => p.categoria_id == categoriaId
    );
  }

  if (termoBusca) {
    produtosFiltrados = produtosFiltrados.filter((produto) =>
      produto.nome.toLowerCase().includes(termoBusca)
    );
  }

  if (produtosFiltrados.length === 0) {
    listaProdutos.innerHTML =
      '<p class="carrinho-vazio">Nenhum produto encontrado</p>';
    return;
  }

  listaProdutos.innerHTML = produtosFiltrados
    .map((produto) => {
      const categoria = produto.categoria_nome
        ? `<div class="produto-categoria" style="background-color: ${produto.categoria_cor}">${produto.categoria_nome}</div>`
        : '';

      const estoqueDisplay = produto.controlar_estoque
        ? `Estoque: ${produto.estoque}`
        : 'Estoque: ∞';

      return `
      <div class="produto-card" onclick="adicionarAoCarrinho(${produto.id})">
        ${categoria}
        <div class="produto-nome">${produto.nome}</div>
        <div class="produto-preco">R$ ${produto.preco.toFixed(2)}</div>
        <div class="produto-estoque">${estoqueDisplay}</div>
      </div>
    `;
    })
    .join('');
}

// Função: Carregar produtos na tela
function carregarProdutos() {
  const listaProdutos = document.getElementById('listaProdutos');

  if (produtos.length === 0) {
    listaProdutos.innerHTML =
      '<p class="carrinho-vazio">Nenhum produto cadastrado</p>';
    return;
  }

  listaProdutos.innerHTML = produtos
    .map((produto) => {
      const categoria = produto.categoria_nome
        ? `<div class="produto-categoria" style="background-color: ${produto.categoria_cor}">${produto.categoria_nome}</div>`
        : '';

      const estoqueDisplay = produto.controlar_estoque
        ? `Estoque: ${produto.estoque}`
        : 'Estoque: ∞';

      return `
      <div class="produto-card" onclick="adicionarAoCarrinho(${produto.id})">
        ${categoria}
        <div class="produto-nome">${produto.nome}</div>
        <div class="produto-preco">R$ ${produto.preco.toFixed(2)}</div>
        <div class="produto-estoque">${estoqueDisplay}</div>
      </div>
    `;
    })
    .join('');
}

// Função: Filtrar produtos pela busca
function filtrarProdutos(termo) {
  const listaProdutos = document.getElementById('listaProdutos');
  const termoBusca = termo.toLowerCase().trim();

  if (!termoBusca) {
    carregarProdutos();
    return;
  }

  const produtosFiltrados = produtos.filter(
    (produto) =>
      produto.nome.toLowerCase().includes(termoBusca) ||
      (produto.categoria_nome &&
        produto.categoria_nome.toLowerCase().includes(termoBusca))
  );

  if (produtosFiltrados.length === 0) {
    listaProdutos.innerHTML =
      '<p class="carrinho-vazio">Nenhum produto encontrado</p>';
    return;
  }

  listaProdutos.innerHTML = produtosFiltrados
    .map((produto) => {
      const categoria = produto.categoria_nome
        ? `<div class="produto-categoria" style="background-color: ${produto.categoria_cor}">${produto.categoria_nome}</div>`
        : '';

      return `
      <div class="produto-card" onclick="adicionarAoCarrinho(${produto.id})">
        ${categoria}
        <div class="produto-nome">${produto.nome}</div>
        <div class="produto-preco">R$ ${produto.preco.toFixed(2)}</div>
        <div class="produto-estoque">Estoque: ${produto.estoque}</div>
      </div>
    `;
    })
    .join('');
}

// Função: Adicionar produto ao carrinho
function adicionarAoCarrinho(produtoId) {
  const produto = produtos.find((p) => p.id === produtoId);

  if (!produto) {
    alert('Produto não encontrado!');
    return;
  }

  // Verifica se já existe no carrinho
  const itemExistente = carrinho.find((item) => item.id === produtoId);

  if (itemExistente) {
    if (itemExistente.quantidade >= produto.estoque) {
      alert(`Estoque insuficiente! Disponível: ${produto.estoque}`);
      return;
    }
    itemExistente.quantidade++;
  } else {
    if (produto.estoque <= 0) {
      alert('Produto sem estoque!');
      return;
    }
    carrinho.push({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      quantidade: 1,
    });
  }

  atualizarCarrinho();
}

// Função: Atualizar carrinho na tela
function atualizarCarrinho() {
  const carrinhoItens = document.getElementById('carrinhoItens');
  const totalVenda = document.getElementById('totalVenda');

  if (carrinho.length === 0) {
    carrinhoItens.innerHTML =
      '<p class="carrinho-vazio">Nenhum item adicionado</p>';
    totalVenda.textContent = '0.00';
    return;
  }

  carrinhoItens.innerHTML = carrinho
    .map(
      (item) => `
    <div class="carrinho-item">
      <div class="item-info">
        <span class="item-nome">${item.nome}</span>
        <span class="item-quantidade">x${item.quantidade}</span>
      </div>
      <div class="item-preco">R$ ${(item.preco * item.quantidade).toFixed(
        2
      )}</div>
      <button class="btn-remover" onclick="removerDoCarrinho(${
        item.id
      })">✕</button>
    </div>
  `
    )
    .join('');

  const total = carrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0
  );
  totalVenda.textContent = total.toFixed(2);
}

// Função: Remover item do carrinho
function removerDoCarrinho(produtoId) {
  carrinho = carrinho.filter((item) => item.id !== produtoId);
  atualizarCarrinho();
}

// Função: Limpar carrinho
function limparCarrinho() {
  if (confirm('Deseja realmente limpar o carrinho?')) {
    carrinho = [];
    atualizarCarrinho();
  }
}

// Função: Finalizar venda
async function finalizarVenda() {
  if (carrinho.length === 0) {
    alert('Adicione produtos ao carrinho antes de finalizar!');
    return;
  }

  const total = carrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0
  );

  // Abrir modal de pagamento
  abrirModalPagamento(total);
}

// ============================================
// TELA DE PRODUTOS
// ============================================
function mostrarTelaProdutos() {
  mainContent.innerHTML = `
    <div class="tela-produtos">
      <div class="produtos-header">
  <h2>📦 Cadastro de Produtos</h2>
  <div class="produtos-acoes">
    <button class="btn btn-secondary" id="btnGerenciarCategorias">🏷️ Gerenciar Categorias</button>
    <button class="btn btn-primary" id="btnNovoProduto">+ Novo Produto</button>
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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="listaProdutosTabela"></tbody>
        </table>
      </div>
    </div>
  `;

  carregarTabelaProdutos();

  document.getElementById('btnNovoProduto').addEventListener('click', () => {
    abrirModalProduto();
  });

  document
    .getElementById('btnGerenciarCategorias')
    .addEventListener('click', () => {
      abrirModalCategorias();
    });
}

function carregarTabelaProdutos() {
  const tbody = document.getElementById('listaProdutosTabela');

  if (produtos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center; padding: 40px;">Nenhum produto cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = produtos
    .map((produto) => {
      const categoria = produto.categoria_nome
        ? `<span class="badge-categoria" style="background-color: ${produto.categoria_cor}">${produto.categoria_nome}</span>`
        : '<span class="badge-categoria" style="background-color: #95a5a6">Sem categoria</span>';

      const iconeEstoque = produto.controlar_estoque ? '✅' : '❌';

      return `
      <tr>
        <td>${produto.id}</td>
        <td>
          ${produto.nome}
          ${categoria}
        </td>
        <td>R$ ${produto.preco.toFixed(2)}</td>
        <td>${produto.estoque} ${iconeEstoque}</td>
        <td>
          <button class="btn-acao btn-editar" onclick="editarProduto(${
            produto.id
          })">✏️ Editar</button>
          <button class="btn-acao btn-deletar" onclick="deletarProduto(${
            produto.id
          })">🗑️ Deletar</button>
        </td>
      </tr>
    `;
    })
    .join('');
}

// Abrir modal para adicionar/editar produto
function abrirModalProduto(produtoId = null) {
  limparModaisOrfaos();
  const produto = produtoId ? produtos.find((p) => p.id === produtoId) : null;
  const titulo = produto ? 'Editar Produto' : 'Novo Produto';

  db.buscarCategorias((err, categorias) => {
    if (err) {
      alert('Erro ao carregar categorias!');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalProduto';

    const opcoesCategoria = categorias
      .map(
        (cat) =>
          `<option value="${cat.id}" ${
            produto && produto.categoria_id === cat.id ? 'selected' : ''
          }>${cat.nome}</option>`
      )
      .join('');

    modal.innerHTML = `
  <div class="modal modal-produto">
    <button class="btn-fechar-modal" id="btnFecharProduto">✕</button>
    <h2>${titulo}</h2>
    <form id="formProduto">
      <div class="form-group">
        <label>Nome do Produto *</label>
        <input type="text" id="inputNome" value="${
          produto ? produto.nome : ''
        }" required>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Preço (R$) *</label>
          <input type="number" id="inputPreco" step="0.01" min="0" value="${
            produto ? produto.preco : ''
          }" required>
        </div>
        
        <div class="form-group">
          <label>Categoria</label>
          <select id="selectCategoria" class="select-pagamento">
            <option value="">Sem categoria</option>
            ${opcoesCategoria}
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="checkControlarEstoque" ${
            !produto || produto.controlar_estoque ? 'checked' : ''
          }>
          <span>Controlar estoque automaticamente</span>
        </label>
      </div>
      
      <div id="camposEstoque" style="${
        !produto || produto.controlar_estoque ? '' : 'display: none;'
      }">
        <div class="form-row">
          <div class="form-group">
            <label>Estoque Inicial *</label>
            <input type="number" id="inputEstoque" min="0" value="${
              produto ? (produto.estoque === 999999 ? 0 : produto.estoque) : '0'
            }">
          </div>
          
          <div class="form-group">
            <label>Estoque Mínimo *</label>
            <input type="number" id="inputEstoqueMinimo" min="1" value="${
              produto ? produto.estoque_minimo || 10 : '10'
            }">
            <small class="help-text">Alerta quando estoque atingir este valor</small>
          </div>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="btnCancelar">Cancelar</button>
        <button type="submit" class="btn btn-success">Salvar</button>
      </div>
    </form>
  </div>
`;

    document.body.appendChild(modal);
    document.getElementById('inputNome').focus();

    const checkControlarEstoque = document.getElementById(
      'checkControlarEstoque'
    );
    const camposEstoque = document.getElementById('camposEstoque');

    checkControlarEstoque.addEventListener('change', () => {
      if (checkControlarEstoque.checked) {
        camposEstoque.style.display = 'block';
      } else {
        camposEstoque.style.display = 'none';
      }
    });

    document
      .getElementById('btnFecharProduto')
      .addEventListener('click', () => {
        modal.remove();
        restaurarFoco();
      });

    document.getElementById('btnCancelar').addEventListener('click', () => {
      modal.remove();
      restaurarFoco();
    });

    document.getElementById('formProduto').addEventListener('submit', (e) => {
      e.preventDefault();
      salvarProdutoCompleto(produtoId);
    });
  });
}

function salvarProdutoCompleto(produtoId) {
  const nome = document.getElementById('inputNome').value.trim();
  const preco = parseFloat(document.getElementById('inputPreco').value);
  const controlarEstoque = document.getElementById(
    'checkControlarEstoque'
  ).checked;
  const estoque = controlarEstoque
    ? parseInt(document.getElementById('inputEstoque').value)
    : 0;
  const estoqueMinimo = controlarEstoque
    ? parseInt(document.getElementById('inputEstoqueMinimo').value)
    : 0;
  const categoriaId = document.getElementById('selectCategoria').value || null;

  if (!nome || isNaN(preco)) {
    alert('Por favor, preencha todos os campos obrigatórios!');
    return;
  }

  if (controlarEstoque) {
    if (isNaN(estoque)) {
      alert('Por favor, informe o estoque inicial!');
      return;
    }
    if (isNaN(estoqueMinimo) || estoqueMinimo < 1) {
      alert('Por favor, informe o estoque mínimo (deve ser maior que 0)!');
      return;
    }
  }

  if (produtoId) {
    db.atualizarProdutoCompleto(
      produtoId,
      nome,
      preco,
      estoque,
      categoriaId,
      controlarEstoque,
      estoqueMinimo,
      (err) => {
        if (err) {
          console.error('❌ Erro ao atualizar produto:', err);
          alert('Erro ao atualizar produto!');
          return;
        }

        console.log('✅ Produto atualizado!');
        alert('Produto atualizado com sucesso!');
        document.getElementById('modalProduto').remove();
        carregarProdutosDoBanco();
        setTimeout(() => carregarTabelaProdutos(), 300);
      }
    );
  } else {
    db.inserirProdutoCompleto(
      nome,
      preco,
      estoque,
      categoriaId,
      controlarEstoque,
      estoqueMinimo,
      (err) => {
        if (err) {
          console.error('❌ Erro ao inserir produto:', err);
          alert('Erro ao cadastrar produto!');
          return;
        }

        console.log('✅ Produto cadastrado!');
        alert('Produto cadastrado com sucesso!');
        document.getElementById('modalProduto').remove();
        carregarProdutosDoBanco();
        setTimeout(() => carregarTabelaProdutos(), 300);
      }
    );
  }
}

function editarProduto(produtoId) {
  abrirModalProduto(produtoId);
}

function deletarProduto(produtoId) {
  const produto = produtos.find((p) => p.id === produtoId);

  if (!produto) {
    alert('Produto não encontrado!');
    return;
  }

  if (
    confirm(
      `Deseja realmente deletar o produto:\n\n"${produto.nome}"?\n\nEsta ação não pode ser desfeita.`
    )
  ) {
    db.deletarProduto(produtoId, (err) => {
      if (err) {
        console.error('❌ Erro ao deletar produto:', err);
        alert('Erro ao deletar produto!');
        return;
      }

      console.log('✅ Produto deletado!');
      alert('Produto deletado com sucesso!');
      carregarProdutosDoBanco();
      setTimeout(() => carregarTabelaProdutos(), 300);
    });
  }
}

// ============================================
// GERENCIAR CATEGORIAS
// ============================================

function abrirModalCategorias() {
  limparModaisOrfaos();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modalCategorias';

  modal.innerHTML = `
    <div class="modal modal-categorias">
      <button class="btn-fechar-modal" id="btnFecharCategorias">✕</button>
      <h2>🏷️ Gerenciar Categorias</h2>
      
      <div class="form-nova-categoria">
        <input type="text" id="inputNovaCategoria" placeholder="Nome da categoria">
        <input type="color" id="inputCorCategoria" value="#667eea">
        <button class="btn btn-primary" id="btnAdicionarCategoria">+ Adicionar</button>
      </div>
      
      <div class="lista-categorias" id="listaCategorias">
        <p class="texto-vazio">Carregando...</p>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="btnFecharModalCat">Fechar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  carregarListaCategorias();

  document
    .getElementById('btnFecharCategorias')
    .addEventListener('click', () => modal.remove());
  restaurarFoco();

  document
    .getElementById('btnFecharModalCat')
    .addEventListener('click', () => modal.remove());
  restaurarFoco();
  document
    .getElementById('btnAdicionarCategoria')
    .addEventListener('click', adicionarNovaCategoria);
}

function carregarListaCategorias() {
  db.buscarCategorias((err, categorias) => {
    if (err) {
      alert('Erro ao carregar categorias!');
      return;
    }

    const lista = document.getElementById('listaCategorias');

    if (categorias.length === 0) {
      lista.innerHTML =
        '<p class="texto-vazio">Nenhuma categoria cadastrada</p>';
      return;
    }

    lista.innerHTML = categorias
      .map(
        (cat, index) => `
      <div class="item-categoria" data-id="${cat.id}">
        <div class="categoria-ordem">
          <button class="btn-ordem" onclick="moverCategoriaAcima(${
            cat.id
          }, ${index})" ${index === 0 ? 'disabled' : ''}>▲</button>
          <span class="numero-ordem">${index + 1}</span>
          <button class="btn-ordem" onclick="moverCategoriaAbaixo(${
            cat.id
          }, ${index})" ${
          index === categorias.length - 1 ? 'disabled' : ''
        }>▼</button>
        </div>
        <div class="categoria-cor" style="background-color: ${cat.cor}"></div>
        <div class="categoria-nome">${cat.nome}</div>
        <div class="categoria-acoes">
          <button class="btn-acao" onclick="editarCategoria(${
            cat.id
          }, '${cat.nome.replace(/'/g, "\\'")}', '${cat.cor}')">✏️</button>
          <button class="btn-acao btn-deletar" onclick="deletarCategoriaConfirm(${
            cat.id
          })">🗑️</button>
        </div>
      </div>
    `
      )
      .join('');
  });
}

function moverCategoriaAcima(categoriaId, indexAtual) {
  db.buscarCategorias((err, categorias) => {
    if (err || indexAtual === 0) return;

    const categoriaAtual = categorias[indexAtual];
    const categoriaAcima = categorias[indexAtual - 1];

    db.atualizarOrdemCategoria(categoriaAtual.id, indexAtual - 1, (err) => {
      if (err) {
        console.error('Erro ao atualizar ordem:', err);
        return;
      }

      db.atualizarOrdemCategoria(categoriaAcima.id, indexAtual, (err) => {
        if (err) {
          console.error('Erro ao atualizar ordem:', err);
          return;
        }

        carregarListaCategorias();
        carregarProdutosDoBanco();
      });
    });
  });
}

function moverCategoriaAbaixo(categoriaId, indexAtual) {
  db.buscarCategorias((err, categorias) => {
    if (err || indexAtual === categorias.length - 1) return;

    const categoriaAtual = categorias[indexAtual];
    const categoriaAbaixo = categorias[indexAtual + 1];

    db.atualizarOrdemCategoria(categoriaAtual.id, indexAtual + 1, (err) => {
      if (err) {
        console.error('Erro ao atualizar ordem:', err);
        return;
      }

      db.atualizarOrdemCategoria(categoriaAbaixo.id, indexAtual, (err) => {
        if (err) {
          console.error('Erro ao atualizar ordem:', err);
          return;
        }

        carregarListaCategorias();
        carregarProdutosDoBanco();
      });
    });
  });
}

function adicionarNovaCategoria() {
  const nome = document.getElementById('inputNovaCategoria').value.trim();
  const cor = document.getElementById('inputCorCategoria').value;

  if (!nome) {
    alert('Digite o nome da categoria!');
    return;
  }

  db.buscarCategorias((err, categorias) => {
    const proximaOrdem = categorias.length;

    db.inserirCategoria(nome, cor, (err) => {
      if (err) {
        console.error('❌ Erro ao inserir categoria:', err);
        alert('Erro ao criar categoria!');
        return;
      }

      db.db.run(
        'UPDATE categorias SET ordem = ? WHERE nome = ?',
        [proximaOrdem, nome],
        (err) => {
          console.log('✅ Categoria criada!');
          document.getElementById('inputNovaCategoria').value = '';
          document.getElementById('inputCorCategoria').value = '#667eea';
          carregarListaCategorias();
          carregarProdutosDoBanco();
        }
      );
    });
  });
}

function editarCategoria(id, nomeAtual, corAtual) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modalEditarCategoria';

  modal.innerHTML = `
    <div class="modal">
      <button class="btn-fechar-modal" id="btnFecharEditCategoria">✕</button>
      <h2>✏️ Editar Categoria</h2>
      
      <div class="form-group">
        <label>Nome da Categoria *</label>
        <input type="text" id="inputEditarNome" value="${nomeAtual}">
      </div>
      
      <div class="form-group">
        <label>Cor</label>
        <input type="color" id="inputEditarCor" value="${corAtual}">
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="btnCancelarEditCat">Cancelar</button>
        <button type="button" class="btn btn-success" id="btnSalvarEditCat">Salvar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('inputEditarNome').focus();
  document.getElementById('inputEditarNome').select();

  document
    .getElementById('btnFecharEditCategoria')
    .addEventListener('click', () => {
      modal.remove();
      restaurarFoco();
    });

  document
    .getElementById('btnCancelarEditCat')
    .addEventListener('click', () => {
      modal.remove();
      restaurarFoco();
    });

  document.getElementById('btnSalvarEditCat').addEventListener('click', () => {
    const novoNome = document.getElementById('inputEditarNome').value.trim();
    const novaCor = document.getElementById('inputEditarCor').value;

    if (!novoNome) {
      alert('Digite o nome da categoria!');
      return;
    }

    db.atualizarCategoria(id, novoNome, novaCor, (err) => {
      if (err) {
        alert('Erro ao atualizar categoria!');
        return;
      }
      alert('Categoria atualizada!');
      modal.remove();
      carregarListaCategorias();
      carregarProdutosDoBanco();
      restaurarFoco();
    });
  });
}

function deletarCategoriaConfirm(id) {
  if (
    !confirm(
      'Deseja realmente deletar esta categoria?\n\nOs produtos com esta categoria ficarão sem categoria.'
    )
  ) {
    return;
  }

  db.deletarCategoria(id, (err) => {
    if (err) {
      alert('Erro ao deletar categoria!');
      return;
    }
    alert('Categoria deletada!');
    carregarListaCategorias();
    carregarProdutosDoBanco();
  });
}

// ============================================
// TELA DE RELATÓRIOS
// ============================================
function mostrarTelaRelatorios() {
  mainContent.innerHTML = `
    <div class="tela-relatorios">
      <div class="relatorios-header">
        <h2>📊 Relatórios</h2>
      </div>
      
      <div class="abas-relatorio">
        <button class="aba-btn active" data-aba="vendas">💰 Vendas</button>
        <button class="aba-btn" data-aba="estoque">📦 Estoque</button>
      </div>
      
      <!-- ABA DE VENDAS -->
      <div class="aba-conteudo" id="abaVendas">
        <div class="filtros-relatorio">
          <select id="filtroPeriodo" class="select-filtro">
            <option value="todos">Todos os períodos</option>
            <option value="hoje">Hoje</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mês</option>
          </select>
          
          <select id="filtroPagamento" class="select-filtro">
            <option value="todos">Todas formas de pagamento</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Cartão Débito">Cartão Débito</option>
            <option value="Cartão Crédito">Cartão Crédito</option>
            <option value="PIX">PIX</option>
          </select>
          
          <button class="btn btn-primary" id="btnAtualizarRelatorio">🔄 Atualizar</button>
          
          <div class="botoes-exportar">
            <button class="btn btn-success btn-exportar" id="btnExportarCSV">📄 CSV</button>
            <button class="btn btn-success btn-exportar" id="btnExportarExcel">📊 Excel</button>
            <button class="btn btn-success btn-exportar" id="btnExportarPDF">📕 PDF</button>
          </div>
        </div>
        
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
              <p>Total de Vendas</p>
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
            <div class="card-stat-icone">📈</div>
            <div class="card-stat-info">
              <p>Ticket Médio</p>
              <h3 id="statTicketMedio">R$ 0.00</h3>
            </div>
          </div>
        </div>
        
        <div class="relatorios-grid">
          <div class="relatorio-secao">
            <h3>💳 Vendas por Forma de Pagamento</h3>
            <div class="grafico-pagamentos" id="graficoPagamentos">
              <p class="texto-vazio">Nenhuma venda no período</p>
            </div>
          </div>
          
          <div class="relatorio-secao">
            <h3>🏆 Top 5 Produtos Mais Vendidos</h3>
            <div class="top-produtos" id="topProdutos">
              <p class="texto-vazio">Nenhuma venda no período</p>
            </div>
          </div>
        </div>
        
        <div class="tabela-container">
          <h3>📋 Histórico de Vendas</h3>
          <table class="tabela-produtos">
            <thead>
              <tr>
                <th>ID</th>
                <th>Data/Hora</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Pagamento</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="listaVendas"></tbody>
          </table>
        </div>
      </div>
      
      <!-- ABA DE ESTOQUE -->
      <div class="aba-conteudo" id="abaEstoque" style="display: none;">
        <div class="acoes-estoque">
          <button class="btn btn-primary" id="btnAtualizarEstoque">🔄 Atualizar</button>
          <button class="btn btn-success" id="btnExportarEstoque">📊 Exportar Excel</button>
          <button class="btn btn-secondary" id="btnBackup">💾 Backup Banco de Dados</button>
        </div>
        
        <div class="cards-estatisticas">
          <div class="card-stat">
            <div class="card-stat-icone">📦</div>
            <div class="card-stat-info">
              <p>Total de Produtos</p>
              <h3 id="statTotalProdutos">0</h3>
            </div>
          </div>
          
          <div class="card-stat card-stat-warning">
            <div class="card-stat-icone">⚠️</div>
            <div class="card-stat-info">
              <p>Estoque Baixo</p>
              <h3 id="statEstoqueBaixo">0</h3>
            </div>
          </div>
          
          <div class="card-stat card-stat-danger">
            <div class="card-stat-icone">🚨</div>
            <div class="card-stat-info">
              <p>Estoque Crítico</p>
              <h3 id="statEstoqueCritico">0</h3>
            </div>
          </div>
          
          <div class="card-stat card-stat-success">
            <div class="card-stat-icone">✅</div>
            <div class="card-stat-info">
              <p>Estoque OK</p>
              <h3 id="statEstoqueOk">0</h3>
            </div>
          </div>
        </div>
        
        <div class="alertas-estoque" id="alertasEstoque"></div>
        
        <div class="tabela-container">
          <h3>📦 Controle de Estoque</h3>
          <table class="tabela-produtos">
            <thead>
              <tr>
                <th>ID</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Estoque Atual</th>
                <th>Status</th>
                <th>Controle</th>
              </tr>
            </thead>
            <tbody id="tabelaEstoque"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.aba-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const aba = btn.getAttribute('data-aba');
      trocarAba(aba);
    });
  });

  document
    .getElementById('btnAtualizarRelatorio')
    .addEventListener('click', () => {
      carregarRelatorios();
    });

  document
    .getElementById('btnExportarCSV')
    .addEventListener('click', exportarRelatorioCSV);
  document
    .getElementById('btnExportarExcel')
    .addEventListener('click', exportarRelatorioExcel);
  document
    .getElementById('btnExportarPDF')
    .addEventListener('click', exportarRelatorioPDF);

  document
    .getElementById('btnAtualizarEstoque')
    .addEventListener('click', carregarRelatorioEstoque);
  document
    .getElementById('btnExportarEstoque')
    .addEventListener('click', exportarRelatorioEstoque);
  document
    .getElementById('btnBackup')
    .addEventListener('click', criarBackupManual);

  carregarRelatorios();
}

let vendasAtuais = [];
let estatisticasAtuais = {};

function carregarRelatorios() {
  const filtroPeriodo = document.getElementById('filtroPeriodo').value;
  const filtroPagamento = document.getElementById('filtroPagamento').value;

  db.buscarVendas((err, vendas) => {
    if (err) {
      console.error('❌ Erro ao carregar vendas:', err);
      return;
    }

    let vendasFiltradas = filtrarPorPeriodo(vendas, filtroPeriodo);

    if (filtroPagamento !== 'todos') {
      vendasFiltradas = vendasFiltradas.filter(
        (v) => v.forma_pagamento === filtroPagamento
      );
    }

    vendasAtuais = vendasFiltradas;
    estatisticasAtuais = {
      totalVendido: vendasFiltradas.reduce((acc, v) => acc + v.total, 0),
      totalVendas: vendasFiltradas.length,
      itensVendidos: vendasFiltradas.reduce(
        (acc, v) => acc + v.quantidade_itens,
        0
      ),
      ticketMedio:
        vendasFiltradas.length > 0
          ? vendasFiltradas.reduce((acc, v) => acc + v.total, 0) /
            vendasFiltradas.length
          : 0,
    };

    atualizarEstatisticas(vendasFiltradas);
    atualizarGraficoPagamentos(vendasFiltradas);
    atualizarTopProdutos(vendasFiltradas);
    atualizarTabelaVendas(vendasFiltradas);
  });
}

function filtrarPorPeriodo(vendas, periodo) {
  const agora = new Date();

  switch (periodo) {
    case 'hoje':
      const inicioHoje = new Date(
        agora.getFullYear(),
        agora.getMonth(),
        agora.getDate()
      );
      return vendas.filter((v) => new Date(v.data_hora) >= inicioHoje);

    case 'semana':
      const inicioSemana = new Date(agora);
      inicioSemana.setDate(agora.getDate() - agora.getDay());
      inicioSemana.setHours(0, 0, 0, 0);
      return vendas.filter((v) => new Date(v.data_hora) >= inicioSemana);

    case 'mes':
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
      return vendas.filter((v) => new Date(v.data_hora) >= inicioMes);

    default:
      return vendas;
  }
}

function atualizarEstatisticas(vendas) {
  const totalVendido = vendas.reduce((acc, v) => acc + v.total, 0);
  const totalVendas = vendas.length;
  const itensVendidos = vendas.reduce((acc, v) => acc + v.quantidade_itens, 0);
  const ticketMedio = totalVendas > 0 ? totalVendido / totalVendas : 0;

  document.getElementById('statTotalVendido').textContent =
    'R$ ' + totalVendido.toFixed(2);
  document.getElementById('statTotalVendas').textContent = totalVendas;
  document.getElementById('statItensVendidos').textContent = itensVendidos;
  document.getElementById('statTicketMedio').textContent =
    'R$ ' + ticketMedio.toFixed(2);
}

function atualizarGraficoPagamentos(vendas) {
  const container = document.getElementById('graficoPagamentos');

  if (vendas.length === 0) {
    container.innerHTML = '<p class="texto-vazio">Nenhuma venda no período</p>';
    return;
  }

  const pagamentos = {};
  vendas.forEach((v) => {
    const forma = v.forma_pagamento || 'Não informado';
    if (!pagamentos[forma]) {
      pagamentos[forma] = { total: 0, quantidade: 0 };
    }
    pagamentos[forma].total += v.total;
    pagamentos[forma].quantidade++;
  });

  const totalGeral = vendas.reduce((acc, v) => acc + v.total, 0);

  let html = '';
  Object.keys(pagamentos).forEach((forma) => {
    const dados = pagamentos[forma];
    const porcentagem = ((dados.total / totalGeral) * 100).toFixed(1);

    html += `
      <div class="barra-pagamento">
        <div class="barra-info">
          <span class="barra-label">${forma}</span>
          <span class="barra-valor">R$ ${dados.total.toFixed(
            2
          )} (${porcentagem}%)</span>
        </div>
        <div class="barra-container">
          <div class="barra-preenchimento" style="width: ${porcentagem}%"></div>
        </div>
        <span class="barra-quantidade">${dados.quantidade} vendas</span>
      </div>
    `;
  });

  container.innerHTML = html;
}

function atualizarTopProdutos(vendas) {
  const container = document.getElementById('topProdutos');

  if (vendas.length === 0) {
    container.innerHTML = '<p class="texto-vazio">Nenhuma venda no período</p>';
    return;
  }

  let todosProdutos = {};
  let vendasProcessadas = 0;

  vendas.forEach((venda) => {
    db.buscarDetalhesVenda(venda.id, (err, itens) => {
      if (!err && itens) {
        itens.forEach((item) => {
          if (!todosProdutos[item.produto_nome]) {
            todosProdutos[item.produto_nome] = {
              quantidade: 0,
              total: 0,
            };
          }
          todosProdutos[item.produto_nome].quantidade += item.quantidade;
          todosProdutos[item.produto_nome].total += item.subtotal;
        });
      }

      vendasProcessadas++;

      if (vendasProcessadas === vendas.length) {
        const ranking = Object.keys(todosProdutos)
          .map((nome) => ({
            nome: nome,
            quantidade: todosProdutos[nome].quantidade,
            total: todosProdutos[nome].total,
          }))
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 5);

        if (ranking.length === 0) {
          container.innerHTML =
            '<p class="texto-vazio">Nenhum produto vendido</p>';
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
  const tbody = document.getElementById('listaVendas');

  if (vendas.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center; padding: 40px;">Nenhuma venda no período</td></tr>';
    return;
  }

  tbody.innerHTML = vendas
    .map((venda) => {
      const data = new Date(venda.data_hora);
      const dataFormatada = data.toLocaleString('pt-BR');

      return `
      <tr>
        <td>#${venda.id}</td>
        <td>${dataFormatada}</td>
        <td>${venda.quantidade_itens} itens</td>
        <td>R$ ${venda.total.toFixed(2)}</td>
        <td>${venda.forma_pagamento || 'N/A'}</td>
        <td>
          <button class="btn-acao" onclick="verDetalhesVenda(${
            venda.id
          })" title="Ver detalhes">👁️</button>
        </td>
      </tr>
    `;
    })
    .join('');
}

function verDetalhesVenda(vendaId) {
  db.buscarDetalhesVenda(vendaId, (err, itens) => {
    if (err) {
      alert('Erro ao carregar detalhes da venda!');
      return;
    }

    let detalhes = `Detalhes da Venda #${vendaId}\n\n`;
    detalhes += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    itens.forEach((item) => {
      detalhes += `${item.produto_nome}\n`;
      detalhes += `  ${item.quantidade}x R$ ${item.preco_unitario.toFixed(
        2
      )} = R$ ${item.subtotal.toFixed(2)}\n\n`;
    });

    const total = itens.reduce((acc, item) => acc + item.subtotal, 0);
    detalhes += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    detalhes += `TOTAL: R$ ${total.toFixed(2)}`;

    alert(detalhes);
  });
}

async function testarImpressora() {
  console.log('🖨️  Testando impressora...');

  try {
    await require('electron').ipcRenderer.invoke('testar-impressora');
    alert(
      '✅ Teste realizado!\n\nSe o cupom foi impresso, sua impressora está funcionando corretamente!'
    );
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    alert(
      `Erro ao testar impressora!\n\n${error.message}\n\nVerifique:\n- Impressora está ligada?\n- Cabo USB conectado?`
    );
  }
}

// ============================================
// MODAL DE PAGAMENTO
// ============================================

function abrirModalPagamento(total) {
  limparModaisOrfaos();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modalPagamento';

  modal.innerHTML = `
    <div class="modal modal-pagamento">
      <button class="btn-fechar-modal" id="btnFecharPagamento">✕</button>
      <h2>💳 Finalizar Venda</h2>
      
      <div class="valor-total-modal">
        <p>Valor Total:</p>
        <h3>R$ ${total.toFixed(2)}</h3>
      </div>
      
      <div class="form-group">
        <label>Forma de Pagamento *</label>
        <select id="selectFormaPagamento" class="select-pagamento">
          <option value="Dinheiro">💵 Dinheiro</option>
          <option value="Cartão Débito">💳 Cartão Débito</option>
          <option value="Cartão Crédito">💳 Cartão Crédito</option>
          <option value="PIX">📱 PIX</option>
        </select>
      </div>
      
      <div class="form-group" id="grupoDinheiro">
        <label>Valor Recebido (R$)</label>
        <input type="text" id="inputValorRecebido" placeholder="0.00" inputmode="decimal">
        <div class="troco-info" id="trocoInfo" style="display: none;">
          <p>💰 Troco: R$ <span id="valorTroco">0.00</span></p>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="btnCancelarPagamento">Cancelar</button>
        <button type="button" class="btn btn-success" id="btnConfirmarPagamento">Confirmar Venda</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const selectFormaPagamento = document.getElementById('selectFormaPagamento');
  const grupoDinheiro = document.getElementById('grupoDinheiro');
  const inputValorRecebido = document.getElementById('inputValorRecebido');
  const trocoInfo = document.getElementById('trocoInfo');
  const valorTroco = document.getElementById('valorTroco');

  selectFormaPagamento.addEventListener('change', () => {
    if (selectFormaPagamento.value === 'Dinheiro') {
      grupoDinheiro.style.display = 'block';
      inputValorRecebido.focus();
    } else {
      grupoDinheiro.style.display = 'none';
      trocoInfo.style.display = 'none';
    }
  });

  inputValorRecebido.addEventListener('input', (e) => {
    let valor = e.target.value.replace(/[^\d,\.]/g, '');
    valor = valor.replace(',', '.');
    e.target.value = valor;

    const valorRecebido = parseFloat(valor) || 0;

    if (valorRecebido >= total) {
      const troco = valorRecebido - total;
      valorTroco.textContent = troco.toFixed(2);
      trocoInfo.style.display = 'block';
    } else {
      trocoInfo.style.display = 'none';
    }
  });

  inputValorRecebido.addEventListener('blur', (e) => {
    const valorRecebido = parseFloat(e.target.value.replace(',', '.')) || 0;
    if (valorRecebido > 0) {
      e.target.value = valorRecebido.toFixed(2);
    }
  });

  if (selectFormaPagamento.value === 'Dinheiro') {
    setTimeout(() => inputValorRecebido.focus(), 100);
  }

  document
    .getElementById('btnFecharPagamento')
    .addEventListener('click', () => {
      modal.remove();
      restaurarFoco();
    });

  document
    .getElementById('btnCancelarPagamento')
    .addEventListener('click', () => {
      modal.remove();
      restaurarFoco();
    });

  document
    .getElementById('btnConfirmarPagamento')
    .addEventListener('click', () => {
      const formaPagamento = selectFormaPagamento.value;

      if (formaPagamento === 'Dinheiro') {
        const valorRecebido =
          parseFloat(inputValorRecebido.value.replace(',', '.')) || 0;

        if (valorRecebido < total) {
          alert('O valor recebido é menor que o total da venda!');
          return;
        }

        const troco = valorRecebido - total;
        processarVenda(formaPagamento, troco);
      } else {
        processarVenda(formaPagamento, 0);
      }

      modal.remove();
      restaurarFoco();
    });
}

async function processarVenda(formaPagamento, troco) {
  const total = carrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0
  );

  db.registrarVenda(total, formaPagamento, carrinho, async (err, vendaId) => {
    if (err) {
      console.error('❌ Erro ao registrar venda:', err);
      alert('Erro ao salvar venda no banco de dados!');
      return;
    }

    console.log('✅ Venda registrada! ID:', vendaId);

    carrinho.forEach((item) => {
      db.diminuirEstoque(item.id, item.quantidade, (err) => {
        if (err) {
          console.error('⚠️  Erro ao diminuir estoque:', err);
        } else {
          console.log(
            `✅ Estoque atualizado: ${item.nome} -${item.quantidade}`
          );
        }
      });
    });

    db.buscarDetalhesVenda(vendaId, async (err, itensVenda) => {
      if (err) {
        console.error('❌ Erro ao buscar itens da venda:', err);
        alert(
          `Venda #${vendaId} salva, mas erro ao buscar itens para impressão!`
        );
        return;
      }

      const vendaParaImprimir = {
        id: vendaId,
        data_hora: new Date().toISOString(),
        total: total,
        forma_pagamento: formaPagamento,
      };

      try {
        await require('electron').ipcRenderer.invoke(
          'imprimir-cupom',
          vendaParaImprimir,
          itensVenda
        );

        let mensagem = `Venda #${vendaId} finalizada com sucesso! 🎉\n\n`;
        mensagem += `Total: R$ ${total.toFixed(2)}\n`;
        mensagem += `Pagamento: ${formaPagamento}\n`;

        if (formaPagamento === 'Dinheiro' && troco > 0) {
          mensagem += `\n💰 TROCO: R$ ${troco.toFixed(2)}`;
        }

        mensagem += `\n\nCupom impresso com sucesso!`;
        alert(mensagem);
      } catch (error) {
        console.error('❌ Erro ao imprimir:', error);
        alert(
          `Venda #${vendaId} finalizada! ✅\n\nAtenção: Não foi possível imprimir o cupom.\nVerifique se a impressora está conectada.\n\nErro: ${error.message}`
        );
      }

      carrinho = [];
      atualizarCarrinho();
      carregarProdutosDoBanco();
      restaurarFoco();
    });
  });
}

// ============================================
// SISTEMA DE ABAS
// ============================================

function trocarAba(nomeAba) {
  document.querySelectorAll('.aba-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-aba="${nomeAba}"]`).classList.add('active');

  document.getElementById('abaVendas').style.display =
    nomeAba === 'vendas' ? 'block' : 'none';
  document.getElementById('abaEstoque').style.display =
    nomeAba === 'estoque' ? 'block' : 'none';

  if (nomeAba === 'estoque') {
    carregarRelatorioEstoque();
  }
}

// ============================================
// RELATÓRIO DE ESTOQUE
// ============================================

function carregarRelatorioEstoque() {
  db.buscarProdutosComCategoria((err, produtos) => {
    if (err) {
      console.error('❌ Erro ao carregar produtos:', err);
      return;
    }

    const produtosComControle = produtos.filter((p) => p.controlar_estoque);

    const estoqueBaixo = produtosComControle.filter(
      (p) => p.estoque > 0 && p.estoque <= p.estoque_minimo
    ).length;
    const estoqueCritico = produtosComControle.filter(
      (p) => p.estoque === 0
    ).length;
    const estoqueOk = produtosComControle.filter(
      (p) => p.estoque > p.estoque_minimo
    ).length;

    document.getElementById('statTotalProdutos').textContent =
      produtosComControle.length;
    document.getElementById('statEstoqueBaixo').textContent = estoqueBaixo;
    document.getElementById('statEstoqueCritico').textContent = estoqueCritico;
    document.getElementById('statEstoqueOk').textContent = estoqueOk;

    exibirAlertasEstoque(produtosComControle);
    exibirTabelaEstoque(produtos);
  });
}

function exibirAlertasEstoque(produtos) {
  const container = document.getElementById('alertasEstoque');

  const criticos = produtos.filter((p) => p.estoque === 0);
  const baixos = produtos.filter(
    (p) => p.estoque > 0 && p.estoque <= p.estoque_minimo
  );

  let html = '';

  if (criticos.length > 0) {
    html += `
      <div class="alerta-estoque-critico">
        <strong>🚨 Produtos em falta (${criticos.length}):</strong><br>
        ${criticos.map((p) => p.nome).join(', ')}
      </div>
    `;
  }

  if (baixos.length > 0) {
    html += `
      <div class="alerta-estoque-baixo">
        <strong>⚠️ Produtos com estoque baixo (${baixos.length}):</strong><br>
        ${baixos
          .map((p) => `${p.nome} (${p.estoque}/${p.estoque_minimo})`)
          .join(', ')}
      </div>
    `;
  }

  if (html === '') {
    html =
      '<div class="alerta-estoque-ok">✅ Todos os produtos com estoque adequado!</div>';
  }

  container.innerHTML = html;
}

function exibirTabelaEstoque(produtos) {
  const tbody = document.getElementById('tabelaEstoque');

  if (produtos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center; padding: 40px;">Nenhum produto cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = produtos
    .map((produto) => {
      let statusBadge = '';
      let statusClasse = '';

      if (!produto.controlar_estoque) {
        statusBadge =
          '<span class="badge-estoque sem-controle">∞ Infinito</span>';
      } else if (produto.estoque === 0) {
        statusBadge = '<span class="badge-estoque critico">🚨 Crítico</span>';
        statusClasse = 'linha-critica';
      } else if (produto.estoque <= produto.estoque_minimo) {
        statusBadge = '<span class="badge-estoque baixo">⚠️ Baixo</span>';
        statusClasse = 'linha-aviso';
      } else {
        statusBadge = '<span class="badge-estoque ok">✅ OK</span>';
      }

      const categoria = produto.categoria_nome
        ? `<span class="badge-categoria" style="background-color: ${produto.categoria_cor}">${produto.categoria_nome}</span>`
        : '<span class="badge-categoria" style="background-color: #95a5a6">Sem categoria</span>';

      const estoqueDisplay = produto.controlar_estoque
        ? `<strong>${produto.estoque}</strong> / ${produto.estoque_minimo}`
        : '∞';

      return `
      <tr class="${statusClasse}">
        <td>${produto.id}</td>
        <td>${produto.nome}</td>
        <td>${categoria}</td>
        <td>${estoqueDisplay}</td>
        <td>${statusBadge}</td>
        <td>${produto.controlar_estoque ? '✅ Sim' : '❌ Não'}</td>
      </tr>
    `;
    })
    .join('');
}

function exportarRelatorioEstoque() {
  db.buscarProdutosComCategoria(async (err, produtos) => {
    if (err || produtos.length === 0) {
      alert('Nenhum produto para exportar!');
      return;
    }

    const ExcelJS = require('exceljs');
    const path = require('path');
    const os = require('os');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Estoque');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Produto', key: 'nome', width: 30 },
      { header: 'Categoria', key: 'categoria', width: 20 },
      { header: 'Estoque', key: 'estoque', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Controle', key: 'controle', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF667EEA' },
    };
    worksheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

    produtos.forEach((produto) => {
      let status = 'OK';
      if (!produto.controlar_estoque) {
        status = 'Sem controle';
      } else if (produto.estoque === 0) {
        status = 'Crítico';
      } else if (produto.estoque <= 10) {
        status = 'Baixo';
      }

      const row = worksheet.addRow({
        id: produto.id,
        nome: produto.nome,
        categoria: produto.categoria_nome || 'Sem categoria',
        estoque: produto.estoque,
        status: status,
        controle: produto.controlar_estoque ? 'Sim' : 'Não',
      });

      if (status === 'Crítico') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8D7DA' },
        };
      } else if (status === 'Baixo') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3CD' },
        };
      }
    });

    const nomeArquivo = `relatorio_estoque_${Date.now()}.xlsx`;
    const caminhoArquivo = path.join(os.homedir(), 'Downloads', nomeArquivo);

    await workbook.xlsx.writeFile(caminhoArquivo);
    alert(`✅ Relatório de estoque exportado!\n\nSalvo em: ${caminhoArquivo}`);
  });
}

function criarBackupManual() {
  if (confirm('Deseja criar um backup do banco de dados agora?')) {
    backup.criarBackup((err, caminho) => {
      if (err) {
        alert('❌ Erro ao criar backup!\n\n' + err.message);
        return;
      }
      alert(`✅ Backup criado com sucesso!\n\nSalvo em:\n${caminho}`);
    });
  }
}

function exportarRelatorioCSV() {
  if (vendasAtuais.length === 0) {
    alert('Nenhuma venda para exportar!');
    return;
  }

  exportador.exportarCSV(vendasAtuais, (err, caminho) => {
    if (err) {
      alert('Erro ao exportar CSV!');
      return;
    }
    alert(`✅ Relatório CSV exportado com sucesso!\n\nSalvo em: ${caminho}`);
  });
}

function exportarRelatorioExcel() {
  if (vendasAtuais.length === 0) {
    alert('Nenhuma venda para exportar!');
    return;
  }

  exportador.exportarExcel(vendasAtuais, (err, caminho) => {
    if (err) {
      alert('Erro ao exportar Excel!');
      return;
    }
    alert(`✅ Relatório Excel exportado com sucesso!\n\nSalvo em: ${caminho}`);
  });
}

function exportarRelatorioPDF() {
  if (vendasAtuais.length === 0) {
    alert('Nenhuma venda para exportar!');
    return;
  }

  exportador.exportarPDF(vendasAtuais, estatisticasAtuais, (err, caminho) => {
    if (err) {
      alert('Erro ao exportar PDF!');
      return;
    }
    alert(`✅ Relatório PDF exportado com sucesso!\n\nSalvo em: ${caminho}`);
  });
}

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modais = document.querySelectorAll('.modal-overlay');
    if (modais.length > 0) {
      modais[modais.length - 1].remove();
    }
  }
});
