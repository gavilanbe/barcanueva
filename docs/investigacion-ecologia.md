# Barcanueva: ecología real de Barcelona y su entorno

Investigación para el RPG/simulador de vida pixel art de **Barcanueva**, ciudad de fantasía inspirada en Barcelona en una época premoderna. Recoge fauna, flora y hongos reales de Barcelona y su entorno (Collserola, Montseny, Montserrat, Garraf, llano y delta del Llobregat, Besòs) tal como pudieron ser en la Edad Media y la época moderna, con las especies actuales como referencia. Añade criaturas del folklore catalán con una ecología inventada pero coherente, y una propuesta de modelo de simulación.

Datos para el juego: `docs/especies.json` (160 entradas: 81 animales, 60 plantas, 6 hongos y 13 criaturas fantásticas). El JSON y estas tablas salen del mismo generador, así que no pueden contradecirse. En la red trófica, cada enlace «A come B» aparece también como «B lo caza A».

## Convenciones

- **Actividad**: franjas del juego `manana`, `dia`, `tarde`, `crepusculo`, `noche`. Crepuscular equivale a `crepusculo` más los bordes de `manana`.
- **Reproducción**: `alta` = varias camadas o puestas grandes al año (conejo, ratón, sardina); `media` = una puesta anual moderada; `baja` = una cría al año o menos, madurez tardía (lobo, oso, cabra montés, foca monje).
- **Reservas genéricas (`g:`)**: recursos tróficos agregados que no se modelan como especie (el juego los trata como «pasto» con capacidad propia):
  - `g:insectos` — insectos
  - `g:lombrices` — lombrices
  - `g:semillas` — semillas
  - `g:frutos` — frutos silvestres
  - `g:hierba` — hierba
  - `g:hojas` — hojas y brotes
  - `g:raices` — raíces y bulbos
  - `g:carrona` — carroña
  - `g:basura` — basura/desperdicios
  - `g:plancton` — plancton
  - `g:algas` — algas
  - `g:peces_pequenos` — peces pequeños
  - `g:invertebrados_acuaticos` — invertebrados acuáticos
  - `g:nectar` — néctar
  - `g:huevos` — huevos
  - `g:huesos` — huesos
  - `g:ganado` — ganado (ovejas, cabras)
  - `g:medusas` — medusas
  - `g:suenos` — sueños de los durmientes
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

#### Fauna

| Especie (cast. / cat. / científico) | Rol | Come | Lo cazan | Actividad | Cría (estación · camada) | Repr. | Conducta | Recurso | Estado histórico · folklore |
|---|---|---|---|---|---|---|---|---|---|
| **Rata negra** / Rata negra / *Rattus rattus* | omnívoro | basura/desperdicios, semillas, Trigo, insectos | Lechuza común, Garduña, Gato doméstico / callejero, Gineta, Azor, Gaviota patiamarilla, Búho real | Crepúsculo, Noche | todo el año (pico primavera-otoño) · 5-8 crías, 3-5 camadas/año | alta | colonial, huidiza; invade graneros y barcos | ninguno (plaga); cebo | Llegó con el comercio romano; reina de puertos y graneros medievales hasta que la rata parda (s. XVIII) la desplazó. *Folklore:* Portadora de la pulga de la Pesta Negra de 1348 en Barcelona. |
| **Ratón casero** / Ratolí domèstic / *Mus musculus* | omnívoro | semillas, Trigo, basura/desperdicios, insectos | Lechuza común, Gato doméstico / callejero, Cernícalo vulgar, Garduña, Culebra bastarda | Crepúsculo, Noche | todo el año · 4-8 crías, 5-8 camadas/año | alta | esquivo, vive en muros y despensas | cebo | Común en toda casa y masía. |
| **Gorrión común** / Pardal / *Passer domesticus* | granívoro | semillas, Trigo, insectos | Gato doméstico / callejero, Cernícalo vulgar, Azor, Lechuza común, Gineta, Cárabo, Halcón peregrino | Mañana, Día, Tarde | marzo-agosto · 3-5 huevos, 2-3 puestas | alta | gregario, ruidoso, oportunista | pluma pequeña | Siempre ligado al humano; roba grano en eras y mercados. *Folklore:* Refranes sobre el pardal como ladrón de grano. |
| **Paloma bravía / zurita** / Colom roquer / *Columba livia* | granívoro | semillas, Trigo | Halcón peregrino, Azor, Gato doméstico / callejero, Garduña, Águila perdicera | Mañana, Día, Tarde | todo el año · 2 huevos, 3-5 puestas | alta | bandadas; anida en cornisas y acantilados | carne, pluma, palomina (abono), mensajería | Silvestre en roquedos del Garraf; palomares en masías y torres de la ciudad. |
| **Vencejo común** / Falciot / *Apus apus* | insectívoro aéreo | insectos | Halcón peregrino | Mañana, Día, Tarde, Crepúsculo | mayo-julio (migrador, abril-agosto) · 2-3 huevos, 1 puesta | baja | pasa la vida volando; chilla en bandadas al atardecer | ninguno (augurio de verano) | Migrador estival que anida bajo tejas y en murallas; símbolo del verano barcelonés. |
| **Golondrina común** / Oreneta / *Hirundo rustica* | insectívoro aéreo | insectos | Cernícalo vulgar, Gato doméstico / callejero | Mañana, Día, Tarde | abril-agosto (migradora) · 4-5 huevos, 2 puestas | media | anida en establos y porches; vuelo rasante | ninguno (buena suerte) | Estival; nidos de barro en cuadras de masías. *Folklore:* Traer mala suerte destruir su nido; anuncia la primavera. |
| **Murciélago enano** / Pipistrel·la comuna / *Pipistrellus pipistrellus* | insectívoro | insectos | Lechuza común, Cárabo, Garduña, Gato doméstico / callejero | Crepúsculo, Noche | junio-julio (hiberna en invierno) · 1-2 crías, 1 parto/año | baja | colonias en grietas y desvanes; hiberna | guano (abono, salitre), ala de murciélago (alquimia) | Muy común en la ciudad y el campo. *Folklore:* Ingrediente de brebajes de bruja; se clavaban en puertas contra el mal. |
| **Lechuza común** / Òliba / *Tyto alba* | depredador | Rata negra, Ratón casero, Topillo mediterráneo, Ratón de campo, Murciélago enano, Gorrión común, Salamanquesa común | Azor, Cárabo | Crepúsculo, Noche | marzo-julio (a veces 2 ciclos) · 4-7 huevos | media | solitaria, silenciosa, anida en campanarios y masías | pluma, egagrópilas (alquimia) | Común en campanarios y masías; en años de topillos cría dos veces. *Folklore:* Se la acusaba de beber el aceite de las lámparas de las iglesias; ave de mal agüero. |
| **Salamanquesa común** / Dragó comú / *Tarentola mauritanica* | insectívoro | insectos | Gato doméstico / callejero, Lechuza común, Gineta | Crepúsculo, Noche | abril-julio · 1-2 huevos, 2-3 puestas | media | trepa muros; caza junto a lámparas | piel (alquimia menor) | Abundante en muros viejos y casas. *Folklore:* En catalán «dragó»: se decía que su mordisco era venenoso (falso). |
| **Gato doméstico / callejero** / Gat / *Felis catus* | depredador | Rata negra, Ratón casero, Gorrión común, Salamanquesa común, Murciélago enano, Golondrina común, Paloma bravía / zurita | Lobo, Zorro | Crepúsculo, Noche | primavera-verano · 3-5 crías, 2 camadas/año | alta | solitario, territorial | ninguno (control de plagas) | Guardián de graneros; controla ratas. *Folklore:* Asociado a brujas; quemas de gatos en fiestas medievales. |

*También presentes (ficha en su bioma principal):* Gaviota patiamarilla, Cernícalo vulgar, Zorro, Garduña, Cárabo, Erizo europeo, Mochuelo, Abeja melífera, Halcón peregrino, Lagartija ibérica.

#### Flora y hongos

