/* ── State ────────────────────────────────────────────────────────────────── */
const TOTAL_STEPS = 8;
let currentStep = 1;
const LS_KEY = 'bnb_proposta_v1';

/* ── Step management ─────────────────────────────────────────────────────── */
function goToStep(n) {
  if (n < 1 || n > TOTAL_STEPS) return;
  document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`step-${n}`);
  if (target) target.classList.add('active');
  currentStep = n;
  updateStepNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  saveLocal();
}

function updateStepNav() {
  document.querySelectorAll('.step-pill').forEach((pill, i) => {
    const num = i + 1;
    pill.classList.remove('active', 'done');
    if (num === currentStep) pill.classList.add('active');
    else if (num < currentStep) pill.classList.add('done');
  });
  document.getElementById('btn-prev').disabled = currentStep === 1;
  const btnNext = document.getElementById('btn-next');
  const btnGenerate = document.getElementById('btn-generate');
  if (currentStep === TOTAL_STEPS) {
    btnNext.style.display = 'none';
    btnGenerate.style.display = 'inline-flex';
  } else {
    btnNext.style.display = 'inline-flex';
    btnGenerate.style.display = 'none';
  }
  document.getElementById('step-indicator').textContent = `Passo ${currentStep} de ${TOTAL_STEPS}`;
}

function nextStep() {
  if (!validateStep(currentStep)) return;
  goToStep(currentStep + 1);
  if (currentStep === TOTAL_STEPS) buildReview();
}

function prevStep() { goToStep(currentStep - 1); }

/* ── Validation ───────────────────────────────────────────────────────────── */
function validateStep(step) {
  let ok = true;
  const stepEl = document.getElementById(`step-${step}`);
  stepEl.querySelectorAll('[data-required]').forEach(el => {
    const val = el.value.trim();
    const errorEl = document.getElementById(el.id + '_err');
    if (!val) {
      el.classList.add('error');
      if (errorEl) { errorEl.textContent = 'Campo obrigatório'; errorEl.classList.add('show'); }
      ok = false;
    } else {
      el.classList.remove('error');
      if (errorEl) errorEl.classList.remove('show');
    }
  });
  if (!ok) showToast('Preencha os campos obrigatórios antes de continuar.');
  return ok;
}

/* ── Cronograma: live percentage totals ───────────────────────────────────── */
function updateCronogramaTotals() {
  const items = ['milho','torta','soja','vacinas','racao_conc','sal_mineral',
                 'livre_1','livre_2','livre_3','livre_4','livre_5','mao_obra','assessoria'];
  ['p1','p2','p3','p4'].forEach(parcel => {
    let total = 0;
    items.forEach(item => {
      const el = document.getElementById(`cron_${item}_${parcel}`);
      if (el) total += parseFloat(el.value || 0);
    });
    const totEl = document.getElementById(`cron_total_${parcel}`);
    if (totEl) {
      totEl.textContent = total.toFixed(1) + '%';
      totEl.className = 'pct-total ' + (Math.abs(total - 100) < 0.1 ? 'ok' : (total > 0 ? 'warn' : ''));
    }
  });
}

