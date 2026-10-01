# Barcanueva: ecología real de Barcelona y su entorno

Investigación para el RPG/simulador de vida pixel art de **Barcanueva**, ciudad de fantasía inspirada en Barcelona en una época premoderna. Recoge fauna, flora y hongos reales de Barcelona y su entorno (Collserola, Montseny, Montserrat, Garraf, llano y delta del Llobregat, Besòs) tal como pudieron ser en la Edad Media y la época moderna, con las especies actuales como referencia. Añade criaturas del folklore catalán con una ecología inventada pero coherente, y una propuesta de modelo de simulación.

Datos para el juego: `docs/especies.json` ({{TOTAL}} entradas: {{NA}} animales, {{NP}} plantas, {{NH}} hongos y {{NF}} criaturas fantásticas). El JSON y estas tablas salen del mismo generador, así que no pueden contradecirse. En la red trófica, cada enlace «A come B» aparece también como «B lo caza A».

## Convenciones

- **Actividad**: franjas del juego `manana`, `dia`, `tarde`, `crepusculo`, `noche`. Crepuscular equivale a `crepusculo` más los bordes de `manana`.
- **Reproducción**: `alta` = varias camadas o puestas grandes al año (conejo, ratón, sardina); `media` = una puesta anual moderada; `baja` = una cría al año o menos, madurez tardía (lobo, oso, cabra montés, foca monje).
- **Reservas genéricas (`g:`)**: recursos tróficos agregados que no se modelan como especie (el juego los trata como «pasto» con capacidad propia):
{{GEN}}
- **Bioma principal**: una especie aparece en varios biomas, pero su ficha completa está en el primero de su lista `biomas`. En el resto se nombra en «También presentes».
- **Plantas y hongos**: la columna «Lo comen» indica qué animales las consumen.

## Rigor y licencias

Datos verificados en la investigación (ver Fuentes):

- **Lobo**: escasea desde mediados del s. XIX; en el Montseny aún había en 1915, en el Montnegre hacia 1900, y el último de Catalunya cayó en los Ports en 1935. Vuelve al Cadí entre 2000 y 2004.
- **Oso pardo**: extendido por las montañas catalanas en la Edad Media. Desapareció de las sierras prelitorales en época moderna y hoy solo sobrevive, reintroducido, en el Pirineo.
- **Lince («llop cerval», «gatillop»)**: exterminado como alimaña entre los ss. XVIII y XX. No está claro si en Catalunya era lince boreal o ibérico; en el juego se puede dejar como `Lynx sp.`.
- **Castor**: vivió en el Llobregat y el Ebro al menos hasta época visigoda y se extinguió en España a mediados del s. XIX. En 2003 se soltaron 18 castores de forma ilegal en el Ebro, y ya han llegado a Lleida.
- **Esturión**: pez de mesas nobles, con la pesca controlada por reyes y consejos en la Corona de Aragón. Se extinguió a mediados del s. XX. En el Ebro está documentado; en el Llobregat es **plausible pero poco documentado**.
- **Foca monje («vell marí»)**: habitual hasta finales del s. XIX. Después se retiró a la Costa Brava, donde desapareció hacia 1950 (hubo un avistamiento en 1973). La Generalitat estudia reintroducirla hacia 2027.
- **Cabra montés en Montserrat**: se reintrodujo en 1995 con unos 20 ejemplares de los Ports y hoy hay unos 439.
- **Tritón del Montseny**: único vertebrado endémico de Catalunya. Quedan unos 1.500 ejemplares en menos de 3,5 km de arroyo, entre 600 y 1.200 m de altitud.
- **Tortuga mediterránea**: la única población natural está en l'Albera. En el Garraf se reintroduce desde 1992, con unos 5.000 ejemplares liberados.
- **Flora de montaña**: abetos relictos y genciana en el Montseny; oreja de oso (*Ramonda myconi*, que tiene en Montserrat su límite sur) y té de roca en Montserrat.

Anacronismos que conviene decidir de forma consciente:

