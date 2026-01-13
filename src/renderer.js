const db = require('./database/db');

// Controle de navegação entre telas
const btnVendas = document.getElementById('btnVendas');
const btnProdutos = document.getElementById('btnProdutos');
const btnRelatorios = document.getElementById('btnRelatorios');
const mainContent = document.getElementById('mainContent');

// Dados temporários
let carrinho = [];
let produtos = [];

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

// Função: Ativar botão do menu
function ativarBotao(botaoAtivo) {
  [btnVendas, btnProdutos, btnRelatorios].forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  });
  botaoAtivo.classList.remove('btn-secondary');
  botaoAtivo.classList.add('btn-primary');
}

// Função: Carregar produtos do banco
function carregarProdutosDoBanco() {
  db.buscarProdutos((err, rows) => {
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
  
  // Eventos dos botões
  document.getElementById('btnLimpar').addEventListener('click', limparCarrinho);
  document.getElementById('btnFinalizar').addEventListener('click', finalizarVenda);
  document.getElementById('btnTesteImpressora').addEventListener('click', testarImpressora);
  
  // Evento de busca
  document.getElementById('inputBusca').addEventListener('input', (e) => {
    filtrarProdutos(e.target.value);
  });
}

// Função: Carregar produtos na tela
function carregarProdutos() {
  const listaProdutos = document.getElementById('listaProdutos');
  
  if (produtos.length === 0) {
    listaProdutos.innerHTML = '<p class="carrinho-vazio">Nenhum produto cadastrado</p>';
    return;
  }
  
  listaProdutos.innerHTML = produtos.map(produto => `
    <div class="produto-card" onclick="adicionarAoCarrinho(${produto.id})">
      <div class="produto-nome">${produto.nome}</div>
      <div class="produto-preco">R$ ${produto.preco.toFixed(2)}</div>
      <div class="produto-estoque">Estoque: ${produto.estoque}</div>
    </div>
  `).join('');
}

// Função: Filtrar produtos pela busca
function filtrarProdutos(termo) {
  const listaProdutos = document.getElementById('listaProdutos');
  const termoBusca = termo.toLowerCase().trim();
  
  // Se busca vazia, mostra todos
  if (!termoBusca) {
    carregarProdutos();
    return;
  }
  
  // Filtrar produtos que contenham o termo
  const produtosFiltrados = produtos.filter(produto => 
    produto.nome.toLowerCase().includes(termoBusca)
  );
  
  if (produtosFiltrados.length === 0) {
    listaProdutos.innerHTML = '<p class="carrinho-vazio">Nenhum produto encontrado</p>';
    return;
  }
  
  listaProdutos.innerHTML = produtosFiltrados.map(produto => `
    <div class="produto-card" onclick="adicionarAoCarrinho(${produto.id})">
      <div class="produto-nome">${produto.nome}</div>
      <div class="produto-preco">R$ ${produto.preco.toFixed(2)}</div>
      <div class="produto-estoque">Estoque: ${produto.estoque}</div>
    </div>
  `).join('');
}

// Função: Adicionar produto ao carrinho
function adicionarAoCarrinho(produtoId) {
  const produto = produtos.find(p => p.id === produtoId);
  
  if (!produto) {
    alert('Produto não encontrado!');
    return;
  }
  
  // Verifica se já existe no carrinho
  const itemExistente = carrinho.find(item => item.id === produtoId);
  
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
      quantidade: 1
    });
  }
  
  atualizarCarrinho();
}

// Função: Atualizar carrinho na tela
function atualizarCarrinho() {
  const carrinhoItens = document.getElementById('carrinhoItens');
  const totalVenda = document.getElementById('totalVenda');
  
  if (carrinho.length === 0) {
    carrinhoItens.innerHTML = '<p class="carrinho-vazio">Nenhum item adicionado</p>';
    totalVenda.textContent = '0.00';
    return;
  }
  
  carrinhoItens.innerHTML = carrinho.map(item => `
    <div class="carrinho-item">
      <div class="item-info">
        <span class="item-nome">${item.nome}</span>
        <span class="item-quantidade">x${item.quantidade}</span>
      </div>
      <div class="item-preco">R$ ${(item.preco * item.quantidade).toFixed(2)}</div>
      <button class="btn-remover" onclick="removerDoCarrinho(${item.id})">✕</button>
    </div>
  `).join('');
  
  const total = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
  totalVenda.textContent = total.toFixed(2);
}

// Função: Remover item do carrinho
function removerDoCarrinho(produtoId) {
  carrinho = carrinho.filter(item => item.id !== produtoId);
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
  
  const total = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
  
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
        <button class="btn btn-primary" id="btnNovoProduto">+ Novo Produto</button>
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
}