| Especie (cast. / cat. / científico) | Tipo · rol | Fenología / cosecha | Lo comen | Recurso | Estado · folklore |
|---|---|---|---|---|---|
| **Higuera** / Figuera / *Ficus carica* | planta · productor (fruto) | floración verano, higos julio-septiembre | — | higos, látex (verrugas), hojas | Presente en todo patio y masía. *Folklore:* Bajo la higuera se aparecen brujas la noche de San Juan. |
| **Naranjo amargo** / Taronger agre / *Citrus × aurantium* | planta · productor | flor (azahar) abril | — | naranjas amargas, azahar (agua de azahar), aceite esencial | Introducido por los andalusíes; decoraba patios (Pati dels Tarongers del Palau de la Generalitat). |
| **Parietaria** / Morella roquera / *Parietaria judaica* | planta · productor ruderal | florece casi todo el año | — | medicinal (diurética), alérgena | Crece en todos los muros de la ciudad. |
| **Malva** / Malva / *Malva sylvestris* | planta · productor ruderal | primavera-otoño | — | medicinal (emoliente), comestible | Omnipresente en caminos y solares. *Folklore:* Remedio para todo: «malva, de todos males salva». |
| **Ortiga** / Ortiga / *Urtica dioica* | planta · productor ruderal | primavera-verano | — | fibra textil, sopa, tinte verde, medicinal | Indica suelos ricos (estercoleros, corrales). *Folklore:* Contra el reuma se azotaba con ortigas. |
| **Alcaparra** / Tàpera / *Capparis spinosa* | planta · productor rupícola | flor verano | — | alcaparras (encurtido), medicinal | Crece en murallas y acantilados. |
| **Ruda** / Ruda / *Ruta graveolens* | planta · productor aromático | flor verano | — | ingrediente alquímico, abortiva y tóxica, repelente | Cultivada en huertos de boticario y masías. *Folklore:* Hierba contra el mal de ojo y las brujas; entra en la «ratafía». |
| **Salvia** / Sàlvia / *Salvia officinalis* | planta · productor aromático | flor mayo-junio | — | medicinal (garganta, digestión), condimento | Cultivada en jardines monásticos. *Folklore:* «Qui té sàlvia a l'hort, no li cal metge». |
| **Mandrágora** / Mandràgora / *Mandragora autumnalis* | planta · productor (raro) | flor otoño, fruto invierno | — | ingrediente alquímico mayor (narcótico, anestésico) | No es silvestre en el entorno de Barcelona: vendida por boticarios o cultivada en secreto. Rareza. *Folklore:* Raíz con forma humana que grita al arrancarla; se arrancaba con un perro. |
| **Beleño negro** / Jusquiam negre / *Hyoscyamus niger* | planta · productor ruderal | flor verano | — | veneno, ingrediente alquímico (visiones, ungüento de bruja) | Ruderal junto a corrales y estercoleros. *Folklore:* Base de los «ungüentos de vuelo» de las brujas. |

*También presentes:* Hiedra, Hinojo, Ajenjo.


## 2. Bosque: encinar y robledal (Collserola, Montnegre, umbrías del Montseny)

Encinar con madroño, durillo y rusco. En las umbrías, robledal. La bellota es el recurso clave de otoño e invierno y mueve a jabalíes, arrendajos y ardillas. Las setas de otoño (rovellón, ceps) son el gran acontecimiento de temporada.

#### Fauna

| Especie (cast. / cat. / científico) | Rol | Come | Lo cazan | Actividad | Cría (estación · camada) | Repr. | Conducta | Recurso | Estado histórico · folklore |
|---|---|---|---|---|---|---|---|---|---|
| **Jabalí** / Senglar / *Sus scrofa* | omnívoro | Encina, Roble pubescente, raíces y bulbos, lombrices, Ratón de campo, Trigo, Vid, Alcachofa del Prat, Rovellón, carroña, Tortuga mediterránea | Lobo, Oso pardo, Lince (llop cerval) | Crepúsculo, Noche | enero-mayo · 4-6 rayones, 1 camada/año | alta | piaras de hembras; machos solitarios; embiste si se le acorrala | carne, piel, cerdas, colmillos | Presente siempre; hoy sobreabundante en Collserola por falta de depredadores y caza. *Folklore:* Caza nobiliaria; las cerdas se usaban para pinceles y cepillos. |
| **Lobo** / Llop / *Canis lupus* | superdepredador | Corzo, Ciervo, Jabalí, Conejo, Liebre ibérica, Cabra montés, ganado (ovejas, cabras), Gato doméstico / callejero, Zorro, Tejón, Lince (llop cerval), Castor europeo | — | Crepúsculo, Noche | abril-junio · 4-7 lobeznos, 1 camada/año | baja | manada jerárquica; territorial; ataca ganado; evita al humano | piel, colmillos, grasa (ungüento) | Común en la Edad Media; en el Montseny aún había en 1915, en Montnegre hacia 1900; último en Catalunya en 1935 (Ports). Regresó al Cadí en 2000-2004. *Folklore:* Se pagaban recompensas municipales por cabeza de lobo; «llop» es el coco de los cuentos. |
| **Corzo** / Cabirol / *Capreolus capreolus* | herbívoro ramoneador | Roble pubescente, hojas y brotes, hierba, frutos silvestres | Lobo, Lince (llop cerval), Oso pardo, Águila real, Zorro | Mañana, Tarde, Crepúsculo | parto mayo-junio (celo julio-agosto) · 1-2 gabatos | media | solitario o en grupos pequeños; huye saltando; ladra | carne, piel, cuerna | Extinguido en gran parte de Catalunya en el s. XX; hoy en expansión. |
| **Zorro** / Guineu / *Vulpes vulpes* | omnívoro oportunista | Conejo, Ratón de campo, Topillo mediterráneo, insectos, frutos silvestres, Perdiz roja, Pollo del Prat (Pota Blava), carroña, basura/desperdicios, Gato doméstico / callejero, Corzo, Liebre ibérica, Codorniz, Erizo europeo, Lagarto ocelado, Mochuelo, Ánade real, Tortuga mediterránea | Lobo, Lince (llop cerval), Águila real | Crepúsculo, Noche | marzo-mayo · 4-6 zorreznos | media | solitario, astuto; asalta gallineros | piel (muy apreciada), cola | Siempre presente; enemigo del gallinero. *Folklore:* Personaje astuto de rondallas; se le colgaba muerto en las puertas de las masías. |
| **Tejón** / Toixó / *Meles meles* | omnívoro | lombrices, raíces y bulbos, frutos silvestres, Vid, insectos, Ratón de campo, Salamandra común, Erizo europeo, Tortuga mediterránea | Lobo | Crepúsculo, Noche | parto febrero-marzo · 2-3 crías | baja | familias en tejoneras; tozudo, muerde si se le acorrala | piel, pelo (brochas), grasa (ungüento antirreumático) | Común en Collserola, Montseny y el llano. *Folklore:* La grasa de tejón como remedio para el reuma. |
| **Gineta** / Geneta / *Genetta genetta* | depredador | Ratón de campo, Lirón careto, Ardilla roja, Gorrión común, Rata negra, frutos silvestres, Salamanquesa común | Lince (llop cerval), Águila real, Cárabo | Noche | primavera (a veces otoño) · 2-3 crías | media | solitaria, arborícola, letrinas fijas | piel moteada | Introducida desde el norte de África probablemente en época antigua o árabe; hoy común en Collserola. *Folklore:* En la Edad Media se tenía como «gato» para cazar ratones. |
| **Garduña** / Fagina / *Martes foina* | depredador omnívoro | Ratón de campo, Rata negra, Ardilla roja, Paloma bravía / zurita, Murciélago enano, frutos silvestres, Pollo del Prat (Pota Blava), Ratón casero, Lirón careto, Arrendajo, Conejo, Perdiz roja, Lagarto ocelado | Lince (llop cerval), Águila real, Cárabo | Noche | parto marzo-abril · 2-4 crías | media | solitaria, trepa, entra en graneros y gallineros | piel | Común en bosques y pueblos. *Folklore:* Enemiga de gallineros, como el zorro. |
| **Ardilla roja** / Esquirol / *Sciurus vulgaris* | granívoro / frugívoro | Pino carrasco, Pino silvestre, Encina, Roble pubescente, Haya, frutos silvestres, Rovellón | Azor, Gineta, Garduña, Águila real, Lince (llop cerval) | Mañana, Día, Tarde | febrero-agosto · 3-4 crías, 1-2 camadas | media | arborícola, solitaria; entierra piñones | piel (menor), cola | Muy ligada a los pinares de Collserola. |
| **Lirón careto** / Rata cellarda / *Eliomys quercinus* | omnívoro | insectos, frutos silvestres, semillas, huevos | Gineta, Garduña, Cárabo | Noche | mayo-julio · 4-6 crías | media | hiberna octubre-abril; trepa; se esconde en huecos y masías | ninguno | Frecuente en bosques y pedregales; entra en masías en invierno. |
| **Ratón de campo** / Ratolí de bosc / *Apodemus sylvaticus* | granívoro | semillas, Encina, frutos silvestres, insectos | Cárabo, Lechuza común, Gineta, Garduña, Zorro, Culebra bastarda, Víbora áspid, Azor, Jabalí, Tejón | Crepúsculo, Noche | febrero-noviembre · 4-7 crías, varias camadas | alta | huidizo; base de la red trófica del bosque | cebo | Muy abundante; base alimentaria de rapaces nocturnas y carnívoros. |
| **Azor** / Astor / *Accipiter gentilis* | depredador | Paloma bravía / zurita, Ardilla roja, Gorrión común, Perdiz roja, Conejo, Arrendajo, Rata negra, Lechuza común, Cernícalo vulgar, Ratón de campo, Codorniz, Abubilla, Pollo del Prat (Pota Blava), Martín pescador, Ánade real | Águila real | Mañana, Día, Tarde | marzo-julio · 3-4 huevos | baja | solitario, emboscador | pluma, cetrería | Rapaz forestal. *Folklore:* Ave de cetrería noble por excelencia. |
| **Cárabo** / Gamarús / *Strix aluco* | depredador | Ratón de campo, Lirón careto, Topillo mediterráneo, Gorrión común, Murciélago enano, Rana común, Lechuza común, Gineta, Garduña | Águila real, Búho real | Crepúsculo, Noche | febrero-junio · 2-4 huevos | media | territorial, ulula en otoño | pluma | La rapaz nocturna más común del bosque. *Folklore:* Su canto nocturno anunciaba muerte. |
| **Arrendajo** / Gaig / *Garrulus glandarius* | omnívoro (dispersor de bellotas) | Encina, Roble pubescente, insectos, huevos | Azor, Águila real, Garduña | Mañana, Día, Tarde | abril-junio · 4-6 huevos | media | ruidoso, imita sonidos; entierra bellotas (planta robledales) | pluma azul (adorno) | Común; «plantador» de encinas. |
| **Salamandra común** / Salamandra / *Salamandra salamandra* | insectívoro | lombrices, insectos | Culebra viperina, Tejón | Crepúsculo, Noche | parto en otoño-primavera (vivípara en arroyos) · 20-40 larvas | media | lenta, sale tras la lluvia; piel tóxica | veneno cutáneo (alquimia) | En hayedos y arroyos del Montseny y Collserola húmeda. *Folklore:* Se creía que vivía en el fuego y era inmune a él. |

