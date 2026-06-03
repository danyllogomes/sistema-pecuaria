/* ── Supabase config ─────────────────────────────────────────────────────── */
const SUPABASE_URL = 'https://gzgiyhmvicyjdzwevvzp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Z2l5aG12aWN5amR6d2V2dnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDM4MDQsImV4cCI6MjA5NjAxOTgwNH0.6ovNUAZrELPWP7TxB-38zRiDk1jWHN0gyubbydJ4Oxg';
const sbH = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

/* ── State ───────────────────────────────────────────────────────────────── */
const TOTAL_STEPS = 8;
let currentStep = 1;
let editingClienteId = null;
let deletingClienteId = null;
let currentBNBCliente = null;
let currentProjetoId = null;
let projetosClienteId = null;
let cachedMinhaInfo = null;
const clientesMap = new Map();

/* ── Local storage key ───────────────────────────────────────────────────── */
function getLSKey() {
  return currentBNBCliente ? `bnb_draft_${currentBNBCliente.id}` : 'bnb_proposta_v1';
}

/* ══════════════════════════════════════════════════════════════════════════
   SUPABASE HELPERS
══════════════════════════════════════════════════════════════════════════ */
async function sbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbH });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function sbPost(path, body, prefer = 'return=representation') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST', headers: { ...sbH, 'Prefer': prefer }, body: JSON.stringify(body),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.message || 'Erro'); }
  return r.json();
}
async function sbPatch(path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH', headers: { ...sbH, 'Prefer': 'return=representation' }, body: JSON.stringify(body),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.message || 'Erro'); }
  return r.json();
}
async function sbDelete(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method: 'DELETE', headers: sbH });
  if (!r.ok) throw new Error('Erro ao excluir');
}

/* ── Clientes ─────────────────────────────────────────────────────────────── */
async function fetchClientes()         { return sbGet('clientes?order=nome.asc&select=*'); }
async function createCliente(d)        { return (await sbPost('clientes', d))[0]; }
async function updateCliente(id, d)    { return (await sbPatch(`clientes?id=eq.${id}`, d))[0]; }
async function deleteCliente(id)       { return sbDelete(`clientes?id=eq.${id}`); }

/* ── Minha Info ───────────────────────────────────────────────────────────── */
async function fetchMinhaInfo() {
  const rows = await sbGet('minha_info?id=eq.1&select=*');
  return rows[0] || null;
}
async function saveMinhaInfoDB(data) {
  const rows = await sbPost('minha_info', { id: 1, ...data }, 'resolution=merge-duplicates,return=representation');
  return rows[0];
}

/* ── Projetos ─────────────────────────────────────────────────────────────── */
async function fetchProjetos(clienteId) {
  return sbGet(`projetos?cliente_id=eq.${clienteId}&order=atualizado_em.desc&select=*`);
}
async function createProjeto(clienteId, nome, dados) {
  return (await sbPost('projetos', { cliente_id: clienteId, nome, dados }))[0];
}
async function updateProjetoDados(id, dados) {
  return sbPatch(`projetos?id=eq.${id}`, { dados });
}