- **Alcachofa del Prat**: se cultiva desde principios del s. XX, con la huerta de regadío del delta. Para la época premoderna, mejor «cardo/alcachofa de huerta».
- **Pollo del Prat (Pota Blava)**: la raza se seleccionó a finales del s. XIX. Sirve como «gallina rústica del Prat» con licencia.
- **Rata**: en la Edad Media era la rata **negra** (la parda llegó en el s. XVIII).
- **Gineta**: probablemente la introdujeron los humanos en la Antigüedad o en época andalusí. Encaja en la época.
- **Mandrágora**: no es silvestre alrededor de Barcelona. En el juego debería ser mercancía de boticario, rara y cara.
- **Pino carrasco**: hoy domina Collserola y el Garraf, pero en la Edad Media había más encinar y cultivo. Conviene que el encinar sea el bosque «por defecto».
- **Quebrantahuesos**: hoy solo vive en el Pirineo. En las sierras prelitorales sería rareza o visitante.

---

## 1. Urbano: ciudad amurallada y puerto

Murallas, tejados, campanarios, graneros, huertos de boticario y el puerto. La cadena básica es desperdicios y grano → ratas y gorriones → gatos, lechuzas y cernícalos. Los vencejos y las golondrinas marcan la llegada del verano.

{{U}}

## 2. Bosque: encinar y robledal (Collserola, Montnegre, umbrías del Montseny)

Encinar con madroño, durillo y rusco. En las umbrías, robledal. La bellota es el recurso clave de otoño e invierno y mueve a jabalíes, arrendajos y ardillas. Las setas de otoño (rovellón, ceps) son el gran acontecimiento de temporada.

{{B}}

## 3. Pradera: llano del Llobregat, campos y masías

Trigales, viñas, olivares, almendros y huerta, con masías y eras. Es un mosaico agrícola donde el conejo es la presa base de todo el sistema. Los topillos y los jabalíes son plagas de cultivo, y las abejas polinizan almendros y huerta.

{{P}}

## 4. Montaña: Montseny y Montserrat (pinares, hayedos, abetales, roquedos)

Hayedos y abetales relictos en el Montseny, y conglomerado, cingles y matorral aromático en Montserrat. Aquí se refugian los grandes mamíferos que la llanura perdió primero (oso, lobo, lince, cabra montés) y las rapaces de roquedo.

{{M}}

## 5. Río / Lago: Llobregat, Besòs, estanys y delta

Bosque de ribera (álamo, sauce, aliso), carrizales y estanys del delta. La nutria, la trucha y el tritón sirven de indicadores de agua limpia. La anguila y el esturión son la pesca valiosa.

{{R}}

## 6. Costa: playas, acantilados del Garraf y praderas de posidonia

Playas y dunas del delta, acantilados calcáreos del Garraf con palmito y romero, y praderas de posidonia como vivero del mar. Aquí viven la foca monje (histórica), las almadrabas de atún y la pesca de sardina con luz («teia»).

{{C}}

---

## 7. Criaturas fantásticas (folklore catalán)

Fauna rara, de 1 a pocos individuos por región. Salvo los minairons y los follets, **no siguen Lotka-Volterra**: aparecen o desaparecen según indicadores del ecosistema real, lo que las convierte en premio o aviso para el jugador. El folklore de cada una es real; su ecología es inventada.

{{FAN}}

---

## 8. Modelo de ecosistema

### 8.1 Unidades y tiempo

- **Mapa** = celda de simulación con un bioma y una lista de vecinos.
- **Tick ecológico** = 1 día de juego. La reproducción solo ocurre dentro de la **estación de cría** de cada especie, repartida en pulsos semanales para que sea barato de calcular.
- Cada especie tiene en cada mapa una **población N** (número entero o densidad) y una **capacidad de carga K** que depende del bioma, de la estación y de los recursos (`g:` y plantas).

### 8.2 Parámetros derivados de la ficha

| Campo JSON | Parámetro | Valor sugerido |
|---|---|---|
| `reproduccion` alta / media / baja | tasa intrínseca anual `r` | 2,0 / 0,8 / 0,25 |
| `cria.estacion` | ventana en la que `r` actúa | fuera de ella, `r = 0` |
| `actividad` | cuándo se ve y se caza | tabla de encuentros por franja |
| `dieta` | presas o recursos que suman a K y alimentan al depredador | Holling II |
| `depredadores` | especies que restan población | Holling II |
| `conducta` | respuesta al jugador | huye / embiste / defiende nido / ignora |