*También presentes (ficha en su bioma principal):* Murciélago enano, Conejo, Erizo europeo, Culebra bastarda, Abeja melífera, Ciervo, Oso pardo, Lince (llop cerval), Águila real, Búho real, Víbora áspid.

#### Flora y hongos

| Especie (cast. / cat. / científico) | Tipo · rol | Fenología / cosecha | Lo comen | Recurso | Estado · folklore |
|---|---|---|---|---|---|
| **Hiedra** / Heura / *Hedera helix* | planta · productor trepador | flor otoño, fruto invierno | — | medicinal externa, frutos tóxicos, alimento invernal de aves | Cubre murallas y troncos de bosque. |
| **Encina** / Alzina / *Quercus ilex* | planta · productor dominante | flor abril-mayo, bellotas octubre-diciembre | Jabalí, Ardilla roja, Ratón de campo, Arrendajo, Cabra montés, Oso pardo | bellotas (alimento, harina), madera, carbón, corteza (curtidos) | El árbol clímax del litoral catalán; carbón vegetal para la ciudad. *Folklore:* Árbol protector frente al rayo. |
| **Roble pubescente** / Roure martinenc / *Quercus pubescens* | planta · productor | flor abril, bellotas otoño | Jabalí, Corzo, Ardilla roja, Arrendajo, Ciervo | madera de construcción, bellotas, agallas (tinta) | Robledales en umbrías de Collserola y Montseny. |
| **Madroño** / Arboç / *Arbutus unedo* | planta · productor (fruto invernal) | flor y fruto a la vez, octubre-diciembre | — | madroños (fermentan: ligeramente embriagadores), taninos | Sotobosque del encinar de Collserola. *Folklore:* «Unedo» = «como solo uno», porque atonta comer muchos. |
| **Pino carrasco** / Pi blanc / *Pinus halepensis* | planta · productor pionero | flor marzo-abril, piñas 2 años | Ardilla roja | resina, pez (calafatear barcos), madera, leña | Dominante hoy en Collserola y el Garraf; en la Edad Media menos extendido que el encinar. |
| **Durillo** / Marfull / *Viburnum tinus* | planta · productor de sotobosque | flor invierno, bayas azules | — | bayas tóxicas, tinte | Común en el encinar. |
| **Brezo arbóreo** / Bruc / *Erica arborea* | planta · productor | flor marzo-mayo | — | raíz (cepas para pipas), escobas, miel de brezo | En suelos ácidos de Collserola y Montseny. |
| **Rusco** / Galzeran / *Ruscus aculeatus* | planta · productor de sotobosque | flor invierno, bayas rojas | — | brotes comestibles, medicinal (venas), decoración navideña | Sotobosque de encinar y robledal. *Folklore:* Adorno navideño tradicional. |
| **Muérdago** / Vesc / *Viscum album* | planta · parásito | flor febrero-marzo, bayas invierno | — | ingrediente alquímico, liga para cazar pájaros (vesc), medicinal | Sobre pinos y árboles de ribera. *Folklore:* Planta sagrada de druidas; su liga («vesc») atrapaba pájaros. |
| **Rovellón** / Rovelló / *Lactarius sanguifluus / L. deliciosus* | hongo · descomponedor micorrícico (pino) | fructifica septiembre-noviembre tras lluvias | Jabalí, Ardilla roja | comida muy apreciada | La seta reina de Catalunya, ligada a pinares. *Folklore:* Salidas multitudinarias «a buscar bolets» en otoño. |
| **Ceps / boleto** / Cep / *Boletus edulis / B. aereus* | hongo · descomponedor micorrícico (roble, haya, encina) | agosto-noviembre | — | comida, desecado | En robledales, hayedos y encinares del Montseny. |
| **Oronja** / Ou de reig / *Amanita caesarea* | hongo · micorrícico (encina, roble) | verano-otoño cálido | — | comida de reyes | En encinares y alcornocales; muy buscada. *Folklore:* «Huevo de rey»: seta de los césares. |
| **Oronja verde** / Farinera borda / *Amanita phalloides* | hongo · micorrícico | otoño | — | veneno mortal | Presente en robledales y encinares. *Folklore:* Causa de la mayoría de muertes por setas. |
| **Trufa negra** / Tòfona negra / *Tuber melanosporum* | hongo · micorrícico (encina, roble) | maduración diciembre-febrero | — | comida de lujo | En encinares calcáreos del interior; se buscaba con cerdos o perros. |

*También presentes:* Ortiga, Hipérico, Boj, Belladona, Romero, Lentisco.


## 3. Pradera: llano del Llobregat, campos y masías

Trigales, viñas, olivares, almendros y huerta, con masías y eras. Es un mosaico agrícola donde el conejo es la presa base de todo el sistema. Los topillos y los jabalíes son plagas de cultivo, y las abejas polinizan almendros y huerta.

#### Fauna

| Especie (cast. / cat. / científico) | Rol | Come | Lo cazan | Actividad | Cría (estación · camada) | Repr. | Conducta | Recurso | Estado histórico · folklore |
|---|---|---|---|---|---|---|---|---|---|
| **Cernícalo vulgar** / Xoriguer comú / *Falco tinnunculus* | depredador | Topillo mediterráneo, Ratón casero, Lagartija ibérica, insectos, Gorrión común, Golondrina común, Codorniz, Abubilla | Azor, Águila real | Mañana, Día, Tarde | abril-junio · 4-6 huevos | media | se cierne en el aire; anida en torres y cortados | pluma (cetrería menor) | Frecuente en campos y torres. *Folklore:* Usado en cetrería de aprendices. |
| **Conejo** / Conill / *Oryctolagus cuniculus* | herbívoro | hierba, Trigo, Alcachofa del Prat, Vid | Lobo, Lince (llop cerval), Zorro, Águila real, Águila perdicera, Azor, Garduña, Búho real | Crepúsculo, Noche, Mañana | febrero-junio (casi todo el año) · 3-6 gazapos, 3-5 camadas | alta | colonial en madrigueras; huye | carne, piel | Especie base del bosque mediterráneo; Hispania «tierra de conejos». *Folklore:* Hispania se ha interpretado como «tierra de conejos» (etimología discutida). |
| **Liebre ibérica** / Llebre / *Lepus granatensis* | herbívoro | hierba, Trigo | Lobo, Lince (llop cerval), Zorro, Águila real | Crepúsculo, Noche, Mañana | todo el año (pico primavera) · 1-4 lebratos, 3-4 partos | alta | solitaria; huye en zigzag | carne, piel | Común en campos abiertos del llano. |
| **Perdiz roja** / Perdiu roja / *Alectoris rufa* | granívoro / herbívoro | semillas, Trigo, insectos | Zorro, Azor, Águila perdicera, Garduña, Culebra bastarda, Lince (llop cerval), Águila real | Mañana, Tarde | abril-junio · 10-16 huevos | alta | bandos (colles) en invierno; corre antes que volar | carne, pluma | Caza menor tradicional. |
| **Codorniz** / Guatlla / *Coturnix coturnix* | granívoro | semillas, Trigo, insectos | Zorro, Cernícalo vulgar, Azor | Mañana, Crepúsculo | mayo-julio (migradora estival) · 8-12 huevos | alta | escondida en el trigo; canto «pal-pal-pà» | carne, huevos | Estival en trigales y prados del Llobregat. |
| **Erizo europeo** / Eriçó / *Erinaceus europaeus* | insectívoro | insectos, lombrices, huevos, Culebra bastarda | Tejón, Zorro, Búho real | Crepúsculo, Noche | mayo-septiembre · 3-6 crías | media | solitario, se hace bola; hiberna | púas, carne (se comía) | Común en huertas y bordes de bosque. *Folklore:* Se decía que ordeñaba a las cabras de noche. |
| **Topillo mediterráneo** / Talpó comú / *Microtus duodecimcostatus* | herbívoro (raíces) | raíces y bulbos, Alcachofa del Prat, Trigo | Lechuza común, Cernícalo vulgar, Zorro, Culebra bastarda, Cárabo, Mochuelo, Garza real | Crepúsculo, Noche, Día | todo el año · 2-4 crías, varias camadas | alta | excavador; ciclos de plaga | ninguno (plaga de huertos) | Plaga clásica de la huerta del Llobregat. |
| **Culebra bastarda** / Serp verda / *Malpolon monspessulanus* | depredador | Ratón de campo, Ratón casero, Lagartija ibérica, Topillo mediterráneo, Perdiz roja, Lagarto ocelado | Águila real, Búho real, Erizo europeo | Mañana, Día, Tarde | junio-julio · 4-15 huevos | media | rápida, se yergue y bufa; veneno débil (colmillos traseros) | piel (muda), carne | La serpiente grande del llano mediterráneo. *Folklore:* Se decía que mamaba de las vacas. |
| **Lagarto ocelado** / Llangardaix / *Timon lepidus* | insectívoro / omnívoro | insectos, frutos silvestres, Lagartija ibérica, Abeja melífera | Águila real, Culebra bastarda, Zorro, Garduña, Águila perdicera | Día | mayo-julio · 8-20 huevos | media | territorial al sol; muerde fuerte | carne (se comía), piel | Todavía presente en zonas secas; muy perseguido. *Folklore:* En catalán «llangardaix»; su grasa servía de remedio. |
| **Mochuelo** / Mussol comú / *Athene noctua* | depredador menor | insectos, Topillo mediterráneo, Lagartija ibérica | Búho real, Zorro | Crepúsculo, Tarde | abril-junio · 3-5 huevos | media | posa en tapias y postes; cabecea | pluma | Típico de masías, olivares y tapias. *Folklore:* Símbolo de Atenea; en masías se tenía por ave de mal agüero. |
| **Abubilla** / Puput / *Upupa epops* | insectívoro | insectos, lombrices | Azor, Cernícalo vulgar | Mañana, Día | abril-junio · 5-8 huevos | media | hace «pu-pu-pu»; nido maloliente | pluma | Estival en campos y olivares. *Folklore:* El mal olor del nido la hacía símbolo de suciedad; en recetas mágicas árabes y medievales. |
| **Abeja melífera** / Abella / *Apis mellifera* | polinizador | néctar, Romero, Tomillo, Almendro | Abejaruco, Lagarto ocelado, Oso pardo | Mañana, Día | primavera (enjambrazón abril-junio) · enjambre (miles) | alta | colmena; pica si se la ataca | miel, cera, propóleo, jalea, veneno | Apicultura en arnas (colmenas de corcho) tradicional en Catalunya. *Folklore:* Se «avisaba» a las abejas de la muerte del amo de la casa. |
| **Abejaruco** / Abellerol / *Merops apiaster* | insectívoro aéreo | Abeja melífera, insectos | Halcón peregrino | Mañana, Día, Tarde | mayo-julio (migrador) · 4-7 huevos | media | colonias en taludes arenosos; muy colorido | pluma iridiscente | Estival en taludes del Llobregat. *Folklore:* Enemigo de los apicultores. |
| **Pollo del Prat (Pota Blava)** / Pollastre del Prat / Pota Blava / *Gallus gallus domesticus (raza Prat)* | doméstico omnívoro | semillas, Trigo, insectos | Zorro, Garduña, Azor | Mañana, Día, Tarde | primavera · 10-15 huevos (clueca) | alta | gallinero; huye | carne, huevos, pluma | Raza rústica seleccionada a fines del s. XIX en el Prat; IGP desde 1996. En un mundo premoderno, gallinas rústicas «del Prat». *Folklore:* Capón del Prat en Navidad. |

