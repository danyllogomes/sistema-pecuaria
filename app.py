import io
import json
import os
import openpyxl
import anthropic
from datetime import date
from dotenv import load_dotenv
from flask import Flask, request, send_file, jsonify, send_from_directory
from spc_writer import build_spc

load_dotenv()

DIST_DIR = os.path.join(os.path.dirname(__file__), 'static', 'dist')

app = Flask(__name__, static_folder=None)
TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), 'Planilha_Custeio_Pecuario.xlsm')

# ── Reference data loaded once at startup (with JSON cache) ────────────────────

CACHE_PATH = os.path.join(os.path.dirname(__file__), 'reference_cache.json')

def _extract_from_xlsm():
    """Read reference tables from the .xlsm template (slow — runs once)."""
    wb = openpyxl.load_workbook(TEMPLATE_PATH, read_only=True, keep_vba=True)
    ws = wb['Tabelas']

    agencies, programs, municipios_set = [], [], set()
    finalidades, beneficiarios, atividades, unidades = [], [], [], []

    # Single pass: collect everything we need per row
    for row_data in ws.iter_rows(min_row=3, max_row=6000, values_only=True):
        r_idx = ws.min_row  # not reliable in streaming, use counters below

    # Restart with indexed iteration
    wb.close()
    wb = openpyxl.load_workbook(TEMPLATE_PATH, read_only=True, keep_vba=True)
    ws = wb['Tabelas']

    row_num = 2
    for row_data in ws.iter_rows(min_row=3, max_row=6000, values_only=True):
        row_num += 1

        # Agencies (cols 15, 16 → indices 14, 15)
        if row_num <= 400:
            ag_name = row_data[14] if len(row_data) > 14 else None
            ag_code = row_data[15] if len(row_data) > 15 else None
            if ag_name and isinstance(ag_name, str) and ag_name.strip():
                agencies.append({'name': ag_name.strip(), 'code': ag_code})

        # Programs (cols 23, 24 → indices 22, 23)
        if row_num <= 200:
            pg_name = row_data[22] if len(row_data) > 22 else None
            pg_group = row_data[23] if len(row_data) > 23 else None
            if pg_name and isinstance(pg_name, str) and not str(pg_name).startswith('=') and pg_name.strip():
                programs.append({'name': pg_name.strip(), 'group': pg_group})

        # Finalidades (cols 55, 56 → indices 54, 55)
        if row_num <= 20:
            fn = row_data[54] if len(row_data) > 54 else None
            fc = row_data[55] if len(row_data) > 55 else None
            if fn and isinstance(fn, str) and not str(fn).startswith('=') and fn.strip():
                finalidades.append({'name': fn.strip(), 'code': fc})

        # Beneficiários (cols 63, 64 → indices 62, 63)
        if row_num <= 25:
            bn = row_data[62] if len(row_data) > 62 else None
            bc = row_data[63] if len(row_data) > 63 else None
            if bn and isinstance(bn, str) and not str(bn).startswith('=') and bn.strip():
                beneficiarios.append({'name': bn.strip(), 'code': bc})

        # Atividades (cols 3, 4 → indices 2, 3)
        if row_num <= 800:
            an = row_data[2] if len(row_data) > 2 else None
            ac = row_data[3] if len(row_data) > 3 else None
            if an and isinstance(an, str) and not str(an).startswith('=') and an.strip():
                atividades.append({'name': an.strip(), 'code': ac})

        # Unidades (cols 8, 9 → indices 7, 8)
        if row_num <= 60:
            us = row_data[7] if len(row_data) > 7 else None
            ud = row_data[8] if len(row_data) > 8 else None
            if us and isinstance(us, str) and not str(us).startswith('=') and len(us) < 25:
                unidades.append({'sigla': us.strip(), 'desc': ud})

        # Municipalities (col 47 → index 46)
        mn = row_data[46] if len(row_data) > 46 else None
        if mn and isinstance(mn, str) and '-' in mn:
            municipios_set.add(mn.strip())

    wb.close()

    bad_units = {'Sigla Unidade', 'Sim_Não', 'Uso', 'Periodicidade', 'Sim', 'Não'}
    unidades = [u for u in unidades if u['sigla'] not in bad_units]

    return {
        'agencies': agencies,
        'programs': programs,
        'municipios': sorted(municipios_set),
        'finalidades': finalidades,
        'beneficiarios': sorted(beneficiarios, key=lambda x: x['name']),
        'atividades': atividades,
        'usos': [
            {'name': 'Cobertura do Solo'}, {'name': 'Outras Inversões'},
            {'name': 'Ração e Volumoso'}, {'name': 'Sais Minerais'},
            {'name': 'Vacinas e Medicamentos'}, {'name': 'Estudos e Projetos'},
            {'name': 'Outras Desp. Implantação'},
        ],
        'unidades': unidades,
        'grupos': ['DEMAIS PRODUTORES', 'PRONAF', 'PRONAF-B/AGROAMIGO', 'PRONAF-Demais Grupos'],
        'categorias': ['Mini', 'Pequeno', 'Pequeno-Médio', 'Médio', 'Grande'],
        'periodicidades': ['Anual', 'Semestral', 'Única'],
    }