### 8.3 Ecuación por especie y mapa (Lotka-Volterra discreto con capacidad)

Para cada especie *i* en el mapa *m*, en cada tick Δt (fracción de año):

```
crec_i   = r_i · s_i(t) · N_i · (1 − N_i / K_i)            # logístico; s_i(t)=1 solo en estación de cría
pred_ij  = a_ij · N_j · N_i / (1 + a_ij · h_j · N_i)       # respuesta funcional Holling II del depredador j
ganancia_j += e_j · pred_ij                                  # conversión presa → crías del depredador (e ≈ 0,1)
muerte_i = μ_i · N_i                                         # mortalidad basal (inviernos, vejez)
caza_i   = cosecha del jugador + NPC cazadores/pescadores

N_i(t+Δt) = N_i + Δt · (crec_i − Σ_j pred_ij − muerte_i) − caza_i
```

- **K dinámico**: `K_i = K_base(bioma, estación) · min(1, disponibilidad_de_su_dieta / necesidad)`. Si faltan las bellotas, baja la K del jabalí; si se tala el encinar, bajan las de arrendajo, ardilla y jabalí.
- **Depredador sin presas**: si la suma de la dieta disponible es menor que el 20 % de la necesidad, la mortalidad μ del depredador se multiplica por 3. Así el lobo busca el ganado (evento «ataque a rebaño») y después emigra.
- **Plantas**: siguen un crecimiento logístico propio sin depredación Holling. Los herbívoros las consumen como recurso y reducen la biomasa disponible (`g:hierba`, `encina`→bellotas, `posidonia`).

### 8.4 Umbrales

- **Umbral de extinción local (Allee)**: si `N_i < N_min` (por ejemplo, 2 para especies de reproducción baja y 5 para alta), durante 30 días seguidos `N_i → 0` en ese mapa. La especie solo vuelve **por migración**.
- **Explosión demográfica**: si `N_i > 1,5 · K_i`, se dispara un evento de plaga (topillos en la huerta, jabalíes en el trigo, erizos de mar en la posidonia), la especie se dispersa en masa y la mortalidad sube.
- **Especies «bandera»** (tritón, nutria, foca monje, oso): si llegan a 0 en toda la región, la extinción es **permanente** salvo misión de reintroducción. Es un guiño a la cabra montés de Montserrat y a la tortuga del Garraf.

### 8.5 Migración entre mapas colindantes

```
excedente_i(m) = max(0, N_i(m) − 0,8 · K_i(m))
flujo(m → n)  = d_i · excedente_i(m) · (hueco_i(n) / Σ huecos_vecinos)    # hueco = K − N
```

- `d_i` (dispersión): alta en aves y jabalí (0,3), media en carnívoros (0,15) y casi nula en anfibios, peces de arroyo y plantas (0,01).
- **Migradores estacionales** (vencejo, golondrina, codorniz, abejaruco, atún, esturión, anguila): entran y salen de la región por calendario, no por excedente. El esturión y la anguila remontan o bajan el río solo si ningún mapa del recorrido tiene «presa» o «molino» (obstáculo construido por el jugador).
- Los corredores (ríos, sierras) dan bonificación de dispersión. La muralla y los caminos transitados la penalizan.

### 8.6 Efectos en cascada (reglas explícitas)