*También presentes (ficha en su bioma principal):* Ratón casero, Gorrión común, Golondrina común, Murciélago enano, Lechuza común, Gato doméstico / callejero, Jabalí, Lobo, Zorro, Tejón, Ratón de campo, Lagartija ibérica, Rana común, Ánade real, Tortuga mediterránea.

#### Flora y hongos

| Especie (cast. / cat. / científico) | Tipo · rol | Fenología / cosecha | Lo comen | Recurso | Estado · folklore |
|---|---|---|---|---|---|
| **Trigo** / Blat / *Triticum aestivum* | planta · cultivo | siembra oct-nov, siega junio | Rata negra, Ratón casero, Gorrión común, Paloma bravía / zurita, Jabalí, Conejo, Liebre ibérica, Perdiz roja, Codorniz, Topillo mediterráneo, Pollo del Prat (Pota Blava), Ciervo | grano, harina, paja | Cereal base del llano del Llobregat y el Vallès. *Folklore:* Siega con fiestas de Sant Joan y Sant Pere. |
| **Cebada** / Ordi / *Hordeum vulgare* | planta · cultivo | siembra otoño, siega mayo-junio | — | grano (pienso, cerveza), paja | Cultivo de secano complementario al trigo. |
| **Vid** / Vinya / *Vitis vinifera* | planta · cultivo | brotación abril, vendimia septiembre | Jabalí, Tejón, Conejo | uva, vino, vinagre, sarmientos | Viñedos del Penedès, Alella y Maresme desde época romana (vino layetano). *Folklore:* Vendimia con fiestas; vino layetano exportado a Roma. |
| **Olivo** / Olivera / *Olea europaea* | planta · cultivo | flor mayo, cosecha noviembre-enero | — | aceitunas, aceite (luz, comida, ungüentos), madera | Olivares en secanos del Garraf, Penedès y Bages. *Folklore:* Ramo de olivo el Domingo de Ramos; aceite para lámparas. |
| **Alcachofa del Prat** / Carxofa del Prat / *Cynara cardunculus var. scolymus* | planta · cultivo de huerta | plantación verano, cosecha noviembre-abril | Jabalí, Conejo, Topillo mediterráneo | alcachofa, medicinal (hígado) | Huerta del delta del Llobregat; cultivo del s. XX (ahora IGP). Para una época premoderna, mejor cardo o alcachofa «de huerta nueva». |
| **Almendro** / Ametller / *Prunus dulcis* | planta · cultivo | flor enero-febrero, cosecha agosto-septiembre | Abeja melífera | almendras, flor (néctar temprano) | Secanos del litoral; primera flor del año para las abejas. |
| **Hinojo** / Fonoll / *Foeniculum vulgare* | planta · productor ruderal aromático | flor verano | — | condimento, medicinal (digestivo), aromatizar aceitunas | Borde de caminos del llano. |
| **Amapola** / Rosella / *Papaver rhoeas* | planta · productor arvense | flor abril-junio | — | jarabe sedante suave, tinte rojo | Mala hierba de trigales. |
| **Manzanilla** / Camamilla / *Matricaria chamomilla* | planta · productor arvense | flor abril-julio | — | infusión digestiva, calmante | En campos y eras. |
| **Hipérico** / Herba de Sant Joan / pericó / *Hypericum perforatum* | planta · productor | flor junio (se recoge la noche de San Juan) | — | aceite rojo de hipérico (heridas, quemaduras), antidepresivo, ingrediente alquímico | Común en prados y bordes de bosque. *Folklore:* Se recoge al amanecer de San Juan: ahuyenta demonios («fuga daemonum»). |
| **Champiñón silvestre** / Camperol / *Agaricus campestris* | hongo · descomponedor | primavera y otoño tras lluvias | — | comida | En prados pastoreados. |

*También presentes:* Higuera, Malva, Ortiga, Ruda, Beleño negro, Encina, Pino carrasco, Algarrobo, Romero, Tomillo.


## 4. Montaña: Montseny y Montserrat (pinares, hayedos, abetales, roquedos)

Hayedos y abetales relictos en el Montseny, y conglomerado, cingles y matorral aromático en Montserrat. Aquí se refugian los grandes mamíferos que la llanura perdió primero (oso, lobo, lince, cabra montés) y las rapaces de roquedo.

#### Fauna