def _load_reference_data():
    template_mtime = os.path.getmtime(TEMPLATE_PATH)

    # Use cache if it exists and is newer than the template
    if os.path.exists(CACHE_PATH):
        cache_mtime = os.path.getmtime(CACHE_PATH)
        if cache_mtime >= template_mtime:
            print("Carregando cache de referência…")
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)

    print("Extraindo dados da planilha (primeira vez — pode demorar ~60s)…")
    data = _extract_from_xlsm()
    with open(CACHE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Cache salvo em reference_cache.json")
    return data


print("Iniciando servidor…")
REF = _load_reference_data()
print(f"  {len(REF['agencies'])} agências | {len(REF['programs'])} programas | "
      f"{len(REF['municipios'])} municípios | {len(REF['atividades'])} atividades")


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    full = os.path.join(DIST_DIR, path)
    if path and os.path.exists(full):
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, 'index.html')


@app.route('/api/reference')
def api_reference():
    return jsonify(REF)


@app.route('/api/gerar', methods=['POST'])
def gerar():
    data = request.get_json(force=True)
    wb = openpyxl.load_workbook(TEMPLATE_PATH, keep_vba=True)
    ws = wb['Proposta']

    def w(cell, val):
        if val is not None and val != '':
            ws[cell] = val

    # ── Step 1: Dados do Cliente ───────────────────────────────────────────────
    w('F6',  data.get('nome_cliente'))
    w('M6',  data.get('cpf_cnpj_cliente'))
    w('F7',  data.get('telefone_cliente'))
    w('M7',  data.get('municipio_uf'))
    w('F8',  data.get('endereco'))
    w('M8',  data.get('numero'))
    w('F9',  data.get('complemento'))
    w('M9',  data.get('bairro'))

    # ── Step 2: Elaborador ────────────────────────────────────────────────────
    w('F10', data.get('cliente_elaborador'))
    w('F11', data.get('empresa_elaborador'))
    w('F12', data.get('cpf_cnpj_elaborador'))
    w('F13', data.get('tecnico_responsavel'))
    w('M13', data.get('cpf_tecnico'))
    w('F14', data.get('crea'))
    w('M14', data.get('telefone_elaborador'))
    w('F15', data.get('data_elaboracao'))

    # ── Step 3: Proposta Geral ─────────────────────────────────────────────────
    w('M15', data.get('categ_produtor'))
    w('F16', data.get('agencia'))
    w('O16', data.get('municipio_decreto'))
    w('F17', data.get('grupo'))
    w('O17', data.get('base_agroecologica'))
    w('F18', data.get('programa_credito'))
    w('O18', data.get('planos_territoriais'))
    w('F19', data.get('finalidade_credito'))
    w('N19', data.get('custeio_rotativo'))
    w('F20', data.get('atividade_principal'))
    w('F21', data.get('benef_politica_pub'))
    valor_emerg = data.get('valor_emergencial')
    if valor_emerg not in (None, '', 0):
        w('I22', float(valor_emerg))

    # ── Step 4: Atividades/Animais ─────────────────────────────────────────────
    def _int(v):
        try:
            return int(v) if v not in (None, '') else None
        except Exception:
            return None

    w('F26', _int(data.get('reprod_bovinos')))
    w('F27', _int(data.get('matrizes_bovinos')))
    w('F28', _int(data.get('novilhos')))
    w('F29', _int(data.get('novilhas_engorda')))
    w('F30', _int(data.get('garrotes')))
    w('F31', _int(data.get('garrotas')))
    w('F32', _int(data.get('bezerros')))
    w('L26', _int(data.get('reprod_ovinos')))
    w('L27', _int(data.get('matrizes_ovinos')))
    w('L28', _int(data.get('femeas_1_2_anos')))
    w('L29', _int(data.get('machos_1_2_anos')))
    w('L30', _int(data.get('femeas_0_1_anos')))
    w('L31', _int(data.get('machos_0_1_anos')))
    w('F36', _int(data.get('necessidade_racao_meses')))

    # ── Step 5: Itens Financiados ──────────────────────────────────────────────
    def _float(v):
        try:
            return float(str(v).replace(',', '.')) if v not in (None, '') else None
        except Exception:
            return None

    pre_items = [
        ('J41', 'K41', 'preco_milho', 'rec_prop_milho'),
        ('J42', 'K42', 'preco_torta', 'rec_prop_torta'),
        ('J43', 'K43', 'preco_soja', 'rec_prop_soja'),
        ('J44', 'K44', 'preco_vacinas', 'rec_prop_vacinas'),
        ('J45', 'K45', 'preco_racao_conc', 'rec_prop_racao_conc'),
        ('J46', 'K46', 'preco_sal_mineral', 'rec_prop_sal_mineral'),
    ]
    for j_cell, k_cell, preco_key, rec_key in pre_items:
        w(j_cell, _float(data.get(preco_key)))
        w(k_cell, _float(data.get(rec_key)))

    # Free items: rows 47-51
    free_items = data.get('free_items', [])
    for idx, item in enumerate(free_items[:5]):
        r = 47 + idx
        w(f'C{r}', item.get('discriminacao'))
        w(f'E{r}', _float(item.get('area')))
        w(f'F{r}', item.get('insumo'))
        w(f'G{r}', _float(item.get('quantidade')))
        w(f'H{r}', item.get('unidade'))
        w(f'I{r}', item.get('uso'))
        w(f'J{r}', _float(item.get('preco')))
        w(f'K{r}', _float(item.get('rec_prop')))

    # Mão de obra (row 52) and Assessoria (row 53)
    w('J52', _float(data.get('preco_mao_obra')))
    w('K52', _float(data.get('rec_prop_mao_obra')))
    # Assessoria percentage: user enters integer (e.g. 5 for 5%), stored as decimal
    assessoria_pct = data.get('assessoria_pct')
    if assessoria_pct not in (None, ''):
        try:
            w('H53', float(str(assessoria_pct).replace(',', '.')) / 100)
        except Exception:
            pass

    # ── Step 6: Cronograma de Desembolsos ─────────────────────────────────────
    w('I59', data.get('data_parcela_1'))
    w('J59', data.get('data_parcela_2'))
    w('K59', data.get('data_parcela_3'))
    w('L59', data.get('data_parcela_4'))

    # Percentages per item per parcel
    # Row map: pre-defined items at rows 60,62,64,66,68,70; free items at 72-80; mao-obra 82; assessoria 84
    schedule_rows = [60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82, 84]
    schedule_data = data.get('cronograma', {})
    for row, key in zip(schedule_rows, [
        'milho', 'torta', 'soja', 'vacinas', 'racao_conc', 'sal_mineral',
        'livre_1', 'livre_2', 'livre_3', 'livre_4', 'livre_5', 'mao_obra', 'assessoria'
    ]):
        item_sched = schedule_data.get(key, {})
        w(f'I{row}', _float(item_sched.get('p1')))
        w(f'J{row}', _float(item_sched.get('p2')))
        w(f'K{row}', _float(item_sched.get('p3')))
        w(f'L{row}', _float(item_sched.get('p4')))

    # ── Step 7: Receitas e Contrato ────────────────────────────────────────────
    receitas_bov = data.get('receitas_bov', [None]*5)
    receitas_ovi = data.get('receitas_ovi', [None]*5)
    rec_cols = ['I', 'J', 'K', 'L', 'M']
    for i, col in enumerate(rec_cols):
        w(f'{col}90', _float(receitas_bov[i] if i < len(receitas_bov) else None))
        w(f'{col}91', _float(receitas_ovi[i] if i < len(receitas_ovi) else None))

    w('F114', _int(data.get('prazo_meses')))
    w('F115', _int(data.get('carencia_meses')))
    w('F116', _float(data.get('encargos_ao_ano')))
    w('F117', data.get('periodicidade_reembolso'))

    # Informações complementares de receita (C142:F142 e C143:F143 são ranges mesclados; escrever na célula âncora)
    w('C142', _int(data.get('periodo_lactacao')))
    w('C143', _float(data.get('producao_leite')))

    # Declarações / comments
    w('F274', data.get('comentarios'))

    # ── Save to bytes and return ───────────────────────────────────────────────
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    wb.close()

    nome = data.get('nome_cliente', 'proposta').replace(' ', '_')[:30]
    filename = f'Proposta_Custeio_Pecuario_{nome}.xlsm'

    return send_file(
        output,
        mimetype='application/vnd.ms-excel.sheet.macroEnabled.12',
        as_attachment=True,
        download_name=filename,
    )