/* ── Review builder ───────────────────────────────────────────────────────── */
function buildReview() {
  const d = collectFormData();
  const rev = document.getElementById('review-content');
  if (!rev) return;

  const sections = [
    { title: 'Dados do Cliente', keys: [
      ['nome_cliente','Cliente'], ['cpf_cnpj_cliente','CPF/CNPJ'],
      ['telefone_cliente','Telefone'], ['municipio_uf','Município-UF'],
      ['endereco','Endereço'], ['numero','Nº'], ['complemento','Complemento'], ['bairro','Bairro'],
    ]},
    { title: 'Elaborador', keys: [
      ['empresa_elaborador','Empresa'], ['cpf_cnpj_elaborador','CPF/CNPJ'],
      ['tecnico_responsavel','Técnico'], ['crea','CREA'], ['data_elaboracao','Data'],
    ]},
    { title: 'Proposta', keys: [
      ['agencia','Agência'], ['grupo','Grupo'], ['programa_credito','Programa'],
      ['finalidade_credito','Finalidade'], ['atividade_principal','Atividade Principal'],
      ['categ_produtor','Categ. Produtor'], ['benef_politica_pub','Benef. Políticas Públicas'],
    ]},
    { title: 'Contrato', keys: [
      ['prazo_meses','Prazo (meses)'], ['carencia_meses','Carência (meses)'],
      ['encargos_ao_ano','Encargos (% a.a.)'], ['periodicidade_reembolso','Periodicidade'],
    ]},
  ];

  rev.innerHTML = sections.map(sec => `
    <div class="review-section">
      <h4>${sec.title}</h4>
      <div class="review-grid">
        ${sec.keys.map(([k, label]) => {
          const val = d[k] || '—';
          return `<div class="review-item">
            <div class="key">${label}</div>
            <div class="val">${val}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

/* ── Data collection ──────────────────────────────────────────────────────── */
function collectFormData() {
  const g = id => (document.getElementById(id) || {}).value || '';

  // Cronograma
  const cron_items = ['milho','torta','soja','vacinas','racao_conc','sal_mineral',
                      'livre_1','livre_2','livre_3','livre_4','livre_5','mao_obra','assessoria'];
  const cronograma = {};
  cron_items.forEach(item => {
    cronograma[item] = {
      p1: g(`cron_${item}_p1`), p2: g(`cron_${item}_p2`),
      p3: g(`cron_${item}_p3`), p4: g(`cron_${item}_p4`),
    };
  });

  // Free items
  const free_items = [];
  for (let i = 1; i <= 5; i++) {
    const disc = g(`livre_discrim_${i}`);
    if (disc) {
      free_items.push({
        discriminacao: disc,
        area: g(`livre_area_${i}`),
        insumo: g(`livre_insumo_${i}`),
        quantidade: g(`livre_qtd_${i}`),
        unidade: g(`livre_unid_${i}`),
        uso: g(`livre_uso_${i}`),
        preco: g(`livre_preco_${i}`),
        rec_prop: g(`livre_rec_${i}`),
      });
    }
  }

  // Receitas
  const receitas_bov = [1,2,3,4,5].map(n => g(`rec_bov_${n}`));
  const receitas_ovi = [1,2,3,4,5].map(n => g(`rec_ovi_${n}`));

  return {
    // Step 1
    nome_cliente: g('nome_cliente'), cpf_cnpj_cliente: g('cpf_cnpj_cliente'),
    telefone_cliente: g('telefone_cliente'), municipio_uf: g('municipio_uf'),
    endereco: g('endereco'), numero: g('numero'),
    complemento: g('complemento'), bairro: g('bairro'),
    // Step 2
    cliente_elaborador: g('cliente_elaborador'),
    empresa_elaborador: g('empresa_elaborador'),
    cpf_cnpj_elaborador: g('cpf_cnpj_elaborador'),
    tecnico_responsavel: g('tecnico_responsavel'),
    cpf_tecnico: g('cpf_tecnico'), crea: g('crea'),
    telefone_elaborador: g('telefone_elaborador'),
    data_elaboracao: g('data_elaboracao'),
    // Step 3
    categ_produtor: g('categ_produtor'), agencia: g('agencia'),
    municipio_decreto: getRadio('municipio_decreto'),
    grupo: g('grupo'), base_agroecologica: getRadio('base_agroecologica'),
    programa_credito: g('programa_credito'),
    planos_territoriais: getRadio('planos_territoriais'),
    finalidade_credito: g('finalidade_credito'),
    custeio_rotativo: getRadio('custeio_rotativo'),
    atividade_principal: g('atividade_principal'),
    benef_politica_pub: g('benef_politica_pub'),
    valor_emergencial: g('valor_emergencial'),
    // Step 4
    reprod_bovinos: g('reprod_bovinos'), matrizes_bovinos: g('matrizes_bovinos'),
    novilhos: g('novilhos'), novilhas_engorda: g('novilhas_engorda'),
    garrotes: g('garrotes'), garrotas: g('garrotas'), bezerros: g('bezerros'),
    reprod_ovinos: g('reprod_ovinos'), matrizes_ovinos: g('matrizes_ovinos'),
    femeas_1_2_anos: g('femeas_1_2_anos'), machos_1_2_anos: g('machos_1_2_anos'),
    femeas_0_1_anos: g('femeas_0_1_anos'), machos_0_1_anos: g('machos_0_1_anos'),
    necessidade_racao_meses: g('necessidade_racao_meses'),
    // Step 5
    preco_milho: g('preco_milho'), rec_prop_milho: g('rec_prop_milho'),
    preco_torta: g('preco_torta'), rec_prop_torta: g('rec_prop_torta'),
    preco_soja: g('preco_soja'), rec_prop_soja: g('rec_prop_soja'),
    preco_vacinas: g('preco_vacinas'), rec_prop_vacinas: g('rec_prop_vacinas'),
    preco_racao_conc: g('preco_racao_conc'), rec_prop_racao_conc: g('rec_prop_racao_conc'),
    preco_sal_mineral: g('preco_sal_mineral'), rec_prop_sal_mineral: g('rec_prop_sal_mineral'),
    free_items,
    preco_mao_obra: g('preco_mao_obra'), rec_prop_mao_obra: g('rec_prop_mao_obra'),
    assessoria_pct: g('assessoria_pct'),
    // Step 6
    data_parcela_1: g('data_parcela_1'), data_parcela_2: g('data_parcela_2'),
    data_parcela_3: g('data_parcela_3'), data_parcela_4: g('data_parcela_4'),
    cronograma,
    // Step 7
    receitas_bov, receitas_ovi,
    prazo_meses: g('prazo_meses'), carencia_meses: g('carencia_meses'),
    encargos_ao_ano: g('encargos_ao_ano'),
    periodicidade_reembolso: g('periodicidade_reembolso'),
    periodo_lactacao: g('periodo_lactacao'),
    producao_leite: g('producao_leite'),
    comentarios: g('comentarios'),
  };
}

function getRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

/* ── Local storage ────────────────────────────────────────────────────────── */
function saveLocal() {
  try {
    const d = collectFormData();
    d._step = currentStep;
    localStorage.setItem(LS_KEY, JSON.stringify(d));
  } catch(e) {}
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined && val !== null) el.value = val;
    };

    // Simple fields
    const simple = [
      'nome_cliente','cpf_cnpj_cliente','telefone_cliente','municipio_uf',
      'endereco','numero','complemento','bairro',
      'empresa_elaborador','cpf_cnpj_elaborador','tecnico_responsavel',
      'cpf_tecnico','crea','telefone_elaborador','data_elaboracao',
      'categ_produtor','agencia','grupo','programa_credito',
      'finalidade_credito','atividade_principal','benef_politica_pub','valor_emergencial',
      'reprod_bovinos','matrizes_bovinos','novilhos','novilhas_engorda',
      'garrotes','garrotas','bezerros','reprod_ovinos','matrizes_ovinos',
      'femeas_1_2_anos','machos_1_2_anos','femeas_0_1_anos','machos_0_1_anos',
      'necessidade_racao_meses',
      'preco_milho','rec_prop_milho','preco_torta','rec_prop_torta',
      'preco_soja','rec_prop_soja','preco_vacinas','rec_prop_vacinas',
      'preco_racao_conc','rec_prop_racao_conc','preco_sal_mineral','rec_prop_sal_mineral',
      'preco_mao_obra','rec_prop_mao_obra','assessoria_pct',
      'data_parcela_1','data_parcela_2','data_parcela_3','data_parcela_4',
      'prazo_meses','carencia_meses','encargos_ao_ano','periodicidade_reembolso',
      'periodo_lactacao','producao_leite','comentarios',
    ];
    simple.forEach(k => setVal(k, d[k]));

    // Radios
    ['cliente_elaborador','municipio_decreto','base_agroecologica',
     'planos_territoriais','custeio_rotativo'].forEach(name => {
      const val = d[name];
      if (val) {
        const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
        if (el) el.checked = true;
      }
    });

    // Free items
    if (d.free_items) {
      d.free_items.forEach((item, i) => {
        const idx = i + 1;
        setVal(`livre_discrim_${idx}`, item.discriminacao);
        setVal(`livre_area_${idx}`, item.area);
        setVal(`livre_qtd_${idx}`, item.quantidade);
        setVal(`livre_unid_${idx}`, item.unidade);
        setVal(`livre_uso_${idx}`, item.uso);
        setVal(`livre_preco_${idx}`, item.preco);
        setVal(`livre_rec_${idx}`, item.rec_prop);
        if (item.insumo) {
          const el = document.querySelector(`select#livre_insumo_${idx}`);
          if (el) el.value = item.insumo;
        }
      });
    }

    // Receitas
    if (d.receitas_bov) d.receitas_bov.forEach((v,i) => setVal(`rec_bov_${i+1}`, v));
    if (d.receitas_ovi) d.receitas_ovi.forEach((v,i) => setVal(`rec_ovi_${i+1}`, v));

    // Cronograma
    if (d.cronograma) {
      Object.entries(d.cronograma).forEach(([item, parcels]) => {
        ['p1','p2','p3','p4'].forEach(p => {
          setVal(`cron_${item}_${p}`, parcels[p]);
        });
      });
    }

    if (d._step) goToStep(d._step);
  } catch(e) {}
}