| Especie (cast. / cat. / científico) | Rol | Come | Lo cazan | Actividad | Cría (estación · camada) | Repr. | Conducta | Recurso | Estado histórico · folklore |
|---|---|---|---|---|---|---|---|---|---|
| **Cabra montés** / Cabra salvatge / *Capra pyrenaica hispanica* | herbívoro | hierba, hojas y brotes, Boj, Encina | Lobo, Lince (llop cerval), Águila real, Oso pardo | Mañana, Tarde, Crepúsculo | parto mayo-junio (celo nov-dic) · 1 (rara vez 2) chivo | baja | rebaños; salta por roquedos; machos embisten en celo | carne, piel, cuernos (trofeo) | Desaparecida de Montserrat; reintroducida en 1995 con ~20 ejemplares de los Ports; hoy ~440. |
| **Ciervo** / Cérvol / *Cervus elaphus* | herbívoro | hierba, hojas y brotes, Roble pubescente, Haya, Trigo | Lobo, Oso pardo, Lince (llop cerval) | Crepúsculo, Mañana, Noche | parto mayo-junio (berrea sept-oct) · 1 cervato | baja | manadas por sexos; berrea; machos embisten en celo | carne, piel, cuerna (cuchillería, alquimia) | Presente en la Edad Media; exterminado en casi toda Catalunya; reintroducido en el s. XX. *Folklore:* Cuerna quemada como remedio y en ritos de caza. |
| **Oso pardo** / Ós bru / *Ursus arctos* | omnívoro | frutos silvestres, Haya, Encina, raíces y bulbos, insectos, Abeja melífera, Jabalí, Corzo, carroña, Cabra montés, Ciervo, Castor europeo | — | Crepúsculo, Mañana, Noche | parto enero-febrero en la osera · 1-3 oseznos cada 2-3 años | baja | solitario; hiberna; peligroso con crías | carne, piel, grasa (ungüento), garras | Presente en montañas catalanas en la Edad Media; desapareció de las sierras prelitorales en época moderna y sobrevive en el Pirineo (reintroducido). *Folklore:* Fiestas del oso en el Pirineo (Prats de Molló); el oso como antepasado salvaje. |
| **Lince (llop cerval)** / Linx / llop cerval / *Lynx sp. (lynx / pardinus)* | depredador | Conejo, Liebre ibérica, Corzo, Cabra montés, Perdiz roja, Ardilla roja, Jabalí, Zorro, Gineta, Garduña, Ciervo | Lobo | Crepúsculo, Noche | parto abril-mayo · 2-3 crías | baja | solitario, esquivo, emboscador | piel (lujo) | Llamado «llop cerval» o «gatillop»; exterminado en los ss. XVIII-XX como alimaña. Especie exacta en Catalunya discutida. *Folklore:* Nombre popular llop cerval = «lobo de los ciervos». |
| **Quebrantahuesos** / Trencalòs / *Gypaetus barbatus* | carroñero (huesos) | carroña, huesos | — | Mañana, Día | puesta dic-feb · 1-2 huevos (sobrevive 1) | baja | solitario; suelta huesos desde el aire para romperlos | pluma (trofeo raro) | Hoy solo en el Pirineo; en sierras prelitorales solo como rareza histórica o visitante. *Folklore:* Se decía que dejaba caer tortugas y huesos sobre las rocas. |
| **Buitre leonado** / Voltor comú / *Gyps fulvus* | carroñero | carroña | — | Día, Tarde | puesta enero-marzo · 1 huevo | baja | colonial en cortados; planea | pluma | Frecuente en sierras catalanas hasta el s. XIX; hoy recupera los Prepirineos. |
| **Águila real** / Àliga daurada / *Aquila chrysaetos* | superdepredador | Conejo, Liebre ibérica, Ardilla roja, Perdiz roja, Corzo, Cabra montés, Zorro, carroña, Cernícalo vulgar, Gineta, Garduña, Azor, Cárabo, Arrendajo, Culebra bastarda, Lagarto ocelado, Halcón peregrino, Víbora áspid, Chova piquirroja, Tortuga mediterránea | — | Día, Tarde | puesta febrero-abril · 1-2 huevos | baja | parejas territoriales de por vida | pluma (penacho noble) | Presente en Montserrat y Montseny. *Folklore:* Heráldica: el águila de la ciudad (Àliga) en fiestas de Corpus. |
| **Águila perdicera** / Àliga cuabarrada / *Aquila fasciata* | depredador | Conejo, Perdiz roja, Paloma bravía / zurita, Lagarto ocelado, Ánade real | — | Día, Tarde | puesta febrero-marzo · 2 huevos | baja | parejas en cortados; caza al acecho | pluma | Nidificante en Garraf y sierras litorales; hoy amenazada. |
| **Halcón peregrino** / Falcó pelegrí / *Falco peregrinus* | depredador aéreo | Paloma bravía / zurita, Gorrión común, Vencejo común, Abejaruco, Gaviota patiamarilla, Chova piquirroja, Cormorán moñudo | Águila real | Mañana, Día, Tarde | marzo-junio · 3-4 huevos | baja | picado a gran velocidad; anida en cortados (y torres) | pluma, cetrería real | En cortados de Montserrat y Garraf; hoy anida en la Sagrada Família. *Folklore:* Ave de cetrería de reyes. |
| **Búho real** / Duc / *Bubo bubo* | superdepredador nocturno | Conejo, Rata negra, Erizo europeo, Culebra bastarda, Mochuelo, Cárabo | — | Crepúsculo, Noche | puesta enero-marzo · 2-3 huevos | baja | territorial; ulula en invierno | pluma | Presente en roquedos de Garraf, Montserrat y Collserola. *Folklore:* Guardián de la noche; espanto de pastores. |
| **Víbora áspid** / Escurçó pirinenc / *Vipera aspis* | depredador | Ratón de campo, Lagartija ibérica | Águila real | Día, Tarde | parto agosto-septiembre (ovovivípara) · 4-10 crías cada 2-3 años | baja | lenta, muerde si la pisan; veneno | veneno (antídoto, triaca) | Presente en el Montseny y zonas húmedas de montaña. *Folklore:* Se hacía triaca con carne de víbora. |
| **Lagartija ibérica** / Sargantana / *Podarcis liolepis* | insectívoro | insectos | Cernícalo vulgar, Culebra bastarda, Lagarto ocelado, Víbora áspid, Mochuelo | Mañana, Día | abril-julio · 3-6 huevos, 2 puestas | alta | al sol en muros y rocas; pierde la cola | cola (alquimia menor) | Abundantísima en muros y roquedos. |
| **Tritón del Montseny** / Tritó del Montseny / *Calotriton arnoldi* | insectívoro acuático | invertebrados acuáticos | Trucha común | Noche | primavera (marzo-junio) · 30-40 huevos | baja | solitario en arroyos fríos de hayedo (600-1200 m) | ninguno (especie emblemática, no cazable) | Único vertebrado endémico de Catalunya; ~1.500 ejemplares en menos de 3,5 km de arroyo. En peligro crítico. *Folklore:* Criatura «de las fuentes» del Montseny: vínculo con las dones d'aigua. |
| **Chova piquirroja** / Gralla de bec vermell / *Pyrrhocorax pyrrhocorax* | insectívoro | insectos, semillas | Halcón peregrino, Águila real | Mañana, Día, Tarde | abril-junio · 3-5 huevos | media | bandadas acrobáticas en cortados | pluma negra | En cortados de Garraf y Montserrat. |

*También presentes (ficha en su bioma principal):* Paloma bravía / zurita, Vencejo común, Cernícalo vulgar, Jabalí, Lobo, Corzo, Garduña, Ardilla roja, Lirón careto, Ratón de campo, Azor, Cárabo, Arrendajo, Salamandra común, Liebre ibérica, Perdiz roja, Abeja melífera, Barbo de montaña, Trucha común, Cangrejo de río autóctono.

#### Flora y hongos

| Especie (cast. / cat. / científico) | Tipo · rol | Fenología / cosecha | Lo comen | Recurso | Estado · folklore |
|---|---|---|---|---|---|
| **Haya** / Faig / *Fagus sylvatica* | planta · productor dominante (umbría) | flor abril-mayo, hayucos otoño | Ardilla roja, Ciervo, Oso pardo | madera, hayucos, leña | Hayedos del Montseny (Santa Fe), relictos del frío. |
| **Abeto blanco** / Avet / *Abies alba* | planta · productor | flor mayo, piñas otoño | — | madera, resina (trementina), árbol de Navidad | Abetales relictos del Montseny (Passavets, Matagalls): el límite sur de la especie. |
| **Pino silvestre** / Pi roig / *Pinus sylvestris* | planta · productor | flor mayo-junio | Ardilla roja | madera, resina | En zonas altas del Montseny. |
| **Tejo** / Teix / *Taxus baccata* | planta · productor relicto | flor febrero-marzo, arilo rojo otoño | — | madera de arcos, veneno potente (todo menos el arilo) | Ejemplares aislados en el Montseny y Montserrat. *Folklore:* Árbol de la muerte y la eternidad; arcos largos. |
| **Acebo** / Grèvol / *Ilex aquifolium* | planta · productor | flor mayo, bayas invierno | — | bayas tóxicas, ramas navideñas, liga | Sotobosque de hayedos del Montseny. *Folklore:* Protege la casa del rayo. |
| **Boj** / Boix / *Buxus sempervirens* | planta · productor | flor marzo-abril | Cabra montés | madera dura (cucharas, grabados), tóxico | Sotobosque calcáreo de Montserrat. |
| **Belladona** / Belladona / *Atropa belladonna* | planta · productor de claros | flor junio-agosto, bayas negras | — | veneno mortal, ingrediente alquímico (midriasis, visiones) | Claros de hayedo del Montseny. *Folklore:* Las damas se dilataban las pupilas con ella; ingrediente de ungüentos de bruja. |
| **Genciana amarilla** / Genciana groga / *Gentiana lutea* | planta · productor relicto | flor julio | — | raíz amarga (licores, tónico, fiebres) | Relicta en las cumbres del Montseny. |
| **Oreja de oso** / Orella d'ós / *Ramonda myconi* | planta · productor rupícola | flor abril-junio | — | ingrediente alquímico (revive tras secarse: «planta de resurrección») | Grietas umbrías de Montserrat, su límite sur; emblema de la montaña. *Folklore:* Resucita tras meses seca: planta de reliquia y milagro. |
| **Té de roca** / Te de roca / *Chiliadenus saxatilis (Jasonia glutinosa)* | planta · productor rupícola | flor julio-septiembre | — | infusión digestiva | Cingles de solana de Montserrat. *Folklore:* Té tradicional de los ermitaños y excursionistas de Montserrat. |
| **Ajenjo** / Donzell / *Artemisia absinthium* | planta · productor ruderal | flor julio-septiembre | — | ingrediente alquímico (vermífugo, licores), repelente de polillas | Ruderal de montaña, cultivado en huertos. *Folklore:* Hierba amarga de las brujas y los licores. |

*También presentes:* Salvia, Encina, Roble pubescente, Brezo arbóreo, Muérdago, Rovellón, Ceps / boleto, Trufa negra, Vid, Hipérico, Romero, Tomillo, Aliso.


