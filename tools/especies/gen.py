# -*- coding: utf-8 -*-
import json, sys
from datos import E
import fantasticos  # noqa: añade a E

ACT = {"M": "manana", "D": "dia", "T": "tarde", "C": "crepusculo", "N": "noche"}
ACT_TXT = {"M": "Mañana", "D": "Día", "T": "Tarde", "C": "Crepúsculo", "N": "Noche"}
BIO = {"U": "urbano", "B": "bosque", "P": "pradera", "M": "montana", "R": "rio", "C": "costa"}
BIO_TXT = {"U": "Urbano", "B": "Bosque", "P": "Pradera", "M": "Montaña", "R": "Río / Lago", "C": "Costa"}
GEN = {
 "g:insectos": "insectos", "g:lombrices": "lombrices", "g:semillas": "semillas", "g:frutos": "frutos silvestres",
 "g:hierba": "hierba", "g:hojas": "hojas y brotes", "g:raices": "raíces y bulbos", "g:carrona": "carroña",
 "g:basura": "basura/desperdicios", "g:plancton": "plancton", "g:algas": "algas",
 "g:peces_pequenos": "peces pequeños", "g:invertebrados_acuaticos": "invertebrados acuáticos",
 "g:nectar": "néctar", "g:huevos": "huevos", "g:huesos": "huesos", "g:ganado": "ganado (ovejas, cabras)",
 "g:medusas": "medusas", "g:suenos": "sueños de los durmientes",
}

ids = {e["id"] for e in E}
assert len(ids) == len(E), "ids duplicados"
byid = {e["id"]: e for e in E}

# Validación y reciprocidad de la red trófica
errs = []
for e in E:
    for k in ("dieta", "depredadores"):
        for r in e[k]:
            if r.startswith("g:"):
                if r not in GEN: errs.append(f"{e['id']}.{k}: reserva desconocida {r}")
            elif r not in ids:
                errs.append(f"{e['id']}.{k}: id desconocido {r}")
if errs:
    print("\n".join(errs)); sys.exit(1)
for e in E:
    for presa in e["dieta"]:
        if presa in byid and e["id"] not in byid[presa]["depredadores"]:
            byid[presa]["depredadores"].append(e["id"])
    for dep in e["depredadores"]:
        if e["id"] not in byid[dep]["dieta"]:
            byid[dep]["dieta"].append(e["id"])

# JSON
out = []
for e in E:
    nota = e["estado"] + (f" Folklore: {e['folklore']}" if e["folklore"] else "")
    out.append({
        "id": e["id"], "nombre": e["nombre"], "nombreCa": e["nombreCa"], "cientifico": e["cientifico"],
        "biomas": [BIO[b] for b in e["biomas"]], "tipo": e["tipo"], "rol": e["rol"],
        "dieta": e["dieta"], "depredadores": e["depredadores"],
        "actividad": [ACT[a] for a in e["actividad"]],
        "cria": e["cria"], "reproduccion": e["reproduccion"], "conducta": e["conducta"],
        "recursos": e["recursos"], "estado": e["estado"], "folklore": e["folklore"], "nota": nota,
    })
json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False, indent=2)

# Tablas markdown
def nom(r):
    return GEN[r] if r.startswith("g:") else byid[r]["nombre"]
def lst(rs, real=False): return ", ".join(nom(r) for r in rs if not (real and r in byid and byid[r]["tipo"]=="fantastico")) or "—"
def act(e): return ", ".join(ACT_TXT[a] for a in e["actividad"]) or "—"
def esc(s): return (s or "—").replace("|", "/")

tablas = {}
for b in "UBPMRC":
    prim = [e for e in E if e["biomas"][0] == b and e["tipo"] != "fantastico"]
    otros = [e for e in E if b in e["biomas"][1:] and e["tipo"] != "fantastico"]
    an = [e for e in prim if e["tipo"] == "animal"]
    pl = [e for e in prim if e["tipo"] != "animal"]
    s = []
    s.append("#### Fauna\n")
    s.append("| Especie (cast. / cat. / científico) | Rol | Come | Lo cazan | Actividad | Cría (estación · camada) | Repr. | Conducta | Recurso | Estado histórico · folklore |")
    s.append("|---|---|---|---|---|---|---|---|---|---|")
    for e in an:
        s.append(f"| **{e['nombre']}** / {e['nombreCa']} / *{e['cientifico']}* | {e['rol']} | {lst(e['dieta'],True)} | {lst(e['depredadores'],True)} | {act(e)} | {esc(e['cria']['estacion'])} · {esc(e['cria']['camada'])} | {e['reproduccion']} | {esc(e['conducta'])} | {', '.join(e['recursos'])} | {esc(e['estado'])}{' *Folklore:* ' + esc(e['folklore']) if e['folklore'] else ''} |")
    oa = [e for e in otros if e["tipo"] == "animal"]
    if oa:
        s.append(f"\n*También presentes (ficha en su bioma principal):* {', '.join(e['nombre'] for e in oa)}.\n")
    s.append("#### Flora y hongos\n")
    s.append("| Especie (cast. / cat. / científico) | Tipo · rol | Fenología / cosecha | Lo comen | Recurso | Estado · folklore |")
    s.append("|---|---|---|---|---|---|")
    for e in pl:
        s.append(f"| **{e['nombre']}** / {e['nombreCa']} / *{e['cientifico']}* | {e['tipo']} · {e['rol']} | {esc(e['cria']['estacion'])} | {lst(e['depredadores'],True)} | {', '.join(e['recursos'])} | {esc(e['estado'])}{' *Folklore:* ' + esc(e['folklore']) if e['folklore'] else ''} |")
    op = [e for e in otros if e["tipo"] != "animal"]
    if op:
        s.append(f"\n*También presentes:* {', '.join(e['nombre'] for e in op)}.\n")
    tablas[b] = "\n".join(s)

fan = [e for e in E if e["tipo"] == "fantastico"]
f = ["| Criatura (cast. / cat. / «científico» inventado) | Biomas | Rol | Come | Lo caza | Actividad | Cría | Repr. | Conducta | Recurso | Folklore real · regla de juego |", "|---|---|---|---|---|---|---|---|---|---|---|"]
for e in fan:
    f.append(f"| **{e['nombre']}** / {e['nombreCa']} / *{e['cientifico']}* | {', '.join(BIO_TXT[b] for b in e['biomas'])} | {e['rol']} | {lst(e['dieta'])} | {lst(e['depredadores'])} | {act(e)} | {esc(e['cria']['estacion'])} · {esc(e['cria']['camada'])} | {e['reproduccion']} | {esc(e['conducta'])} | {', '.join(e['recursos'])} | {esc(e['folklore'])} — {esc(e['estado'])} |")
tablas["F"] = "\n".join(f)
tablas["G"] = "\n".join(f"- `{k}` — {v}" for k, v in GEN.items())

cont = {t: sum(1 for e in E if e["tipo"] == t) for t in ("animal", "planta", "hongo", "fantastico")}
porb = {b: (sum(1 for e in E if b in e["biomas"] and e["tipo"] == "animal"), sum(1 for e in E if b in e["biomas"] and e["tipo"] in ("planta", "hongo"))) for b in "UBPMRC"}
json.dump({"tablas": tablas, "cont": cont, "porb": porb}, open(sys.argv[2], "w"), ensure_ascii=False)
print(cont, porb)