function carregarTabelaProdutos() {
  const tbody = document.getElementById('listaProdutosTabela');
  
  if (produtos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px;">Nenhum produto cadastrado</td></tr>';
    return;
  }
  
  tbody.innerHTML = produtos.map(produto => `
    <tr>
      <td>${produto.id}</td>
      <td>${produto.nome}</td>
      <td>R$ ${produto.preco.toFixed(2)}</td>
      <td>${produto.estoque}</td>
      <td>
        <button class="btn-acao btn-editar" onclick="editarProduto(${produto.id})">✏️ Editar</button>
        <button class="btn-acao btn-deletar" onclick="deletarProduto(${produto.id})">🗑️ Deletar</button>
      </td>
    </tr>
  `).join('');
}

// Abrir modal para adicionar/editar produto
function abrirModalProduto(produtoId = null) {
  const produto = produtoId ? produtos.find(p => p.id === produtoId) : null;
  const titulo = produto ? 'Editar Produto' : 'Novo Produto';
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modalProduto';
  
  modal.innerHTML = `
    <div class="modal">
      <button class="btn-fechar-modal" id="btnFecharProduto">✕</button>
      <h2>${titulo}</h2>
      <form id="formProduto">
        <div class="form-group">
          <label>Nome do Produto *</label>
          <input type="text" id="inputNome" value="${produto ? produto.nome : ''}" required>
        </div>
        
        <div class="form-group">
          <label>Preço (R$) *</label>
          <input type="number" id="inputPreco" step="0.01" min="0" value="${produto ? produto.preco : ''}" required>
        </div>
        
        <div class="form-group">
          <label>Estoque *</label>
          <input type="number" id="inputEstoque" min="0" value="${produto ? produto.estoque : ''}" required>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="btnCancelar">Cancelar</button>
          <button type="submit" class="btn btn-success">Salvar</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Focar no primeiro campo
  document.getElementById('inputNome').focus();
  
  // Eventos
  document.getElementById('btnFecharProduto').addEventListener('click', fecharModal);
  document.getElementById('btnCancelar').addEventListener('click', fecharModal);
  document.getElementById('formProduto').addEventListener('submit', (e) => {
    e.preventDefault();
    salvarProduto(produtoId);
  });
}

function fecharModal() {
  const modal = document.getElementById('modalProduto');
  if (modal) {
    modal.remove();
  }
}

function salvarProduto(produtoId) {
  const nome = document.getElementById('inputNome').value.trim();
  const preco = parseFloat(document.getElementById('inputPreco').value);
  const estoque = parseInt(document.getElementById('inputEstoque').value);
  
  if (!nome || isNaN(preco) || isNaN(estoque)) {
    alert('Por favor, preencha todos os campos corretamente!');
    return;
  }
  
  if (produtoId) {
    // Editar produto existente
    db.atualizarProduto(produtoId, nome, preco, estoque, (err) => {
      if (err) {
        console.error('❌ Erro ao atualizar produto:', err);
        alert('Erro ao atualizar produto!');
        return;
      }
      
      console.log('✅ Produto atualizado!');
      alert('Produto atualizado com sucesso!');
      fecharModal();
      carregarProdutosDoBanco();
      
      // Atualizar tabela
      setTimeout(() => {
        carregarTabelaProdutos();
      }, 300);
    });
  } else {
    // Adicionar novo produto
    db.inserirProduto(nome, preco, estoque, (err) => {
      if (err) {
        console.error('❌ Erro ao inserir produto:', err);
        alert('Erro ao cadastrar produto!');
        return;
      }
      
      console.log('✅ Produto cadastrado!');
      alert('Produto cadastrado com sucesso!');
      fecharModal();
      carregarProdutosDoBanco();
      
      // Atualizar tabela
      setTimeout(() => {
        carregarTabelaProdutos();
      }, 300);
    });
  }
}

function editarProduto(produtoId) {
  abrirModalProduto(produtoId);
}

function deletarProduto(produtoId) {
  const produto = produtos.find(p => p.id === produtoId);
  
  if (!produto) {
    alert('Produto não encontrado!');
    return;
  }
  
  if (confirm(`Deseja realmente deletar o produto:\n\n"${produto.nome}"?\n\nEsta ação não pode ser desfeita.`)) {
    db.deletarProduto(produtoId, (err) => {
      if (err) {
        console.error('❌ Erro ao deletar produto:', err);
        alert('Erro ao deletar produto!');
        return;
      }
      
      console.log('✅ Produto deletado!');
      alert('Produto deletado com sucesso!');
      carregarProdutosDoBanco();
      
      // Atualizar tabela
      setTimeout(() => {
        carregarTabelaProdutos();
      }, 300);
    });
  }
}

// ============================================
// TELA DE RELATÓRIOS
// ============================================
function mostrarTelaRelatorios() {
  mainContent.innerHTML = `
    <div class="tela-relatorios">
      <h2>📊 Relatórios de Vendas</h2>
      <div class="tabela-container">
        <table class="tabela-produtos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Data/Hora</th>
              <th>Itens</th>
              <th>Total</th>
              <th>Pagamento</th>
            </tr>
          </thead>
          <tbody id="listaVendas"></tbody>
        </table>
      </div>
    </div>
  `;
  
  carregarVendas();
}

function carregarVendas() {
  const tbody = document.getElementById('listaVendas');
  
  db.buscarVendas((err, vendas) => {
    if (err) {
      console.error('❌ Erro ao carregar vendas:', err);
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: red;">Erro ao carregar vendas</td></tr>';
      return;
    }
    
    if (vendas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px;">Nenhuma venda registrada</td></tr>';
      return;
    }
    
    tbody.innerHTML = vendas.map(venda => {
      const data = new Date(venda.data_hora);
      const dataFormatada = data.toLocaleString('pt-BR');
      
      return `
        <tr>
          <td>#${venda.id}</td>
          <td>${dataFormatada}</td>
          <td>${venda.quantidade_itens} itens</td>
          <td>R$ ${venda.total.toFixed(2)}</td>
          <td>${venda.forma_pagamento || 'N/A'}</td>
        </tr>
      `;
    }).join('');
  });
}

// Função: Testar impressora
async function testarImpressora() {
  console.log('🖨️  Testando impressora...');
  
  try {
    const resultado = await require('electron').ipcRenderer.invoke('testar-impressora');
    alert('✅ Teste realizado!\n\nSe o cupom foi impresso, sua impressora está funcionando corretamente!');
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    alert(`Erro ao testar impressora!\n\n${error.message}\n\nVerifique:\n- Impressora está ligada?\n- Cabo USB conectado?`);
  }
}

// ============================================
// MODAL DE PAGAMENTO
// ============================================

function abrirModalPagamento(total) {
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
  
  // Elementos
  const selectFormaPagamento = document.getElementById('selectFormaPagamento');
  const grupoDinheiro = document.getElementById('grupoDinheiro');
  const inputValorRecebido = document.getElementById('inputValorRecebido');
  const trocoInfo = document.getElementById('trocoInfo');
  const valorTroco = document.getElementById('valorTroco');
  
  // Mostrar/ocultar campo de dinheiro
  selectFormaPagamento.addEventListener('change', () => {
    if (selectFormaPagamento.value === 'Dinheiro') {
      grupoDinheiro.style.display = 'block';
      inputValorRecebido.focus();
    } else {
      grupoDinheiro.style.display = 'none';
      trocoInfo.style.display = 'none';
    }
  });
  
  // Calcular troco em tempo real
  inputValorRecebido.addEventListener('input', (e) => {
    // Permitir apenas números e vírgula/ponto
    let valor = e.target.value.replace(/[^\d,\.]/g, '');
    
    // Substituir vírgula por ponto
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
  
  // Formatar ao sair do campo (blur)
  inputValorRecebido.addEventListener('blur', (e) => {
    const valorRecebido = parseFloat(e.target.value.replace(',', '.')) || 0;
    if (valorRecebido > 0) {
      e.target.value = valorRecebido.toFixed(2);
    }
  });
  
  // Focar no campo de valor recebido se for dinheiro
  if (selectFormaPagamento.value === 'Dinheiro') {
    setTimeout(() => inputValorRecebido.focus(), 100);
  }
  
  // Evento do botão X
  document.getElementById('btnFecharPagamento').addEventListener('click', () => {
    modal.remove();
  });
  
  // Evento botão cancelar
  document.getElementById('btnCancelarPagamento').addEventListener('click', () => {
    modal.remove();
  });
  
  // Evento botão confirmar
  document.getElementById('btnConfirmarPagamento').addEventListener('click', () => {
    const formaPagamento = selectFormaPagamento.value;
    
    // Validar dinheiro recebido
    if (formaPagamento === 'Dinheiro') {
      const valorRecebido = parseFloat(inputValorRecebido.value.replace(',', '.')) || 0;
      
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
  });
}

async function processarVenda(formaPagamento, troco) {
  const total = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
  
  // Salvar venda no banco
  db.registrarVenda(total, formaPagamento, carrinho, async (err, vendaId) => {
    if (err) {
      console.error('❌ Erro ao registrar venda:', err);
      alert('Erro ao salvar venda no banco de dados!');
      return;
    }
    
    console.log('✅ Venda registrada! ID:', vendaId);
    
    // Buscar detalhes da venda para impressão
    db.buscarDetalhesVenda(vendaId, async (err, itensVenda) => {
      if (err) {
        console.error('❌ Erro ao buscar itens da venda:', err);
        alert(`Venda #${vendaId} salva, mas erro ao buscar itens para impressão!`);
        return;
      }
      
      // Preparar dados da venda
      const vendaParaImprimir = {
        id: vendaId,
        data_hora: new Date().toISOString(),
        total: total,
        forma_pagamento: formaPagamento
      };
      
      // Tentar imprimir via IPC
      try {
        await require('electron').ipcRenderer.invoke('imprimir-cupom', vendaParaImprimir, itensVenda);
        
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
        alert(`Venda #${vendaId} finalizada! ✅\n\nAtenção: Não foi possível imprimir o cupom.\nVerifique se a impressora está conectada.\n\nErro: ${error.message}`);
      }
      
      carrinho = [];
      atualizarCarrinho();
      carregarProdutosDoBanco();
    });
  });
}