## 5. Río / Lago: Llobregat, Besòs, estanys y delta

Bosque de ribera (álamo, sauce, aliso), carrizales y estanys del delta. La nutria, la trucha y el tritón sirven de indicadores de agua limpia. La anguila y el esturión son la pesca valiosa.

#### Fauna

| Especie (cast. / cat. / científico) | Rol | Come | Lo cazan | Actividad | Cría (estación · camada) | Repr. | Conducta | Recurso | Estado histórico · folklore |
|---|---|---|---|---|---|---|---|---|---|
| **Nutria** / Llúdriga / *Lutra lutra* | depredador | Anguila, Barbo de montaña, Trucha común, Bagra catalana, Cangrejo de río autóctono, Rana común, Galápago leproso, Galápago europeo | — | Crepúsculo, Noche | todo el año · 2-3 crías | baja | solitaria, territorial, juguetona; huye | piel (muy valiosa) | Común en el Llobregat y Besòs; desapareció en los años 1970-80; hoy regresa por el Ter y el Llobregat alto. |
| **Castor europeo** / Castor / *Castor fiber* | herbívoro (ingeniero) | Sauce blanco, Álamo blanco, Aliso, hojas y brotes | Lobo, Oso pardo | Crepúsculo, Noche | parto mayo-junio · 2-4 crías | baja | familias; construye presas; golpea el agua con la cola | piel, castóreo (medicinal) | Vivió en el Llobregat y el Ebro al menos hasta época visigoda; extinguido en España a mediados del s. XIX. Reintroducido ilegalmente en el Ebro (2003), ya llega a Lleida. *Folklore:* El castóreo se usaba como analgésico y en perfumería. |
| **Esturión** / Esturió / sollo / *Acipenser sturio* | depredador bentónico | invertebrados acuáticos, peces pequeños | — | Mañana, Noche | primavera (remonta ríos) · cientos de miles de huevos | baja | migrador anádromo, enorme (hasta 3 m), lento | carne de lujo, caviar, cola de pescado (ictiocola) | Remontaba el Ebro y otros ríos; pesca controlada por reyes y consejos; extinguido a mediados del s. XX. Presencia en el Llobregat: plausible pero escasamente documentada. *Folklore:* Plato de mesas nobles; privilegios reales de pesca. |
| **Anguila** / Anguila / *Anguilla anguilla* | depredador | invertebrados acuáticos, peces pequeños, Rana común, Cangrejo de río autóctono | Nutria, Garza real, Cormorán moñudo | Noche | migra al mar de los Sargazos a desovar · millones de huevos (en el mar) | media | nocturna, reptante, sale del agua en noches húmedas | carne (all i pebre) | Abundantísima en el delta del Llobregat y el Besòs; hoy en peligro crítico. *Folklore:* All i pebre de anguila en deltas. |
| **Barbo de montaña** / Barb de muntanya / *Barbus meridionalis* | omnívoro bentónico | invertebrados acuáticos, algas | Nutria, Garza real, Martín pescador, Trucha común | Crepúsculo, Mañana, Día | mayo-julio · miles de huevos | alta | cardúmenes en pozas | carne | Nativo de ríos catalanes, incluido el Llobregat. |
| **Bagra catalana** / Bagra / *Squalius laietanus* | omnívoro | insectos, invertebrados acuáticos, algas | Nutria, Garza real, Martín pescador, Trucha común, Culebra viperina | Día, Tarde | abril-junio · miles de huevos | alta | cardúmenes; resistente | carne (menor) | Endemismo del noreste ibérico: el «pez laietano». *Folklore:* Su nombre científico viene de Laietània, la comarca ibérica de Barcelona. |
| **Trucha común** / Truita / *Salmo trutta* | depredador | insectos, invertebrados acuáticos, Tritón del Montseny, Barbo de montaña, Bagra catalana | Nutria, Garza real, Martín pescador | Mañana, Crepúsculo | noviembre-enero · cientos de huevos | media | territorial en corrientes frías | carne | Tramos altos del Llobregat y rieras del Montseny. |
| **Cangrejo de río autóctono** / Cranc de riu / *Austropotamobius pallipes* | detritívoro / omnívoro | invertebrados acuáticos, algas, carroña | Nutria, Anguila, Garza real | Crepúsculo, Noche | puesta otoño, eclosión primavera · 50-150 huevos | media | se esconde bajo piedras; pinza | carne | Muy común en rieras hasta que la afanomicosis y el cangrejo americano lo diezmaron (s. XX). |
| **Galápago leproso** / Tortuga de rierol / *Mauremys leprosa* | omnívoro | invertebrados acuáticos, peces pequeños, algas, carroña | Garza real, Nutria | Día, Tarde | mayo-julio · 6-10 huevos | media | al sol en troncos; se zambulle | caparazón (alquimia) | Presente en rieras del litoral catalán. |
| **Galápago europeo** / Tortuga d'estany / *Emys orbicularis* | omnívoro | invertebrados acuáticos, Rana común, algas | Garza real, Nutria | Día, Tarde | mayo-junio · 6-12 huevos | baja | tímido; charcas del delta | caparazón | En estanys del delta del Llobregat; muy escaso hoy. |
| **Rana común** / Granota verda / *Pelophylax perezi* | insectívoro | insectos | Garza real, Culebra viperina, Nutria, Anguila, Cárabo, Galápago europeo | Crepúsculo, Noche | marzo-julio · miles de huevos | alta | coros nocturnos; salta al agua | ancas (carne), piel (alquimia) | Muy abundante en acequias del delta. |
| **Culebra viperina** / Serp d'aigua / *Natrix maura* | depredador | Rana común, Bagra catalana, peces pequeños, Salamandra común | Garza real | Día, Tarde | junio-julio · 4-20 huevos | media | acuática; imita a la víbora pero es inofensiva | piel | Común en ríos y acequias. *Folklore:* Confundida con la víbora y matada por ello. |
| **Martín pescador** / Blauet / *Alcedo atthis* | depredador (peces) | peces pequeños, Barbo de montaña, Bagra catalana, Trucha común | Azor | Mañana, Día | abril-julio · 5-7 huevos, 2 puestas | media | territorial; se lanza en picado al agua | pluma azul (adorno, amuleto) | Común en el Llobregat y Besòs. *Folklore:* Se creía que su cuerpo seco señalaba el viento. |
| **Garza real** / Bernat pescaire / *Ardea cinerea* | depredador | Anguila, Rana común, Barbo de montaña, Bagra catalana, Trucha común, Cangrejo de río autóctono, Topillo mediterráneo, Galápago leproso, Galápago europeo, Culebra viperina | — | Mañana, Día, Crepúsculo | marzo-junio · 3-5 huevos | media | acecha inmóvil; colonias (garceras) | pluma (penachos) | Invernante y nidificante en el delta. *Folklore:* Presa de cetrería de alto rango. |
| **Ánade real** / Ànec collverd / *Anas platyrhynchos* | omnívoro | semillas, algas, invertebrados acuáticos, Carrizo | Zorro, Águila perdicera, Azor | Mañana, Crepúsculo | marzo-junio · 8-12 huevos | alta | bandos; huye volando | carne, pluma, plumón | Abundante en el delta; caza de aves acuáticas. |

*También presentes (ficha en su bioma principal):* Rata negra, Gaviota patiamarilla, Gineta, Salamandra común, Abejaruco, Dorada, Lubina, Mejillón.

#### Flora y hongos

| Especie (cast. / cat. / científico) | Tipo · rol | Fenología / cosecha | Lo comen | Recurso | Estado · folklore |
|---|---|---|---|---|---|
| **Álamo blanco** / Àlber / *Populus alba* | planta · productor de ribera | flor febrero-marzo | Castor europeo | madera blanda, corteza (medicinal) | Bosques de ribera del Llobregat. |
| **Sauce blanco** / Salze / *Salix alba* | planta · productor de ribera | flor marzo-abril | Castor europeo | mimbre, corteza (ácido salicílico: dolor y fiebre) | Orillas de todos los ríos. *Folklore:* La corteza de sauce era el «analgésico» medieval. |
| **Aliso** / Vern / *Alnus glutinosa* | planta · productor de ribera | flor invierno | Castor europeo | madera que no se pudre bajo el agua (pilotes), tinte | Rieras del Montseny. |
| **Carrizo** / Canyís / *Phragmites australis* | planta · productor palustre | flor verano-otoño | Ánade real | techado, esteras, refugio de fauna | Grandes carrizales en el delta. |
| **Enea** / Boga / *Typha latifolia* | planta · productor palustre | flor junio-agosto | — | sillas y cestería (boga), rizoma comestible, mechas | Estanys y acequias del delta. |
| **Junco** / Jonc / *Juncus sp.* | planta · productor palustre | flor primavera-verano | — | cestería, esteras | Marismas y ríos. |
| **Adelfa** / Baladre / *Nerium oleander* | planta · productor de ramblas | flor mayo-septiembre | — | veneno muy potente (corazón), raticida, ingrediente alquímico | Rieras secas y torrentes del litoral. *Folklore:* Veneno clásico; no usar su madera para asar. |
| **Berro** / Créixens / *Nasturtium officinale* | planta · productor acuático | flor verano | — | comestible, rico en vitamina C, medicinal | Fuentes y acequias limpias. |
| **Menta de agua** / Menta d'aigua / *Mentha aquatica* | planta · productor palustre | flor julio-octubre | — | aromática, digestiva | Orillas de ríos y fuentes. |
| **Lirio amarillo** / Lliri groc / *Iris pseudacorus* | planta · productor palustre | flor abril-junio | — | rizoma (tinte negro, tinta), tóxico | Marismas del delta. |

