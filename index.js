const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  name: 'sid',
  secret: 'troque-por-uma-chave-secreta',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 60 * 1000, 
    httpOnly: true
  }
}));

let teams = []; 
let players = []; 

//um unico usuario e senha
const AUTH_USER = { username: 'admin', password: 'password123' };

function requireLogin(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  res.redirect('/login');
}

function layout(title, bodyHtml, menuHtml='') {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<div class="container py-4">
  ${menuHtml}
  ${bodyHtml}
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
}

function renderMenu(req) {
  if (!(req.session && req.session.loggedIn)) return '';
  // mostrar data/hora do ultimo acesso 
  const lastAccess = req.cookies.lastAccess ? new Date(req.cookies.lastAccess) : null;
  const lastAccessStr = lastAccess ? lastAccess.toLocaleString('pt-BR') : 'Primeiro acesso';
  return `<nav class="navbar navbar-expand-lg navbar-light bg-light mb-4 rounded">
  <div class="container-fluid">
    <a class="navbar-brand">Campeonato LoL</a>
    <div class="collapse navbar-collapse">
      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        <li class="nav-item"><a class="nav-link" href="/menu">Menu</a></li>
        <li class="nav-item"><a class="nav-link" href="/teams/new">Cadastro de Equipe</a></li>
        <li class="nav-item"><a class="nav-link" href="/players/new">Cadastro de Jogador</a></li>
        <li class="nav-item"><a class="nav-link" href="/teams">Lista de Equipes</a></li>
        <li class="nav-item"><a class="nav-link" href="/players">Lista de Jogadores</a></li>
      </ul>
      <span class="navbar-text me-3">Último acesso: <strong>${lastAccessStr}</strong></span>
      <form method="POST" action="/logout"><button class="btn btn-outline-danger btn-sm">Logout</button></form>
    </div>
  </div>
</nav>`;
}

//login
app.get('/login', (req, res) => {
  if (req.session && req.session.loggedIn) return res.redirect('/menu');
  const html = `
  <h2>Login</h2>
  <form method="POST" action="/login" class="row g-3 needs-validation" novalidate>
    <div class="col-md-6">
      <label class="form-label">Usuário</label>
      <input name="username" class="form-control" required>
    </div>
    <div class="col-md-6">
      <label class="form-label">Senha</label>
      <input name="password" type="password" class="form-control" required>
    </div>
    <div class="col-12">
      <button class="btn btn-primary">Entrar</button>
    </div>
  </form>
  <p class="mt-3 text-muted">Usuário de teste: <strong>admin</strong> / Senha: <strong>password123</strong></p>
  `;
  res.send(layout('Login', html));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === AUTH_USER.username && password === AUTH_USER.password) {
    req.session.loggedIn = true;
    req.session.user = username;
    return res.redirect('/menu');
  }
  const html = `<div class="alert alert-danger">Usuário ou senha incorretos.</div>
    <a href="/login" class="btn btn-secondary">Voltar</a>`;
  res.status(401).send(layout('Login - erro', html));
});

app.post('/logout', (req, res) => {
  
  res.cookie('lastAccess', new Date().toISOString(), { maxAge: 365*24*60*60*1000 }); 
  req.session.destroy(err => {
    // redireciona para login
    res.redirect('/login');
  });
});

//apos login:
app.get('/menu', requireLogin, (req, res) => {
  const last = req.cookies.lastAccess ? new Date(req.cookies.lastAccess).toLocaleString('pt-BR') : 'Primeiro acesso';
  //cookies
  res.cookie('lastAccess', new Date().toISOString(), { maxAge: 365*24*60*60*1000, httpOnly: false });
  const body = `
    <h2>Menu</h2>
    <div class="card p-3">
      <p>Bem-vindo, <strong>${req.session.user}</strong>!</p>
      <p>Último acesso (via cookie): <strong>${last}</strong></p>
      <div class="mt-3">
        <a class="btn btn-primary me-2" href="/teams/new">Cadastro de Equipe</a>
        <a class="btn btn-primary me-2" href="/players/new">Cadastro de Jogador</a>
        <a class="btn btn-outline-secondary" href="/teams">Ver Equipes</a>
      </div>
    </div>
  `;
  res.send(layout('Menu', body, renderMenu(req)));
});

