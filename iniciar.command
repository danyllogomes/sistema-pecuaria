#!/bin/bash
cd "$(dirname "$0")"

# Check if Flask is installed
if ! python3 -c "import flask" 2>/dev/null; then
  echo "Instalando dependências..."
  pip3 install flask openpyxl --break-system-packages
fi

echo ""
echo "==================================="
echo "  Proposta Custeio Pecuário - BNB"
echo "==================================="
echo ""
echo "Iniciando servidor local..."
echo "Acesse: http://127.0.0.1:5050"
echo ""
echo "Para encerrar: pressione Ctrl+C"
echo ""

# Open browser after 3 seconds
(sleep 3 && open http://127.0.0.1:5050) &

python3 app.py