*También presentes:* Hiedra, Salicornia.


## 6. Costa: playas, acantilados del Garraf y praderas de posidonia

Playas y dunas del delta, acantilados calcáreos del Garraf con palmito y romero, y praderas de posidonia como vivero del mar. Aquí viven la foca monje (histórica), las almadrabas de atún y la pesca de sardina con luz («teia»).

#### Fauna

| Especie (cast. / cat. / científico) | Rol | Come | Lo cazan | Actividad | Cría (estación · camada) | Repr. | Conducta | Recurso | Estado histórico · folklore |
|---|---|---|---|---|---|---|---|---|---|
| **Gaviota patiamarilla** / Gavià argentat / *Larus michahellis* | omnívoro / carroñero | peces pequeños, Sardina, carroña, basura/desperdicios, Rata negra, Erizo de mar, Mejillón | Halcón peregrino | Mañana, Día, Tarde, Crepúsculo | marzo-junio · 2-3 huevos, 1 puesta | media | colonial, agresiva defendiendo nido; roba comida | huevos, pluma | Siempre en el puerto; hoy muy abundante por la basura. En la Edad Media menos numerosa. |
| **Foca monje** / Vell marí / *Monachus monachus* | depredador marino | Pulpo, Sepia, Dorada, Lubina, Sardina | — | Día, Noche | parto septiembre-noviembre en cuevas · 1 cría cada 1-2 años | baja | tímida; descansa en cuevas marinas; muy sensible al acoso | piel, grasa (lámparas) | Habitual en Catalunya hasta fines del s. XIX; retirada a la Costa Brava, extinguida hacia 1950 (último avistamiento 1973). La Generalitat estudia reintroducirla (~2027). *Folklore:* «Vell marí»: el viejo del mar; pescadores la mataban por romper redes. |
| **Delfín mular** / Dofí mular / *Tursiops truncatus* | depredador marino | Sardina, Dorada, Lubina, Sepia, Pulpo, Atún rojo | — | Mañana, Día, Tarde | todo el año · 1 cría cada 3 años | baja | grupos; curioso; sigue barcas | ninguno (guía de marineros) | Presente en la costa; los mulares frecuentaban deltas. *Folklore:* Salvadores de náufragos en leyendas marineras. |
| **Tortuga boba** / Tortuga babaua / *Caretta caretta* | omnívoro marino | medusas, Erizo de mar, Mejillón, invertebrados acuáticos | — | Día | puesta junio-agosto en playas · 80-120 huevos | baja | solitaria, migradora; sube a playas de noche a desovar | caparazón (carey menor), carne | Frecuente en el mar catalán; puestas esporádicas en playas. |
| **Atún rojo** / Tonyina / *Thunnus thynnus* | depredador pelágico | Sardina, peces pequeños, Sepia | Delfín mular | Mañana, Día | mayo-julio (migra al Mediterráneo) · millones de huevos | media | grandes bancos migratorios | carne (salazón), grasa | Almadrabas históricas en la costa catalana (Ametlla, Cap de Salou...). |
| **Sardina** / Sardina / *Sardina pilchardus* | planctófago | plancton | Atún rojo, Delfín mular, Gaviota patiamarilla, Cormorán moñudo, Lubina, Dorada, Foca monje | Mañana, Día, Tarde | invierno · decenas de miles de huevos | alta | grandes bancos; atraída por la luz (pesca con teia) | carne (salazón), aceite, cebo | Base de la pesca popular con «teia» (luz de antorcha) en la costa de Barcelona. *Folklore:* Pesca de «llum» nocturna. |
| **Dorada** / Orada / *Sparus aurata* | depredador bentónico | Mejillón, Erizo de mar, invertebrados acuáticos, Sardina | Delfín mular, Foca monje | Mañana, Día | invierno (hermafrodita) · miles de huevos | media | solitaria o en grupos; entra en lagunas del delta | carne fina | Muy apreciada desde época romana. |
| **Lubina** / Llobarro / *Dicentrarchus labrax* | depredador | Sardina, peces pequeños, invertebrados acuáticos, Pulpo | Delfín mular, Foca monje | Crepúsculo, Noche | enero-marzo · miles de huevos | media | cazadora en rompientes y desembocaduras | carne fina | Común en desembocaduras del Llobregat y Besòs. |
| **Pulpo** / Pop / *Octopus vulgaris* | depredador | Mejillón, invertebrados acuáticos, Erizo de mar | Foca monje, Delfín mular, Lubina | Crepúsculo, Noche | primavera-verano · cientos de miles de huevos (la madre muere) | media | solitario, inteligente, se camufla; tinta | carne, tinta | Pesca con cadufos (vasijas) tradicional. |
| **Sepia** / Sípia / *Sepia officinalis* | depredador | peces pequeños, invertebrados acuáticos | Delfín mular, Foca monje, Atún rojo | Crepúsculo, Noche | primavera · cientos de huevos en racimos | media | camuflaje, tinta | carne, tinta (escritura, pintura), jibión | La tinta de sepia se usó para escribir y dibujar. |
| **Erizo de mar** / Garota / *Paracentrotus lividus* | herbívoro (ramoneador de algas) | algas, Posidonia | Dorada, Pulpo, Gaviota patiamarilla, Tortuga boba | Noche | primavera · millones de huevos | alta | sésil; si faltan sus depredadores arrasa las algas | huevas (garotada) | Muy común en roquedos del Garraf. *Folklore:* Garotada: festín popular de invierno. |
| **Mejillón** / Musclo / *Mytilus galloprovincialis* | filtrador | plancton | Dorada, Pulpo, Gaviota patiamarilla, Tortuga boba | — | primavera · millones de huevos | alta | sésil en rocas y pilotes del puerto | carne, cebo | Recolectado en escolleras y pilotes del puerto. |
| **Cormorán moñudo** / Corb marí emplomallat / *Gulosus aristotelis* | depredador marino | Sardina, peces pequeños, Anguila | Halcón peregrino | Mañana, Día | febrero-mayo · 2-4 huevos | media | bucea; seca las alas al sol en rocas | pluma | Nidifica en acantilados mediterráneos. |
| **Tortuga mediterránea** / Tortuga mediterrània / *Testudo hermanni hermanni* | herbívoro | hierba, frutos silvestres | Águila real, Zorro, Jabalí, Tejón | Mañana, Día | puesta mayo-julio · 2-5 huevos, 1-3 puestas | baja | lenta; hiberna noviembre-marzo | caparazón (alquimia); nunca debería cazarse | Antes común en Catalunya; solo queda natural en l'Albera. Reintroducida en el Garraf desde 1992 (~5.000 ejemplares). *Folklore:* Símbolo de longevidad. |

*También presentes (ficha en su bioma principal):* Rata negra, Paloma bravía / zurita, Salamanquesa común, Conejo, Culebra bastarda, Lagarto ocelado, Águila perdicera, Halcón peregrino, Lagartija ibérica, Chova piquirroja, Nutria, Esturión, Anguila, Galápago europeo, Garza real.

#### Flora y hongos

| Especie (cast. / cat. / científico) | Tipo · rol | Fenología / cosecha | Lo comen | Recurso | Estado · folklore |
|---|---|---|---|---|---|
| **Algarrobo** / Garrofer / *Ceratonia siliqua* | planta · cultivo de secano | flor otoño, cosecha agosto-septiembre | — | garrofas (pienso, harina de hambre) | Típico del Garraf y el Penedès costero. *Folklore:* Semillas usadas como unidad de peso (quilate). |
| **Romero** / Romaní / *Salvia rosmarinus* | planta · productor aromático (melífero) | flor casi todo el año (pico invierno-primavera) | Abeja melífera | condimento, medicinal, aceite, néctar (miel) | Matorral de Garraf, Montserrat y Collserola. *Folklore:* Hierba de la memoria; se quemaba contra la peste. |
| **Tomillo** / Farigola / *Thymus vulgaris* | planta · productor aromático (melífero) | flor marzo-junio | Abeja melífera | condimento, sopa de farigola, antiséptico, néctar | Matorral seco de Garraf y Montserrat. *Folklore:* Sopa de farigola para el catarro. |
| **Posidonia** / Posidònia / *Posidonia oceanica* | planta · productor marino (pradera) | flor otoño (rara), crece 1 cm/año | Erizo de mar | hojas secas (relleno de colchones, embalaje, abono), refugio de alevines | Praderas frente al Garraf; forman «banquetas» en las playas. *Folklore:* Las «pelotas de mar» se usaban como aislante. |
| **Palmito** / Margalló / *Chamaerops humilis* | planta · productor | flor abril-junio, dátiles otoño | — | cogollo comestible, hojas (escobas, cestería, cuerdas) | Única palmera autóctona europea: emblema del Garraf. |
| **Lentisco** / Llentiscle / *Pistacia lentiscus* | planta · productor | flor marzo-abril, frutos otoño | — | almáciga (resina), aceite de lentisco (lámparas), taninos | Matorral litoral. |
| **Coscoja** / Garric / *Quercus coccifera* | planta · productor | flor abril-mayo | — | quermes (tinte rojo del insecto), leña | Matorral del Garraf. *Folklore:* El quermes daba el rojo carmesí de los paños. |
| **Hinojo marino** / Fonoll marí / *Crithmum maritimum* | planta · productor rupícola | flor verano | — | encurtido, antiescorbútico para marineros | Rocas salpicadas por el mar. |
| **Azucena de mar** / Lliri de mar / *Pancratium maritimum* | planta · productor de dunas | flor julio-septiembre (noche) | — | bulbo tóxico, ornamental | Dunas de playas del delta y Castelldefels. |
| **Salicornia** / Salicòrnia / *Salicornia sp.* | planta · productor halófilo | flor verano-otoño | — | comestible, cenizas (sosa para jabón y vidrio) | Saladares del delta del Llobregat. *Folklore:* Base del vidrio y el jabón medievales. |