/* ── Program auto-fill ────────────────────────────────────────────────────── */
function onProgramChange() {
  const programName = document.getElementById('programa_credito').value;
  // programs is injected by Jinja as window.PROGRAMS
  if (window.PROGRAMS) {
    const found = window.PROGRAMS.find(p => p.name === programName);
    if (found && found.group) {
      const grupSel = document.getElementById('grupo');
      if (grupSel) {
        // Try to match group
        for (const opt of grupSel.options) {
          if (opt.value === found.group || opt.value.includes(found.group)) {
            grupSel.value = opt.value;
            break;
          }
        }
      }
    }
  }
}

/* ── Generate file ─────────────────────────────────────────────────────────── */
async function generateFile() {
  const btn = document.getElementById('btn-generate');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Gerando planilha…';

  try {
    const data = collectFormData();
    const res = await fetch('/api/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || 'Erro ao gerar planilha');
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const cd   = res.headers.get('Content-Disposition') || '';
    const match = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    a.download = match ? match[1].replace(/['"]/g,'') : 'proposta.xlsm';
    a.href = url;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Planilha gerada com sucesso!');
    localStorage.removeItem(LS_KEY);
  } catch(err) {
    showToast('Erro: ' + err.message, true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '⬇ Baixar Planilha .xlsm';
  }
}

/* ── Toast ─────────────────────────────────────────────────────────────────── */
function showToast(msg, isErr = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isErr ? '#dc2626' : '#1f2937';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* ── Auto-save on input ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Auto-save debounce
  let saveTimer;
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveLocal, 800);
    });
  });

  // Cronograma live totals
  document.querySelectorAll('[id^="cron_"]').forEach(el => {
    el.addEventListener('input', updateCronogramaTotals);
  });

  // Program auto-fill
  const pgSel = document.getElementById('programa_credito');
  if (pgSel) pgSel.addEventListener('change', onProgramChange);

  // Load saved data
  loadLocal();

  // Init step display
  updateStepNav();
});
