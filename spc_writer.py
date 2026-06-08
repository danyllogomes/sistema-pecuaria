"""Jet4 (Access 2000) MDB writer for BNB SPC files.

Produces a ZIP-based SPC file containing a patched copy of the template MDB
with the proposal data provided by the caller.
"""

from __future__ import annotations

import io
import os
import struct
import zipfile
from datetime import date
from typing import Optional

_PAGE = 4096
_TEMPLATE = os.path.join(os.path.dirname(__file__), 'template_bnb.mdb')

# T033ORCA lives on page 494 (tdef page 260)
_ORCA_DATA_PAGE = 494
_ORCA_TDEF_PAGE = 260

# ---------- low-level helpers ----------

def _cu(text: str) -> bytes:
    """Compressed-unicode encode: \\xff\\xfe + Latin-1 bytes."""
    return b'\xff\xfe' + text.encode('latin-1', errors='replace')


def _patch_all(data: bytearray, old: bytes, new: bytes) -> None:
    """Replace every occurrence of old with new (must be same length)."""
    assert len(old) == len(new), f"patch_all: {len(old)} != {len(new)}"
    pos = 0
    while True:
        idx = data.find(old, pos)
        if idx == -1:
            break
        data[idx:idx + len(old)] = new
        pos = idx + len(new)


def _patch_text_cu(data: bytearray, old_text: str, new_text: str) -> None:
    """Replace a compressed-unicode text field, padding/truncating to original length."""
    old_body = old_text.encode('latin-1', errors='replace')
    new_body = new_text.encode('latin-1', errors='replace')
    if len(new_body) < len(old_body):
        new_body = new_body + b' ' * (len(old_body) - len(new_body))
    else:
        new_body = new_body[:len(old_body)]
    _patch_all(data, b'\xff\xfe' + old_body, b'\xff\xfe' + new_body)


# ---------- T033ORCA record builder ----------

def _make_orca_record(
    cd_prj: str,
    sq_ivs: int, sq_orc: int,
    cd_sbg_orc: int,
    qt_orc: float,
    cd_und_mdd: str,
    de_orc: str,
    vr_uni: float,
    qt_dd_ini: int, qt_dd_rea: int,
    pc_rea_cnt: float, pc_rea: float,
    rec_prp_aju: float,
    dt_ini_days: float,
    vr_rec_prp: float, vr_rec_fnc: float,
    vr_rec_prp_tot: float, vr_rec_fnc_tot: float,
) -> bytes:
    """Assemble one T033ORCA row in Jet4 binary format."""

    fixed = bytearray(81)
    struct.pack_into('<H', fixed, 0,  0x0013)           # null bitmap (constant)
    struct.pack_into('<h', fixed, 2,  sq_ivs)
    struct.pack_into('<h', fixed, 4,  sq_orc)
    fixed[6] = cd_sbg_orc
    struct.pack_into('<f', fixed, 7,  qt_orc)
    struct.pack_into('<q', fixed, 11, round(vr_uni * 10000))  # Currency
    struct.pack_into('<h', fixed, 19, qt_dd_ini)
    struct.pack_into('<h', fixed, 21, qt_dd_rea)
    struct.pack_into('<d', fixed, 23, pc_rea_cnt)
    struct.pack_into('<f', fixed, 31, pc_rea)
    struct.pack_into('<f', fixed, 35, rec_prp_aju)
    struct.pack_into('<d', fixed, 39, dt_ini_days)
    struct.pack_into('<d', fixed, 47, vr_rec_prp)
    struct.pack_into('<d', fixed, 55, vr_rec_fnc)
    struct.pack_into('<d', fixed, 63, vr_rec_prp_tot)
    struct.pack_into('<d', fixed, 71, vr_rec_fnc_tot)
    fixed[79] = 0x00
    fixed[80] = 0x52  # constant observed in all rows

    cd_prj_enc  = _cu(cd_prj[:15])
    cd_und_enc  = _cu(cd_und_mdd[:5])
    de_orc_enc  = _cu(de_orc[:70])

    off_cd_prj = 81
    off_cd_und = off_cd_prj + len(cd_prj_enc)
    off_de_orc = off_cd_und + len(cd_und_enc)
    eod        = off_de_orc + len(de_orc_enc)

    # Jump table (13 bytes, at end of row):
    # [eod][DE_ORC start][CD_UND start][CD_PRJ start][0x0003][0xFFFF(ID_CUL_CSR=NULL)][count=3]
    jump_table = (
        struct.pack('<H', eod)        +
        struct.pack('<H', off_de_orc) +
        struct.pack('<H', off_cd_und) +
        struct.pack('<H', off_cd_prj) +
        b'\x03\x00'                   +
        b'\xff\xff'                   +
        bytes([3])
    )

    return bytes(fixed) + cd_prj_enc + cd_und_enc + de_orc_enc + jump_table


# ---------- T033ORCA page writer ----------