| Disparador | Cascada | Efecto en el juego |
|---|---|---|
| Desaparecen **lobo** y **lince** | Suben jabalí, ciervo, corzo y conejo por encima de K; aparece el **simiot**; la **quarantamaula** ocupa el nicho nocturno | Daño a trigo, vid y alcachofa (−10 % a −40 % de cosecha según densidad); más peligro nocturno |
| Desaparecen las **abejas** (sobrecosecha de miel, venenos) | La polinización cae | −30 % en almendro, olivo, huerta y frutales; los **minairons** pueden cubrir parte si el jugador tiene su canuto |
| **Sobrepesca** de sardina o de dorada y lubina | Menos comida para delfín, atún y cormorán; sin depredadores, los erizos de mar arrasan la **posidonia** | Menos alevines → K de peces −50 %; playas sin posidonia sufren erosión; el Peix Nicolau desaparece |
| Se tala el **encinar** | Menos bellotas y refugio | Bajan jabalí (y luego sus daños), arrendajo y ardilla; suben conejo y perdiz (espacio abierto); sin rovellón ni ceps |
| **Presas y molinos** en el río | Esturión y anguila no pueden migrar | Extinción local de esturión en 1-3 años de juego; la nutria baja con la anguila |
| Contaminación del río (curtidurías, tintes) | Mueren trucha, tritón y cangrejo | La nutria se va y la **dona d'aigua** desaparece (pierdes su bendición de cosecha) |
| Se mata a todas las **lechuzas**, rapaces y **gatos** | Plaga de ratas y topillos | Pérdidas en graneros, riesgo de «pestilencia» en la ciudad; la Víbria compensa algo |
| Plaga de **topillos** en huerta | Sube la comida para lechuza, cernícalo y culebra | La cría de lechuzas se duplica al año siguiente (autocorrección con retraso) |
| **Caza excesiva** de conejo | Águila perdicera, búho real, zorro y lince pasan hambre | Los zorros atacan gallineros de Pota Blava; las rapaces abandonan el mapa |
| Regreso del **lobo** (misión) | Controla ungulados, pero ataca rebaños | Dilema: el pastor pide batidas y el agricultor lo quiere |
| Pastoreo abandonado | El matorral cierra los prados | Bajan liebre, perdiz y codorniz; suben jabalí y corzo; aumenta el riesgo de incendio en verano |

### 8.7 Indicadores y criaturas fantásticas

Las criaturas raras aparecen según funciones del estado del ecosistema, sin dinámica propia:

- `dona_aigua` aparece si `nutria > 0 ∧ trucha > 0.5K ∧ triton_montseny > 0` en el mapa.
- `peix_nicolau` aparece si `foca_monje > 0 ∨ (posidonia > 0.8K ∧ sardina > 0.6K)`.
- `simiot` aparece si `lobo = 0 ∧ jabali > 1.2K`.
- `quarantamaula` sube su probabilidad nocturna cuando `lobo = 0 ∧ lince = 0`.
- `drac`: una sola pareja por región. Consume ungulados como un superdepredador. Si el jugador lo mata, los ungulados se disparan (cascada del lobo en versión épica).
- `minairons` y `follet`: siguen un Lotka-Volterra normal, con reproducción alta y K muy baja.
- `home_nassos`: evento del 31 de diciembre.

### 8.8 Implementación barata

- Simular en detalle solo el mapa activo y sus vecinos. El resto se actualiza al entrar, con la solución aproximada del intervalo (varios ticks agrupados).
- Guardar por mapa un vector `N[especie]` (Float32) y precalcular `a_ij` a partir de `dieta` y `depredadores` del JSON (matriz dispersa).
- Límites de estabilidad: `Δt ≤ 1/52` año en pulsos semanales y truncado de N a [0, 3K] para evitar oscilaciones explosivas.
- **Encuentros**: la probabilidad de ver la especie *i* en la franja *f* es `N_i/K_i · [f ∈ actividad_i] · visibilidad_i`. La fauna visible en pantalla es una muestra de N, no N entero.

---

## Fuentes