//cadastro de equipe
app.get('/teams/new', requireLogin, (req, res) => {
  const body = `
    <h2>Cadastro de Equipe</h2>
    <form method="POST" action="/teams" class="row g-3">
      <div class="col-md-6">
        <label class="form-label">Nome da equipe</label>
        <input name="name" class="form-control" required>
      </div>
      <div class="col-md-6">
        <label class="form-label">Nome do capitão</label>
        <input name="captain" class="form-control" required>
      </div>
      <div class="col-md-6">
        <label class="form-label">Telefone/WhatsApp</label>
        <input name="contact" class="form-control" required placeholder="(xx) 9xxxx-xxxx">
      </div>
      <div class="col-12">
        <button class="btn btn-success">Salvar Equipe</button>
        <a class="btn btn-secondary ms-2" href="/menu">Voltar ao menu</a>
      </div>
    </form>
  `;
  res.send(layout('Cadastro de Equipe', body, renderMenu(req)));
});

app.post('/teams', requireLogin, (req, res) => {
  const { name, captain, contact } = req.body;
  const errors = [];
  if (!name || !name.trim()) errors.push('Nome da equipe é obrigatório.');
  if (!captain || !captain.trim()) errors.push('Nome do capitão é obrigatório.');
  if (!contact || !contact.trim()) errors.push('Telefone/WhatsApp é obrigatório.');
  if (contact && !/^[0-9()\-\s+]+$/.test(contact)) errors.push('Telefone contém caracteres inválidos.');

  if (teams.find(t => t.name.toLowerCase() === (name || '').trim().toLowerCase())) {
    errors.push('Já existe uma equipe cadastrad a com esse nome.');
  }

  if (errors.length) {
    const html = `<div class="alert alert-danger"><ul>${errors.map(e=>`<li>${e}</li>`).join('')}</ul></div>
    <a href="/teams/new" class="btn btn-secondary">Voltar</a>`;
    return res.status(400).send(layout('Erro - Cadastro de Equipe', html, renderMenu(req)));
  }

  const newTeam = {
    id: (teams.length + 1).toString(),
    name: name.trim(),
    captain: captain.trim(),
    contact: contact.trim(),
    createdAt: new Date()
  };
  teams.push(newTeam);
  res.redirect('/teams');
});

//equipes
app.get('/teams', requireLogin, (req, res) => {
  const rows = teams.map(t => `
    <tr>
      <td>${t.id}</td>
      <td>${t.name}</td>
      <td>${t.captain}</td>
      <td>${t.contact}</td>
      <td>${t.createdAt.toLocaleString('pt-BR')}</td>
    </tr>
  `).join('');
  const body = `
    <h2>Equipes cadastradas</h2>
    <a class="btn btn-success mb-3" href="/teams/new">Cadastrar nova equipe</a>
    <a class="btn btn-secondary mb-3 ms-2" href="/menu">Voltar ao menu</a>
    <div class="table-responsive">
      <table class="table table-striped">
        <thead><tr><th>#</th><th>Nome</th><th>Capitão</th><th>Contato</th><th>Cadastrado em</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">Nenhuma equipe cadastrada.</td></tr>'}</tbody>
      </table>
    </div>
  `;
  res.send(layout('Equipes', body, renderMenu(req)));
});

//cadastrode jogador
app.get('/players/new', requireLogin, (req, res) => {
  const options = teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  const body = `
    <h2>Cadastro de Jogador</h2>
    <form method="POST" action="/players" class="row g-3">
      <div class="col-md-6">
        <label class="form-label">Nome do jogador</label>
        <input name="name" class="form-control" required>
      </div>
      <div class="col-md-6">
        <label class="form-label">Nickname (in-game)</label>
        <input name="nick" class="form-control" required>
      </div>
      <div class="col-md-4">
        <label class="form-label">Função</label>
        <select name="role" class="form-select" required>
          <option value="">Selecione...</option>
          <option>Top</option>
          <option>Jungle</option>
          <option>Mid</option>
          <option>Atirador</option>
          <option>Suporte</option>
        </select>
      </div>
      <div class="col-md-4">
        <label class="form-label">Elo</label>
        <select name="elo" class="form-select" required>
          <option value="">Selecione...</option>
          <option>Ferro</option><option>Bronze</option><option>Prata</option>
          <option>Ouro</option><option>Platina</option><option>Diamante</option>
          <option>Mestre</option><option>Grão-mestre</option><option>Desafiante</option>
        </select>
      </div>
      <div class="col-md-4">
        <label class="form-label">Gênero</label>
        <select name="gender" class="form-select" required>
          <option value="">Selecione...</option>
          <option>Masculino</option><option>Feminino</option><option>Outro</option>
        </select>
      </div>
      <div class="col-md-6">
        <label class="form-label">Equipe</label>
        <select name="teamId" class="form-select" required>
          <option value="">Selecione uma equipe...</option>
          ${options || '<option value="">(Nenhuma equipe disponível)</option>'}
        </select>
      </div>
      <div class="col-12">
        <button class="btn btn-success">Salvar Jogador</button>
        <a class="btn btn-secondary ms-2" href="/menu">Voltar ao menu</a>
      </div>
    </form>
    <div class="mt-3">
      <small class="text-muted">Observação: cada equipe pode ter no máximo 5 jogadores (formação padrão).</small>
    </div>
  `;
  res.send(layout('Cadastro de Jogador', body, renderMenu(req)));
});