@app.route('/api/melhorar-texto', methods=['POST'])
def melhorar_texto():
    data = request.get_json(force=True)
    campo  = data.get('campo', '')
    texto  = (data.get('texto') or '').strip()
    ctx    = data.get('contexto', {})

    if not texto:
        return jsonify({'error': 'Texto vazio'}), 400

    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if not api_key or api_key == 'sua-chave-aqui':
        return jsonify({'error': 'ANTHROPIC_API_KEY não configurada'}), 500

    descricoes = {
        'objetivo':  'objetivo do projeto de crédito rural',
        'memoria':   'memória de cálculo e tecnologia adotada no projeto',
        'localizacao': 'localização e descrição do imóvel rural',
    }
    tipo = descricoes.get(campo, 'texto técnico de projeto rural')

    ctx_lines = [
        f"Beneficiário: {ctx['nome_cliente']}" if ctx.get('nome_cliente') else '',
        f"Atividade: {ctx['atividade_principal']}" if ctx.get('atividade_principal') else '',
        f"Município/UF: {ctx['municipio_uf']}" if ctx.get('municipio_uf') else '',
        f"Programa: {ctx['programa_credito']}" if ctx.get('programa_credito') else '',
    ]
    contexto_str = '\n'.join(l for l in ctx_lines if l)

    system = (
        'Você é um redator especializado em projetos de crédito rural para o BNB (Banco do Nordeste do Brasil). '
        'Melhore o texto fornecido tornando-o mais técnico, formal e adequado para um projeto oficial de financiamento agrícola. '
        'Preserve todas as informações originais — apenas aprimore a redação, a clareza e o nível técnico. '
        'Responda SOMENTE com o texto melhorado, sem prefixos, explicações ou aspas.'
    )
    prompt = (
        f'Contexto do projeto:\n{contexto_str}\n\n'
        f'Campo: {tipo}\n\n'
        f'Texto original:\n{texto}\n\n'
        f'Texto melhorado:'
    )

    try:
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=1024,
            system=system,
            messages=[{'role': 'user', 'content': prompt}],
        )
        return jsonify({'texto': msg.content[0].text})
    except anthropic.APIError as e:
        return jsonify({'error': str(e)}), 502