- [El lobo en Cataluña: pasado y presente (ADLO Pirineo)](https://www.adlopirineo.org/2025/07/20/el-lobo-en-cataluna-pasado-y-presente/) · [Lobo (Gencat)](https://mediambient.gencat.cat/es/05_ambits_dactuacio/patrimoni_natural/fauna-autoctona-protegida/gestio-especies-protegides-amenacades/mamifers/llop/index.html) · [El llop al Montseny](https://montsenyrutaametistes.wordpress.com/2015/09/11/el-llop-al-montseny/)
- [L'os bru (enciclopedia.cat)](https://www.enciclopedia.cat/historia-natural-dels-paisos-catalans/los-bru) · [Os bru als Pirineus (Viquipèdia)](https://ca.wikipedia.org/wiki/Os_bru_als_Pirineus) · [Evolució de la fauna i el paisatge (Annals Empordanesos)](https://raco.cat/index.php/AnnalsEmpordanesos/article/download/342474/433644/)
- [Acipenser sturio (Wikipedia)](https://es.wikipedia.org/wiki/Acipenser_sturio) · [El esturión vuelve al Ebro (ECOticias)](https://www.ecoticias.com/naturaleza/hito-historico-el-esturion-vuelve-al-rio-ebro)
- [Foca monje, reintroducción en Cataluña (Infobae, 2026)](https://www.infobae.com/espana/2026/09/22/el-regreso-de-la-foca-monje-del-mediterraneo-podria-hacerse-realidad-cataluna-estudia-reintroducir-esta-especie-extinta-en-espana/) · [La extinción de la foca monje (MAPA)](https://www.mapa.gob.es/ministerio/pags/Biblioteca/Revistas/pdf_REPN%2FREPN_1989_157-177.pdf)
- [Castor en España (De ríos y castores)](https://www.deriosycastores.es/reintroduccion-castor-peninsula-iberica/) · [Castores llegan a Cataluña (Xataka)](https://www.xataka.com/ecologia-y-naturaleza/nadie-sabe-como-frenar-al-castor-europeo-su-aparicion-cataluna-confirma-que-cada-vez-se-expanden-rapido)
- [Tritó del Montseny (Gencat)](https://mediambient.gencat.cat/ca/05_ambits_dactuacio/patrimoni_natural/fauna-autoctona-protegida/gestio-especies-protegides-amenacades/amfibis/trito_montseny/) · [Montseny brook newt (Wikipedia)](https://en.wikipedia.org/wiki/Montseny_brook_newt)
- [439 cabras salvajes en Montserrat (Govern.cat)](https://govern.cat/salapremsa/notes-premsa/679562/poblacio-cabres-salvatges-montserrat-sestima-439-exemplars) · [Cabra salvatge (Medi natural del Bages)](https://elmedinaturaldelbages.cat/species/cabra-salvatge-capra-pyrenaica-hispanica/)
- [Tortugas mediterráneas en el Garraf (Diba)](https://parcs.diba.cat/en/web/l-informatiu/-/garraf-es-reintrodueixen-mes-de-600-tortugues-mediterranies-testudo-hermanni-al-parc-del-garraf) · [Tortuga mediterrània (Gencat)](https://mediambient.gencat.cat/ca/05_ambits_dactuacio/patrimoni_natural/fauna-autoctona-protegida/gestio-especies-protegides-amenacades/reptils/tortuga_mediterrania/)
- [Flora de Montserrat (Patronat)](https://muntanyamontserrat.gencat.cat/ca/el_parc/natura/flora/) · [Orella d'ós (Viquipèdia)](https://ca.wikipedia.org/wiki/Orella_d'%C3%B3s) · [Flora i vegetació del Montseny (Diba)](https://parcs.diba.cat/en/web/montseny/flora-i-vegetacio)
- [Flora y fauna de Collserola (ADDA)](https://www.addarevista.org/article/conservacionismo/54/flora-y-fauna-en-collserola-barcelona/) · [250 vertebrats a Collserola](https://diarieljardi.cat/la-fauna-de-collserola-250-especies-vertebrats-a-tocar-barcelona/)
- [La Carxofa Prat](https://www.elprat.cat/turisme/gastronomia-i-producte-local/la-carxofa-prat) · [El Pota Blava](https://www.elprat.cat/turisme/gastronomia-i-producte-local/el-pota-blava)
- [Mitologia catalana (Viquipèdia)](https://ca.wikipedia.org/wiki/Mitologia_catalana) · [Llista de personatges de la mitologia catalana](https://ca.wikipedia.org/wiki/Llista_de_personatges_de_la_mitologia_catalana) · [Simiot](https://ca.wikipedia.org/wiki/Simiot) · [Contes de minairons (RodaMots)](https://rodamots.cat/escreix/pep-coll-cinc-contes-breus-de-minairons/) · [Home dels nassos](https://en.wikipedia.org/wiki/Home_dels_nassos) · [Centre d'Estudis Mitològics de Catalunya](https://www.mitologicat.org/2018/01/personatges-de-mitologia-catalana.html)

La fenología, las camadas y la ecología trófica de las especies comunes proceden de conocimiento naturalista general y no se han verificado una a una. Son adecuadas para un juego, pero no como referencia científica.