/* ══════════════════════════════════════════════════════════════════════════
   VIEW MANAGEMENT
══════════════════════════════════════════════════════════════════════════ */
function setView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`)?.classList.add('active');
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  document.getElementById(`nav-${view}`)?.classList.add('active');
  if (view === 'minha-info') fillMinhaInfoForm();
}

/* ══════════════════════════════════════════════════════════════════════════
   CLIENTES — LIST
══════════════════════════════════════════════════════════════════════════ */
async function loadClientes() {
  const loading   = document.getElementById('clientes-loading');
  const empty     = document.getElementById('clientes-empty');
  const tableWrap = document.getElementById('clientes-table-wrap');

  loading.style.display   = 'flex';
  empty.style.display     = 'none';
  tableWrap.style.display = 'none';

  try {
    const clientes = await fetchClientes();
    clientesMap.clear();
    clientes.forEach(c => clientesMap.set(c.id, c));
    loading.style.display = 'none';

    if (!clientes.length) { empty.style.display = 'flex'; return; }

    tableWrap.style.display = 'block';
    document.getElementById('clientes-tbody').innerHTML = clientes.map(c => `
      <tr>
        <td><strong>${escHtml(c.nome)}</strong></td>
        <td style="color:var(--gray-600)">${escHtml(c.cpf_cnpj)}</td>
        <td>${escHtml(c.municipio_uf || '—')}</td>
        <td>${escHtml(c.telefone || '—')}</td>
        <td>
          <div class="actions">
            <button class="btn btn-bnb btn-icon"       onclick="openProjetoBNB('${c.id}')">📋 Projeto BNB</button>
            <button class="btn btn-secondary btn-icon" onclick="editarCliente('${c.id}')">✏️ Editar</button>
            <button class="btn btn-danger btn-icon"    onclick="abrirConfirmExclusao('${c.id}')">🗑️ Excluir</button>
          </div>
        </td>
      </tr>`).join('');
  } catch (err) {
    loading.style.display = 'none';
    empty.style.display = 'flex';
    showToast('Erro ao carregar clientes: ' + err.message, true);
  }
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════════════════════════════════════════════════
   MODAL: CRIAR / EDITAR CLIENTE
══════════════════════════════════════════════════════════════════════════ */
function openModalCliente(clienteId = null) {
  editingClienteId = clienteId;
  const c = clienteId ? clientesMap.get(clienteId) : null;
  document.getElementById('modal-cliente-title').textContent = c ? 'Editar Cliente' : 'Novo Cliente';
  const vals = {
    mc_nome: c?.nome || '', mc_cpf_cnpj: c?.cpf_cnpj || '',
    mc_telefone: c?.telefone || '', mc_municipio_uf: c?.municipio_uf || '',
    mc_endereco: c?.endereco || '', mc_numero: c?.numero || '',
    mc_bairro: c?.bairro || '', mc_complemento: c?.complemento || '',
  };
  Object.entries(vals).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) { el.value = val; el.classList.remove('error'); }
  });
  document.querySelectorAll('[data-mc-req]').forEach(el => {
    document.getElementById(el.id + '_err')?.classList.remove('show');
  });
  document.getElementById('modal-cliente').classList.add('open');
}
function closeModalCliente() {
  document.getElementById('modal-cliente').classList.remove('open');
  editingClienteId = null;
}
function editarCliente(id) { openModalCliente(id); }

async function salvarCliente() {
  let ok = true;
  document.querySelectorAll('[data-mc-req]').forEach(el => {
    const errEl = document.getElementById(el.id + '_err');
    if (!el.value.trim()) {
      el.classList.add('error');
      if (errEl) { errEl.textContent = 'Campo obrigatório'; errEl.classList.add('show'); }
      ok = false;
    } else {
      el.classList.remove('error');
      errEl?.classList.remove('show');
    }
  });
  if (!ok) { showToast('Preencha os campos obrigatórios.', true); return; }

  const btn = document.getElementById('btn-salvar-cliente');
  btn.disabled = true; btn.textContent = 'Salvando…';
  const data = {
    nome:         document.getElementById('mc_nome').value.trim(),
    cpf_cnpj:     document.getElementById('mc_cpf_cnpj').value.trim(),
    telefone:     document.getElementById('mc_telefone').value.trim() || null,
    municipio_uf: document.getElementById('mc_municipio_uf').value.trim() || null,
    endereco:     document.getElementById('mc_endereco').value.trim() || null,
    numero:       document.getElementById('mc_numero').value.trim() || null,
    bairro:       document.getElementById('mc_bairro').value.trim() || null,
    complemento:  document.getElementById('mc_complemento').value.trim() || null,
  };
  try {
    editingClienteId ? await updateCliente(editingClienteId, data) : await createCliente(data);
    showToast(editingClienteId ? 'Cliente atualizado!' : 'Cliente criado!');
    closeModalCliente();
    await loadClientes();
  } catch (err) {
    showToast('Erro: ' + err.message, true);
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar';
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   MODAL: CONFIRMAR EXCLUSÃO
══════════════════════════════════════════════════════════════════════════ */
function abrirConfirmExclusao(id) {
  deletingClienteId = id;
  document.getElementById('confirm-nome').textContent = clientesMap.get(id)?.nome || '';
  document.getElementById('modal-confirm').classList.add('open');
}
function closeModalConfirm() {
  document.getElementById('modal-confirm').classList.remove('open');
  deletingClienteId = null;
}
async function confirmarExclusao() {
  if (!deletingClienteId) return;
  const btn = document.getElementById('btn-confirmar-excluir');
  btn.disabled = true; btn.textContent = 'Excluindo…';
  try {
    await deleteCliente(deletingClienteId);
    showToast('Cliente excluído.');
    closeModalConfirm();
    await loadClientes();
  } catch (err) {
    showToast('Erro: ' + err.message, true);
  } finally {
    btn.disabled = false; btn.textContent = 'Excluir';
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   MODAL: PROJETOS BNB (histórico)
══════════════════════════════════════════════════════════════════════════ */
function openProjetoBNB(clienteId) {
  openModalProjetos(clienteId);
}

async function openModalProjetos(clienteId) {
  const cliente = clientesMap.get(clienteId);
  if (!cliente) return;
  projetosClienteId = clienteId;
  document.getElementById('projetos-modal-cliente-nome').textContent = cliente.nome;

  const body = document.getElementById('projetos-list-body');
  body.innerHTML = '<div class="empty-state" style="padding:40px"><p style="color:var(--gray-400)">Carregando…</p></div>';
  document.getElementById('modal-projetos').classList.add('open');

  try {
    const projetos = await fetchProjetos(clienteId);
    renderProjetos(projetos);
  } catch (e) {
    body.innerHTML = '<div class="empty-state" style="padding:40px"><p style="color:var(--red)">Erro ao carregar.</p></div>';
  }
}

function renderProjetos(projetos) {
  const body = document.getElementById('projetos-list-body');
  if (!projetos.length) {
    body.innerHTML = `
      <div class="empty-state" style="padding:48px">
        <div style="font-size:40px;margin-bottom:12px">📋</div>
        <p style="font-weight:600;margin-bottom:4px">Nenhum projeto ainda</p>
        <p style="font-size:12px;color:var(--gray-400)">Clique em "+ Novo Projeto" para começar.</p>
      </div>`;
    return;
  }
  body.innerHTML = projetos.map(p => `
    <div class="projeto-item" onclick="abrirProjetoExistente('${p.id}')">
      <div class="projeto-item-left">
        <div class="projeto-nome">${escHtml(p.nome)}</div>
        <div class="projeto-meta">Atualizado em ${formatDate(p.atualizado_em)}</div>
      </div>
      <div class="projeto-arrow">›</div>
    </div>`).join('');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function closeModalProjetos() {
  document.getElementById('modal-projetos').classList.remove('open');
  projetosClienteId = null;
}

function novoProjetoBNB() {
  const clienteId = projetosClienteId;
  closeModalProjetos();
  openWizardNovoProjeto(clienteId);
}

async function abrirProjetoExistente(projetoId) {
  const clienteId = projetosClienteId;
  closeModalProjetos();
  const cliente = clientesMap.get(clienteId);
  if (!cliente) return;

  try {
    const rows = await sbGet(`projetos?id=eq.${projetoId}&select=*`);
    const projeto = rows[0];
    if (!projeto) throw new Error('Projeto não encontrado');

    currentBNBCliente = cliente;
    currentProjetoId  = projetoId;
    document.getElementById('bnb-modal-cliente-nome').textContent = cliente.nome;

    clearWizardForm();
    if (projeto.dados) loadFormData(projeto.dados);

    goToStep(projeto.dados?._step || 1);
    document.getElementById('modal-bnb').classList.add('open');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    showToast('Erro ao abrir projeto: ' + err.message, true);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   VIEW: MINHAS INFORMAÇÕES
══════════════════════════════════════════════════════════════════════════ */
async function loadMinhaInfo() {
  try {
    cachedMinhaInfo = await fetchMinhaInfo();
    fillMinhaInfoForm();
  } catch (e) {}
}

function fillMinhaInfoForm() {
  if (!cachedMinhaInfo) return;
  const mi = cachedMinhaInfo;
  if (mi.cliente_elaborador) {
    const el = document.querySelector(`input[name="mi_cliente_elaborador"][value="${mi.cliente_elaborador}"]`);
    if (el) el.checked = true;
  }
  const fill = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  fill('mi_empresa', mi.empresa);
  fill('mi_cpf_cnpj', mi.cpf_cnpj);
  fill('mi_tecnico_responsavel', mi.tecnico_responsavel);
  fill('mi_cpf_tecnico', mi.cpf_tecnico);
  fill('mi_crea', mi.crea);
  fill('mi_telefone', mi.telefone);
}

async function salvarMinhaInfo() {
  const btn = document.getElementById('btn-salvar-minha-info');
  btn.disabled = true; btn.textContent = 'Salvando…';
  const data = {
    cliente_elaborador:  getRadio('mi_cliente_elaborador') || 'Não',
    empresa:             document.getElementById('mi_empresa').value.trim() || null,
    cpf_cnpj:            document.getElementById('mi_cpf_cnpj').value.trim() || null,
    tecnico_responsavel: document.getElementById('mi_tecnico_responsavel').value.trim() || null,
    cpf_tecnico:         document.getElementById('mi_cpf_tecnico').value.trim() || null,
    crea:                document.getElementById('mi_crea').value.trim() || null,
    telefone:            document.getElementById('mi_telefone').value.trim() || null,
  };
  try {
    cachedMinhaInfo = await saveMinhaInfoDB(data);
    showToast('Informações salvas!');
  } catch (err) {
    showToast('Erro: ' + err.message, true);
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar';
  }
}

function autoFillElaborador() {
  if (!cachedMinhaInfo) return;
  const mi = cachedMinhaInfo;
  if (mi.cliente_elaborador) {
    const el = document.querySelector(`input[name="cliente_elaborador"][value="${mi.cliente_elaborador}"]`);
    if (el) el.checked = true;
  }
  const fill = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  fill('empresa_elaborador',  mi.empresa);
  fill('cpf_cnpj_elaborador', mi.cpf_cnpj);
  fill('tecnico_responsavel', mi.tecnico_responsavel);
  fill('cpf_tecnico',         mi.cpf_tecnico);
  fill('crea',                mi.crea);
  fill('telefone_elaborador', mi.telefone);
}

/* ══════════════════════════════════════════════════════════════════════════
   WIZARD BNB — abrir / fechar
══════════════════════════════════════════════════════════════════════════ */
function openWizardNovoProjeto(clienteId) {
  const cliente = clientesMap.get(clienteId);
  if (!cliente) return;

  currentBNBCliente = cliente;
  currentProjetoId  = null;
  document.getElementById('bnb-modal-cliente-nome').textContent = cliente.nome;

  clearWizardForm();

  // Tenta restaurar rascunho do localStorage
  loadLocal();

  // Pre-fill Passo 1 com dados do cliente (sobrescreve rascunho)
  const fill = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  fill('nome_cliente',     cliente.nome);
  fill('cpf_cnpj_cliente', cliente.cpf_cnpj);
  fill('telefone_cliente', cliente.telefone || '');
  fill('municipio_uf',     cliente.municipio_uf || '');
  fill('endereco',         cliente.endereco || '');
  fill('numero',           cliente.numero || '');
  fill('bairro',           cliente.bairro || '');
  fill('complemento',      cliente.complemento || '');

  // Pre-fill Passo 2 com Minhas Informações
  autoFillElaborador();

  goToStep(1);
  document.getElementById('modal-bnb').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModalBNB() {
  if (!currentProjetoId) saveLocal(); // só salva rascunho em projetos novos
  document.getElementById('modal-bnb').classList.remove('open');
  document.body.style.overflow = '';
  currentBNBCliente = null;
  currentProjetoId  = null;
}

function clearWizardForm() {
  document.querySelectorAll('#modal-bnb input, #modal-bnb select, #modal-bnb textarea').forEach(el => {
    if (el.type === 'radio' || el.type === 'checkbox') el.checked = false;
    else el.value = '';
    el.classList.remove('error');
  });
  document.querySelectorAll('#modal-bnb .error-msg').forEach(el => el.classList.remove('show'));
}

/* ── Salvar projeto no banco ─────────────────────────────────────────────── */
async function salvarProjeto(dados) {
  if (!currentBNBCliente) return;
  try {
    if (currentProjetoId) {
      await updateProjetoDados(currentProjetoId, dados);
    } else {
      const existing = await fetchProjetos(currentBNBCliente.id);
      const nome = `Proposta #${existing.length + 1}`;
      const proj = await createProjeto(currentBNBCliente.id, nome, dados);
      currentProjetoId = proj.id;
      localStorage.removeItem(getLSKey()); // remove rascunho após salvar
    }
  } catch (e) {
    console.error('Erro ao salvar projeto:', e);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP MANAGEMENT
══════════════════════════════════════════════════════════════════════════ */
function goToStep(n) {
  if (n < 1 || n > TOTAL_STEPS) return;
  document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
  document.getElementById(`step-${n}`)?.classList.add('active');
  currentStep = n;
  updateStepNav();
  document.querySelector('.modal-bnb-body')?.scrollTo({ top: 0, behavior: 'smooth' });
  if (!currentProjetoId) saveLocal();
}

function updateStepNav() {
  document.querySelectorAll('.step-pill').forEach((pill, i) => {
    const num = i + 1;
    pill.classList.remove('active', 'done');
    if (num === currentStep) pill.classList.add('active');
    else if (num < currentStep) pill.classList.add('done');
  });
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnGen  = document.getElementById('btn-generate');
  if (btnPrev) btnPrev.disabled = currentStep === 1;
  if (currentStep === TOTAL_STEPS) {
    btnNext?.style.setProperty('display', 'none');
    btnGen?.style.setProperty('display', 'inline-flex');
  } else {
    btnNext?.style.setProperty('display', 'inline-flex');
    btnGen?.style.setProperty('display', 'none');
  }
  const ind = document.getElementById('step-indicator');
  if (ind) ind.textContent = `Passo ${currentStep} de ${TOTAL_STEPS}`;
}

function nextStep() {
  if (!validateStep(currentStep)) return;
  goToStep(currentStep + 1);
  if (currentStep === TOTAL_STEPS) buildReview();
}
function prevStep() { goToStep(currentStep - 1); }

/* ── Validation ──────────────────────────────────────────────────────────── */
function validateStep(step) {
  let ok = true;
  document.getElementById(`step-${step}`)?.querySelectorAll('[data-required]').forEach(el => {
    const errEl = document.getElementById(el.id + '_err');
    if (!el.value.trim()) {
      el.classList.add('error');
      if (errEl) { errEl.textContent = 'Campo obrigatório'; errEl.classList.add('show'); }
      ok = false;
    } else {
      el.classList.remove('error');
      errEl?.classList.remove('show');
    }
  });
  if (!ok) showToast('Preencha os campos obrigatórios antes de continuar.');
  return ok;
}

/* ── Cronograma totals ────────────────────────────────────────────────────── */
function updateCronogramaTotals() {
  const items = ['milho','torta','soja','vacinas','racao_conc','sal_mineral',
                 'livre_1','livre_2','livre_3','livre_4','livre_5','mao_obra','assessoria'];
  ['p1','p2','p3','p4'].forEach(p => {
    let tot = 0;
    items.forEach(k => { const el = document.getElementById(`cron_${k}_${p}`); if (el) tot += parseFloat(el.value || 0); });
    const el = document.getElementById(`cron_total_${p}`);
    if (el) { el.textContent = tot.toFixed(1) + '%'; el.className = 'pct-total ' + (Math.abs(tot - 100) < 0.1 ? 'ok' : tot > 0 ? 'warn' : ''); }
  });
}

/* ── Review ───────────────────────────────────────────────────────────────── */
function buildReview() {
  const d = collectFormData();
  const rev = document.getElementById('review-content');
  if (!rev) return;
  const secs = [
    { title: 'Dados do Cliente', keys: [['nome_cliente','Cliente'],['cpf_cnpj_cliente','CPF/CNPJ'],['telefone_cliente','Telefone'],['municipio_uf','Município-UF'],['endereco','Endereço'],['numero','Nº'],['complemento','Complemento'],['bairro','Bairro']] },
    { title: 'Elaborador', keys: [['empresa_elaborador','Empresa'],['cpf_cnpj_elaborador','CPF/CNPJ'],['tecnico_responsavel','Técnico'],['crea','CREA'],['data_elaboracao','Data']] },
    { title: 'Proposta', keys: [['agencia','Agência'],['grupo','Grupo'],['programa_credito','Programa'],['finalidade_credito','Finalidade'],['atividade_principal','Atividade'],['categ_produtor','Categoria'],['benef_politica_pub','Benef. Pol. Públicas']] },
    { title: 'Contrato', keys: [['prazo_meses','Prazo (meses)'],['carencia_meses','Carência (meses)'],['encargos_ao_ano','Encargos (% a.a.)'],['periodicidade_reembolso','Periodicidade']] },
  ];
  rev.innerHTML = secs.map(s => `
    <div class="review-section"><h4>${s.title}</h4><div class="review-grid">
      ${s.keys.map(([k,l]) => `<div class="review-item"><div class="key">${l}</div><div class="val">${d[k]||'—'}</div></div>`).join('')}
    </div></div>`).join('');
}

/* ── Data collection ─────────────────────────────────────────────────────── */
function collectFormData() {
  const g = id => (document.getElementById(id) || {}).value || '';
  const cks = ['milho','torta','soja','vacinas','racao_conc','sal_mineral','livre_1','livre_2','livre_3','livre_4','livre_5','mao_obra','assessoria'];
  const cronograma = {};
  cks.forEach(k => { cronograma[k] = { p1: g(`cron_${k}_p1`), p2: g(`cron_${k}_p2`), p3: g(`cron_${k}_p3`), p4: g(`cron_${k}_p4`) }; });
  const free_items = [];
  for (let i = 1; i <= 5; i++) {
    const disc = g(`livre_discrim_${i}`);
    if (disc) free_items.push({ discriminacao: disc, area: g(`livre_area_${i}`), insumo: g(`livre_insumo_${i}`), quantidade: g(`livre_qtd_${i}`), unidade: g(`livre_unid_${i}`), uso: g(`livre_uso_${i}`), preco: g(`livre_preco_${i}`), rec_prop: g(`livre_rec_${i}`) });
  }
  return {
    nome_cliente: g('nome_cliente'), cpf_cnpj_cliente: g('cpf_cnpj_cliente'), telefone_cliente: g('telefone_cliente'), municipio_uf: g('municipio_uf'),
    endereco: g('endereco'), numero: g('numero'), complemento: g('complemento'), bairro: g('bairro'),
    cliente_elaborador: g('cliente_elaborador'), empresa_elaborador: g('empresa_elaborador'), cpf_cnpj_elaborador: g('cpf_cnpj_elaborador'),
    tecnico_responsavel: g('tecnico_responsavel'), cpf_tecnico: g('cpf_tecnico'), crea: g('crea'), telefone_elaborador: g('telefone_elaborador'), data_elaboracao: g('data_elaboracao'),
    categ_produtor: g('categ_produtor'), agencia: g('agencia'), municipio_decreto: getRadio('municipio_decreto'), grupo: g('grupo'),
    base_agroecologica: getRadio('base_agroecologica'), programa_credito: g('programa_credito'), planos_territoriais: getRadio('planos_territoriais'),
    finalidade_credito: g('finalidade_credito'), custeio_rotativo: getRadio('custeio_rotativo'), atividade_principal: g('atividade_principal'),
    benef_politica_pub: g('benef_politica_pub'), valor_emergencial: g('valor_emergencial'),
    reprod_bovinos: g('reprod_bovinos'), matrizes_bovinos: g('matrizes_bovinos'), novilhos: g('novilhos'), novilhas_engorda: g('novilhas_engorda'),
    garrotes: g('garrotes'), garrotas: g('garrotas'), bezerros: g('bezerros'), reprod_ovinos: g('reprod_ovinos'), matrizes_ovinos: g('matrizes_ovinos'),
    femeas_1_2_anos: g('femeas_1_2_anos'), machos_1_2_anos: g('machos_1_2_anos'), femeas_0_1_anos: g('femeas_0_1_anos'), machos_0_1_anos: g('machos_0_1_anos'),
    necessidade_racao_meses: g('necessidade_racao_meses'),
    preco_milho: g('preco_milho'), rec_prop_milho: g('rec_prop_milho'), preco_torta: g('preco_torta'), rec_prop_torta: g('rec_prop_torta'),
    preco_soja: g('preco_soja'), rec_prop_soja: g('rec_prop_soja'), preco_vacinas: g('preco_vacinas'), rec_prop_vacinas: g('rec_prop_vacinas'),
    preco_racao_conc: g('preco_racao_conc'), rec_prop_racao_conc: g('rec_prop_racao_conc'), preco_sal_mineral: g('preco_sal_mineral'), rec_prop_sal_mineral: g('rec_prop_sal_mineral'),
    free_items, preco_mao_obra: g('preco_mao_obra'), rec_prop_mao_obra: g('rec_prop_mao_obra'), assessoria_pct: g('assessoria_pct'),
    data_parcela_1: g('data_parcela_1'), data_parcela_2: g('data_parcela_2'), data_parcela_3: g('data_parcela_3'), data_parcela_4: g('data_parcela_4'),
    cronograma,
    receitas_bov: [1,2,3,4,5].map(n => g(`rec_bov_${n}`)), receitas_ovi: [1,2,3,4,5].map(n => g(`rec_ovi_${n}`)),
    prazo_meses: g('prazo_meses'), carencia_meses: g('carencia_meses'), encargos_ao_ano: g('encargos_ao_ano'), periodicidade_reembolso: g('periodicidade_reembolso'),
    periodo_lactacao: g('periodo_lactacao'), producao_leite: g('producao_leite'), comentarios: g('comentarios'),
    _step: currentStep,
  };
}

function getRadio(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || '';
}

/* ── Form data loader (reusável) ─────────────────────────────────────────── */
function loadFormData(d) {
  if (!d) return;
  const sv = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  [
    'nome_cliente','cpf_cnpj_cliente','telefone_cliente','municipio_uf','endereco','numero','complemento','bairro',
    'empresa_elaborador','cpf_cnpj_elaborador','tecnico_responsavel','cpf_tecnico','crea','telefone_elaborador','data_elaboracao',
    'categ_produtor','agencia','grupo','programa_credito','finalidade_credito','atividade_principal','benef_politica_pub','valor_emergencial',
    'reprod_bovinos','matrizes_bovinos','novilhos','novilhas_engorda','garrotes','garrotas','bezerros',
    'reprod_ovinos','matrizes_ovinos','femeas_1_2_anos','machos_1_2_anos','femeas_0_1_anos','machos_0_1_anos','necessidade_racao_meses',
    'preco_milho','rec_prop_milho','preco_torta','rec_prop_torta','preco_soja','rec_prop_soja','preco_vacinas','rec_prop_vacinas',
    'preco_racao_conc','rec_prop_racao_conc','preco_sal_mineral','rec_prop_sal_mineral',
    'preco_mao_obra','rec_prop_mao_obra','assessoria_pct',
    'data_parcela_1','data_parcela_2','data_parcela_3','data_parcela_4',
    'prazo_meses','carencia_meses','encargos_ao_ano','periodicidade_reembolso','periodo_lactacao','producao_leite','comentarios',
  ].forEach(k => sv(k, d[k]));

  ['cliente_elaborador','municipio_decreto','base_agroecologica','planos_territoriais','custeio_rotativo'].forEach(name => {
    if (d[name]) { const el = document.querySelector(`input[name="${name}"][value="${d[name]}"]`); if (el) el.checked = true; }
  });

  if (d.free_items) d.free_items.forEach((item, i) => {
    const idx = i + 1;
    sv(`livre_discrim_${idx}`, item.discriminacao); sv(`livre_area_${idx}`, item.area);
    sv(`livre_qtd_${idx}`, item.quantidade); sv(`livre_unid_${idx}`, item.unidade);
    sv(`livre_uso_${idx}`, item.uso); sv(`livre_preco_${idx}`, item.preco); sv(`livre_rec_${idx}`, item.rec_prop);
    const sel = document.getElementById(`livre_insumo_${idx}`); if (sel && item.insumo) sel.value = item.insumo;
  });

  if (d.receitas_bov) d.receitas_bov.forEach((v,i) => sv(`rec_bov_${i+1}`, v));
  if (d.receitas_ovi) d.receitas_ovi.forEach((v,i) => sv(`rec_ovi_${i+1}`, v));

  if (d.cronograma) Object.entries(d.cronograma).forEach(([k, parcels]) => {
    ['p1','p2','p3','p4'].forEach(p => sv(`cron_${k}_${p}`, parcels[p]));
  });
}

/* ── Local storage (rascunho novos projetos) ─────────────────────────────── */
function saveLocal() {
  if (!currentBNBCliente || currentProjetoId) return;
  try { localStorage.setItem(getLSKey(), JSON.stringify(collectFormData())); } catch (e) {}
}
function loadLocal() {
  try {
    const raw = localStorage.getItem(getLSKey());
    if (raw) { const d = JSON.parse(raw); loadFormData(d); if (d._step) currentStep = d._step; }
  } catch (e) {}
}

/* ── Program auto-fill ───────────────────────────────────────────────────── */
function onProgramChange() {
  const name = document.getElementById('programa_credito')?.value;
  if (!name || !window.PROGRAMS) return;
  const found = window.PROGRAMS.find(p => p.name === name);
  if (found?.group) {
    const sel = document.getElementById('grupo');
    if (sel) for (const opt of sel.options) {
      if (opt.value === found.group || opt.value.includes(found.group)) { sel.value = opt.value; break; }
    }
  }
}

/* ── Generate file + salvar projeto ─────────────────────────────────────── */
async function generateFile() {
  const btn     = document.getElementById('btn-generate');
  const btnCard = document.getElementById('btn-generate-card');
  if (btn)     { btn.disabled = true;     btn.innerHTML = '<span class="spinner"></span> Gerando…'; }
  if (btnCard) { btnCard.disabled = true; }

  try {
    const dados = collectFormData();
    const res = await fetch('/api/gerar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    });
    if (!res.ok) throw new Error((await res.text()) || 'Erro ao gerar planilha');

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const m    = (res.headers.get('Content-Disposition') || '').match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    a.download = m ? m[1].replace(/['"]/g,'') : 'proposta.xlsm';
    a.href = url;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);

    showToast('Planilha gerada com sucesso!');
    await salvarProjeto(dados); // salva/atualiza no banco
  } catch (err) {
    showToast('Erro: ' + err.message, true);
  } finally {
    if (btn)     { btn.disabled = false;     btn.innerHTML = '⬇ Baixar Planilha .xlsm'; }
    if (btnCard) { btnCard.disabled = false; }
  }
}

/* ── Toast ────────────────────────────────────────────────────────────────── */
function showToast(msg, isErr = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isErr ? '#dc2626' : '#1f2937';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* ══════════════════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  let saveTimer;
  document.addEventListener('input', e => {
    if (e.target.closest('#modal-bnb') && currentBNBCliente && !currentProjetoId) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveLocal, 800);
    }
    if (e.target.id?.startsWith('cron_')) updateCronogramaTotals();
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'programa_credito') onProgramChange();
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target !== overlay) return;
      if (overlay.id === 'modal-bnb')       closeModalBNB();
      else if (overlay.id === 'modal-cliente')  closeModalCliente();
      else if (overlay.id === 'modal-confirm')  closeModalConfirm();
      else if (overlay.id === 'modal-projetos') closeModalProjetos();
    });
  });

  updateStepNav();
  loadClientes();
  loadMinhaInfo();
});