@app.route('/api/gerar-spc', methods=['POST'])
def gerar_spc():
    data = request.get_json(force=True)

    nome_cli = data.get('nome_cliente', '')
    cpf_cli  = data.get('cpf_cnpj_cliente', '00000000000')
    nm_bnf   = data.get('nome_cliente', nome_cli)

    # Parse data_inicio
    dt_str  = data.get('data_inicio')
    dt_ini  = None
    if dt_str:
        try:
            parts = [int(x) for x in dt_str.split('-')]
            dt_ini = date(parts[0], parts[1], parts[2])
        except Exception:
            pass

    # Build items from free_items wizard data
    raw_items = data.get('items', [])
    items = []
    for idx, it in enumerate(raw_items, start=1):
        try:
            vr_uni = float(str(it.get('preco', 0)).replace(',', '.'))
            qt     = float(str(it.get('quantidade', 1)).replace(',', '.'))
            rec    = float(str(it.get('rec_prop', 0)).replace(',', '.'))
            items.append({
                'sq_ivs':      idx,
                'sq_orc':      1,
                'de_orc':      str(it.get('discriminacao', ''))[:70],
                'qt_orc':      qt,
                'cd_und_mdd':  str(it.get('unidade', 'und'))[:5],
                'vr_uni':      vr_uni,
                'rec_prp_aju': rec,
                'cd_sbg_orc':  12,
            })
        except Exception:
            continue

    try:
        spc_bytes = build_spc(
            nome_cli=nome_cli,
            cpf_cli=cpf_cli,
            nm_bnf=nm_bnf,
            items=items,
            dt_ini=dt_ini,
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    nome_safe = nome_cli.replace(' ', '_')[:30]
    return send_file(
        io.BytesIO(spc_bytes),
        mimetype='application/zip',
        as_attachment=True,
        download_name=f'Proposta_{nome_safe}.SPC',
    )


if __name__ == '__main__':
    app.run(debug=True, port=5050)