*También presentes:* Higuera, Alcaparra, Madroño, Pino carrasco, Olivo, Almendro, Junco.


---

## 7. Criaturas fantásticas (folklore catalán)

Fauna rara, de 1 a pocos individuos por región. Salvo los minairons y los follets, **no siguen Lotka-Volterra**: aparecen o desaparecen según indicadores del ecosistema real, lo que las convierte en premio o aviso para el jugador. El folklore de cada una es real; su ecología es inventada.

| Criatura (cast. / cat. / «científico» inventado) | Biomas | Rol | Come | Lo caza | Actividad | Cría | Repr. | Conducta | Recurso | Folklore real · regla de juego |
|---|---|---|---|---|---|---|---|---|---|---|
| **Drac de Sant Llorenç** / Drac / *Draco catalaunicus (inv.)* | Montaña, Bosque | superdepredador | Cabra montés, Ciervo, Jabalí, ganado (ovejas, cabras), Simiot | — | Crepúsculo, Noche | cada 7 años, en invierno · 1 huevo | baja | solitario, guarda cueva y tesoro; arrasa rebaños; huye de la luz del alba de Sant Jordi | escama (armadura), sangre (alquimia mayor), diente | Sant Jordi mató al drac y de su sangre nació un rosal (Diada del 23 de abril). — Folklore: dragón de Sant Llorenç del Munt, la Mola (Vallès), junto al de Sant Jordi. En juego: una sola pareja por región; si caza demasiado, la región se vacía de ungulados. |
| **Víbria** / Víbria / *Vipera alata barcinonensis (inv.)* | Urbano, Montaña | depredador aéreo | Paloma bravía / zurita, Gaviota patiamarilla, Rata negra | — | Crepúsculo, Noche | primavera · 2 huevos | baja | dragona con pechos y pico de ave; territorial sobre torres y campanarios | pluma-escama, fuego frío (alquimia) | Bestiario festivo de Barcelona, danza con la Àliga de la Ciutat. — Bestia festiva de la ciudad de Barcelona (Corpus). En juego: controla palomas y ratas del casco antiguo; si desaparece, sube la plaga de ratas. |
| **Dona d'aigua (encantada / goja)** / Dona d'aigua / *Nympha aquatica (inv.)* | Río / Lago, Montaña | guardiana (mutualista) | néctar | — | Noche, Crepúsculo | nunca cría; aparece si el agua es pura · — | baja | esquiva; lava ropa de oro al amanecer de San Juan; castiga a quien ensucia la fuente | agua bendita de fuente, hilo de oro, bendición de cosecha | Se casan con mortales con la condición de no ser nombradas «dona d'aigua»; si se rompe, desaparecen. — Folklore: mujeres de fuentes, estanys y cuevas húmedas (también goges, encantades, paitides). En juego: aparece solo si nutria, trucha y tritón están presentes (indicador de río sano). |
| **Minairons** / Minairons / menairons / *Formica laboriosa (inv.)* | Bosque, Pradera | polinizador / trabajador | néctar, semillas | Cárabo | Noche | se multiplican en un canuto si se les da trabajo · cientos | alta | enjambre diminuto; obedecen a quien tiene su canuto; si no se les da trabajo, atacan a su amo | trabajo gratis (siega, siembra), miel mágica | «Què farem? Què direm?»: si no tienen tarea, estrangulan al amo. — Folklore pirenaico: seres diminutos guardados en un canuto de agujas que exigen trabajo continuo. En juego: sustituyen parcialmente a las abejas como polinizadores si estas desaparecen. |
| **Follet** / Follet / *Genius domesticus (inv.)* | Urbano, Pradera | omnívoro (hurtador) | basura/desperdicios, frutos silvestres, Trigo | Gato doméstico / callejero | Noche | nace de remolinos de viento en verano · 1 | media | travieso; enreda crines, esconde cosas, ayuda si se le trata bien | favor doméstico, cascabel | Hay que dejarle un plato de leche o gachas. — Folklore: duende mediterráneo de gorro rojo con cascabeles. En juego: sube con los gorriones y ratones, baja si hay gatos. |
| **Simiot** / Simiot / *Simia diabolica (inv.)* | Bosque, Montaña | herbívoro destructor | Vid, Trigo, frutos silvestres | Lobo, Drac de Sant Llorenç | Noche | otoño · 1-2 | media | monstruo simiesco; baja por la chimenea y asusta; arrasa cosechas | pelo (alquimia), talismán de Arles | Expulsado por las reliquias de Abdó i Senén. — Folklore del Vallespir (Arles). En juego: plaga de cosechas que prolifera si no hay lobos (como el jabalí). |
| **Pesanta** / Pesanta / *Incubus felinus (inv.)* | Urbano | parásito del sueño | sueños de los durmientes | Gato doméstico / callejero | Noche | invierno (noches largas) · 1 | media | gato o perro negro enorme que se sienta en el pecho del durmiente; cansancio al despertar | pelo negro (ingrediente de pesadillas) | Se entra por el ojo de la cerradura; tiene un agujero en la pata. — Folklore de toda Catalunya: causa pesadillas y opresión nocturna. En juego: baja el descanso del jugador si no hay gato en casa. |
| **Quarantamaula** / Quarantamaula / *Nox terribilis (inv.)* | Bosque, Montaña | depredador (de imprudentes) | ganado (ovejas, cabras), Liebre ibérica, Conejo | — | Noche | nunca vista criando · 1 | baja | acecha a quien anda por el bosque de noche; nunca descrita del todo | susto (reputación), sombra en frasco | Se invocaba para que los niños volvieran antes de la noche. — Folklore del Berguedà: coco nocturno sin forma definida. En juego: aumenta el peligro nocturno en bosque cuando la población de lobos ha desaparecido (llena el nicho). |
| **Drac de estanys** / Drac de Banyoles / *Draco lacustris (inv.)* | Río / Lago | superdepredador acuático | Anguila, Barbo de montaña, ganado (ovejas, cabras), Ánade real | — | Crepúsculo, Noche | verano, cada muchos años · 1 huevo | baja | vive en el lago y emerge a devorar ganado; aliento pestilente | escama húmeda, bilis (alquimia) | El santo lo amansó y lo llevó atado con su estola. — Folklore: dragón del estany de Banyoles vencido por Sant Mer. En juego: vive en estanys del delta, regula anguilas y ánades. |
| **Peix Nicolau** / Peix Nicolau / *Homo piscis (inv.)* | Costa | depredador marino (curioso) | Pulpo, Sardina | — | Día, Noche | desconocida · 1 | baja | hombre-pez que bucea días enteros; guía o ahoga a pescadores según el trato | perla, mapa de cuevas marinas | Maldición materna: «¡Así te vuelvas pez!». — Folklore mediterráneo (catalán y siciliano): Nicolau que se convirtió en pez por la maldición de su madre. En juego: aparece si la foca monje vuelve (mar sano). |
| **Home dels Nassos** / Home dels Nassos / *Homo nasutissimus (inv.)* | Urbano | — | basura/desperdicios | — | Día | aparece solo el 31 de diciembre · — | baja | tiene tantas narices como días quedan en el año; se le ve solo el último día | nariz (1 por año): ingrediente legendario | Broma para niños: el último día solo tiene una nariz. — Folklore barcelonés. En juego: evento único el último día del año. |
| **Cuca fera** / Cuca fera / *Testudo draconis (inv.)* | Río / Lago, Costa | omnívoro | carroña, Anguila, Cangrejo de río autóctono | — | Crepúsculo, Noche | primavera · 3-5 huevos | baja | tortuga-dragón con púas; se come a los niños desobedientes | caparazón de púas (escudo) | «Cuca fera, qui no la vol? Mengem-li la cua!». — Folklore de Tortosa y del delta del Ebro. En juego: habita el delta; comparte nicho con los galápagos. |
| **Gegant de roca** / Gegant / *Gigas saxeus (inv.)* | Montaña | herbívoro colosal | hierba, Haya, Roble pubescente | — | Mañana, Día | una vez por siglo · 1 | baja | lento, pacífico si no se le molesta; lanza rocas | piedra de gigante (construcción), tierra fértil | Montserrat serrada por los ángeles; montañas como gigantes dormidos. — Folklore: gigantes como Caro, Caramançó o Puigmal que modelaron montañas. En juego: su paso abre claros que favorecen a ciervos y cabras. |

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