def _rewrite_orca_page(mdb: bytearray, items: list, cd_prj: str, dt_ini_days: float) -> None:
    """Replace page _ORCA_DATA_PAGE with new T033ORCA records built from *items*.

    Each item dict must have:
      sq_ivs, de_orc, qt_orc, vr_uni
    Optional (with defaults):
      sq_orc (1), cd_und_mdd ('und'), cd_sbg_orc (12),
      rec_prp_aju (0.0), qt_dd_ini (29), qt_dd_rea (0)
    """
    new_page = bytearray(_PAGE)
    new_page[0] = 0x01                                          # data page type
    struct.pack_into('<I', new_page, 4, _ORCA_TDEF_PAGE)       # owner tdef

    records = []
    for item in items:
        sq_ivs      = int(item['sq_ivs'])
        sq_orc      = int(item.get('sq_orc', 1))
        cd_sbg_orc  = int(item.get('cd_sbg_orc', 12))
        qt_orc      = float(item.get('qt_orc', 1.0))
        cd_und_mdd  = str(item.get('cd_und_mdd', 'und'))
        de_orc      = str(item.get('de_orc', ''))[:70]
        vr_uni      = float(item.get('vr_uni', 0.0))
        rec_prp_aju = float(item.get('rec_prp_aju', 0.0))
        qt_dd_ini   = int(item.get('qt_dd_ini', 29))
        qt_dd_rea   = int(item.get('qt_dd_rea', 0))

        vr_total       = vr_uni * qt_orc
        vr_rec_prp     = vr_total * rec_prp_aju / 100.0
        vr_rec_fnc     = vr_total - vr_rec_prp

        records.append(_make_orca_record(
            cd_prj=cd_prj, sq_ivs=sq_ivs, sq_orc=sq_orc,
            cd_sbg_orc=cd_sbg_orc, qt_orc=qt_orc,
            cd_und_mdd=cd_und_mdd, de_orc=de_orc,
            vr_uni=vr_uni, qt_dd_ini=qt_dd_ini, qt_dd_rea=qt_dd_rea,
            pc_rea_cnt=0.0, pc_rea=0.0, rec_prp_aju=rec_prp_aju,
            dt_ini_days=dt_ini_days,
            vr_rec_prp=vr_rec_prp, vr_rec_fnc=vr_rec_fnc,
            vr_rec_prp_tot=vr_rec_prp, vr_rec_fnc_tot=vr_rec_fnc,
        ))

    # Write records from end of page upward
    current_end = _PAGE
    row_offsets = []
    for rec in records:
        start = current_end - len(rec)
        min_allowed = 14 + (len(records) + 1) * 2
        if start < min_allowed:
            break
        new_page[start:current_end] = rec
        row_offsets.append(start)
        current_end = start

    n = len(row_offsets)
    struct.pack_into('<H', new_page, 12, n)
    for i, off in enumerate(row_offsets):
        struct.pack_into('<H', new_page, 14 + i * 2, off)

    data_start      = min(row_offsets) if row_offsets else _PAGE
    offset_table_end = 14 + n * 2
    struct.pack_into('<H', new_page, 2, data_start - offset_table_end)

    # Patch page into mdb
    pg = _ORCA_DATA_PAGE * _PAGE
    mdb[pg:pg + _PAGE] = new_page

    # Update tdef row count at offset 16
    td = _ORCA_TDEF_PAGE * _PAGE
    struct.pack_into('<I', mdb, td + 16, n)


# ---------- public API ----------

def build_spc(
    nome_cli: str,
    cpf_cli: str,
    nm_bnf: str,
    items: list,
    dt_ini: Optional[date] = None,
) -> bytes:
    """Return the bytes of a `.SPC` file (ZIP) for the given proposal data.

    Args:
        nome_cli: client full name (for T033CLIE / T033BCLI patches)
        cpf_cli:  CPF without punctuation, 11 digits (used to build CD_PRJ)
        nm_bnf:   beneficiary full name (may equal nome_cli)
        items:    list of investment item dicts (see _rewrite_orca_page)
        dt_ini:   investment start date (defaults to today)
    """
    cpf_clean = ''.join(c for c in cpf_cli if c.isdigit())[:11].ljust(11, '0')
    cd_prj_new = cpf_clean + 'PRJ'  # 14 chars, same length as template
    cd_prj_old = '26057579520PRJ'

    if dt_ini is None:
        dt_ini = date.today()
    dt_ini_days = float((dt_ini - date(1899, 12, 30)).days)

    with open(_TEMPLATE, 'rb') as f:
        raw = f.read()
    mdb = bytearray(raw)

    # 1. Replace CD_PRJ everywhere (same length, safe direct patch)
    _patch_all(mdb, _cu(cd_prj_old), _cu(cd_prj_new))

    # 2. Patch client/beneficiary names (padded to original length)
    _patch_text_cu(mdb, 'Thiago Coutinho de Sousa', nome_cli)
    if nm_bnf != nome_cli:
        _patch_text_cu(mdb, nome_cli, nm_bnf)  # second pass if different

    # 3. Rewrite T033ORCA data page with the caller's items
    if items:
        _rewrite_orca_page(mdb, items, cd_prj_new, dt_ini_days)

    # 4. Pack into ZIP with the required path
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('SISTEMAS/S033/VERSAO2/exporta/completo.mdb', bytes(mdb))
    return buf.getvalue()
