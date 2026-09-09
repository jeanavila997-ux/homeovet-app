# -*- coding: utf-8 -*-
"""Gera dist/base.json a partir do index.html do HomeoVet (fonte de verdade)."""
import re, json, os, sys

SRC = r"C:\Users\JEANPC\homeovet\index.html"
DEST = r"C:\Users\JEANPC\homeovet-app\dist\base.json"

html = open(SRC, encoding="utf-8").read()
m = re.search(r"const BASE = (\{.*?\});\n", html, re.S)
if not m:
    print("ERRO: BASE não encontrada no index.html")
    sys.exit(1)

base = json.loads(m.group(1))
os.makedirs(os.path.dirname(DEST), exist_ok=True)
with open(DEST, "w", encoding="utf-8") as f:
    json.dump(base, f, ensure_ascii=False, indent=2)

print(f"OK: base.json gerado — {len(base['medicamentos'])} medicamentos, "
      f"{len(base['evidencias_cientificas'])} evidências, "
      f"{len(base['regulamentacao_brasil'])} regulamentações, "
      f"{len(base['glossario'])} termos")
