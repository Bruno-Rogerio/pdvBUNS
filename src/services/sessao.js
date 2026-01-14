// Gerenciamento de sessão do usuário logado

let usuarioLogado = null;

function fazerLogin(usuario) {
  usuarioLogado = usuario;
  localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
  console.log('✅ Login realizado:', usuario.nome);
}

function fazerLogout() {
  usuarioLogado = null;
  localStorage.removeItem('usuarioLogado');
  console.log('✅ Logout realizado');
}

function obterUsuarioLogado() {
  if (!usuarioLogado) {
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    if (usuarioSalvo) {
      usuarioLogado = JSON.parse(usuarioSalvo);
    }
  }
  return usuarioLogado;
}

function verificarPermissao(tipoNecessario) {
  const usuario = obterUsuarioLogado();

  if (!usuario) {
    return false;
  }

  if (tipoNecessario === 'admin') {
    return usuario.tipo === 'admin';
  }

  return true; // Caixa pode acessar funções básicas
}

module.exports = {
  fazerLogin,
  fazerLogout,
  obterUsuarioLogado,
  verificarPermissao,
};