app.post('/players', requireLogin, (req, res) => {
  const { name, nick, role, elo, gender, teamId } = req.body;
  const errors = [];
  if (!name || !name.trim()) errors.push('Nome do jogador é obrigatório.');
  if (!nick || !nick.trim()) errors.push('Nickname é obrigatório.');
  if (!role) errors.push('Função é obrigatória.');
  if (!elo) errors.push('Elo é obrigatório.');
  if (!gender) errors.push('Gênero é obrigatório.');
  if (!teamId) errors.push('Equipe deve ser selecionada.');

  const team = teams.find(t => t.id === teamId);
  if (!team) errors.push('Equipe selecionada inválida.');

// confere se tem 5
  const countPlayersInTeam = players.filter(p => p.teamId === teamId).length;
  if (team && countPlayersInTeam >= 5) errors.push('Equipe já possui 5 jogadores cadastrados.');

  //impede 2 nicks iguais
  if (players.find(p => p.teamId === teamId && p.nick.toLowerCase() === (nick || '').trim().toLowerCase())) {
    errors.push('Já existe um jogador com esse nickname nessa equipe.');
  }

  if (errors.length) {
    const html = `<div class="alert alert-danger"><ul>${errors.map(e=>`<li>${e}</li>`).join('')}</ul></div>
      <a href="/players/new" class="btn btn-secondary">Voltar</a>`;
    return res.status(400).send(layout('Erro - Cadastro de Jogador', html, renderMenu(req)));
  }

  const newPlayer = {
    id: (players.length + 1).toString(),
    name: name.trim(),
    nick: nick.trim(),
    role,
    elo,
    gender,
    teamId,
    createdAt: new Date()
  };
  players.push(newPlayer);
  res.redirect('/players');
});

//lista de jogadores
app.get('/players', requireLogin, (req, res) => {
  // agrupar por equipe
  const grouped = teams.map(t => {
    const teamPlayers = players.filter(p => p.teamId === t.id);
    return { team: t, players: teamPlayers };
  });
  //para mostrar equipes sem jogadores
  const bodyParts = grouped.map(g => {
    const rows = g.players.map(p => `
      <tr>
        <td>${p.id}</td><td>${p.name}</td><td>${p.nick}</td><td>${p.role}</td><td>${p.elo}</td><td>${p.gender}</td><td>${p.createdAt.toLocaleString('pt-BR')}</td>
      </tr>
    `).join('');
    return `
      <div class="card mb-3">
        <div class="card-header">
          <strong>${g.team.name}</strong> - Capitão: ${g.team.captain} (Contato: ${g.team.contact})
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table mb-0">
              <thead><tr><th>#</th><th>Nome</th><th>Nick</th><th>Função</th><th>Elo</th><th>Gênero</th><th>Cadastrado em</th></tr></thead>
              <tbody>
                ${rows || `<tr><td colspan="7">Nenhum jogador cadastrado nesta equipe.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const body = `
    <h2>Jogadores (agrupados por equipe)</h2>
    <a class="btn btn-success mb-3" href="/players/new">Cadastrar novo jogador</a>
    <a class="btn btn-secondary mb-3 ms-2" href="/menu">Voltar ao menu</a>
    ${bodyParts || '<p>Nenhuma equipe cadastrada ainda.</p>'}
  `;
  res.send(layout('Jogadores', body, renderMenu(req)));
});

app.get('/', (req, res) => {
  if (req.session && req.session.loggedIn) return res.redirect('/menu');
  res.redirect('/login');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
