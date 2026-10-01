// Inventarios de las tiendas especializadas. Algunas cambian con la estación (índice 0..3).
export const SHOPS = {
  taberna: { name: 'Taberna', items: ['cerveza', 'vino', 'pa_tomaquet', 'butifarra', 'sardinas_asadas', 'carne_asada', 'queso'], buys: ['pescado', 'carne', 'uva', 'trigo', 'miel', 'sardina', 'barbo'] },
  t_hierbas: { name: 'Herboristería La Ruda', items: ['romero', 'tomillo', 'salvia', 'ruda', 'hiperico', 'ajenjo', 'miel', 'muerdago', 'sem_romero', 'rosa', 'lib_herbario', 'venda'], buys: ['hierba', 'seta'] },
  t_forja: { name: 'Ferrería del Call', items: ['garrote', 'cuchillo', 'espada', 'lanza', 'hacha', 'arco', 'casco', 'yelmo_cuernos', 'cota', 'coraza', 'hierro', 'azada'], buys: ['hierro', 'plata', 'colmillo', 'cornamenta', 'hueso'] },
  t_sastre: { name: 'Sastrería Bonanova', items: ['tunica', 'jubon', 'vestido', 'habito', 'delantal', 'barretina', 'sombrero', 'capucha', 'cofia', 'capa', 'capa_azul', 'capa_verde', 'cinta', 'lana', 'cuero'], buys: ['piel', 'piel_fina', 'lana', 'cuero', 'pluma'] },
  t_libros: { name: 'Librería del Arco', items: ['lib_cronica', 'lib_herbario', 'lib_bestiario', 'lib_rondalles', 'lib_oficios', 'lib_consolat', 'libro_versos'], buys: ['libro', 'tinta_sepia', 'pluma'] },
  t_alquimia: { name: 'Botica del Alambique', items: ['vidrio', 'belladona', 'beleno', 'adelfa', 'mandragora', 'pocion', 'tonico', 'antidoto', 'unguento', 'sueno', 'lib_alambique', 'aceite'], buys: ['hierba', 'seta', 'veneno', 'pocion', 'tinta_sepia'] },
  t_pan: { name: 'Horno de Sant Jaume', items: ['pan', 'pa_tomaquet', 'huevo', 'queso', 'crema', 'coca'], seasonal: [['crema'], ['coca'], ['panellets', 'castanas'], ['butifarra']], buys: ['trigo', 'huevo', 'miel', 'pinones'] },
  t_velas: { name: 'Cerería del Vidrio', items: ['cera', 'agua_bendita', 'perfume', 'sal', 'aceite', 'vidrio'], buys: ['cera', 'miel'] },
  t_pesca: { name: 'Pescadería del Muelle', items: ['sardina', 'dorada', 'pulpo', 'lubina', 'sardinas_asadas', 'cana_pescar', 'cuerda', 'sal'], buys: ['pesca'] },
  t_ceramica: { name: 'Alfarería de la Riera', items: ['vino', 'aceite', 'miel', 'sal', 'aceitunas', 'concha'], buys: ['cultivo'] },
  hospital: { name: 'Botiquín', items: ['venda', 'unguento', 'pocion', 'antidoto'], buys: ['hierba'] },
  granja: { name: 'Masía del Prat', items: ['huevo', 'sem_trigo', 'sem_col', 'sem_alcachofa', 'azada', 'queso', 'alcachofa', 'aceitunas'], buys: ['cultivo', 'huevo'] },
  genoves: { name: 'Micer Lanfranco', items: ['mandragora', 'perfume', 'anillo', 'plata', 'tabaco', 'lib_consolat', 'diadema', 'amuleto_plata', 'capa_azul', 'tinta_sepia', 'libro_versos'], buys: ['piel_fina', 'plata', 'cornamenta', 'esturion', 'trufa', 'tinta_sepia'], markup: 1.2 },
  banco: { name: 'Taula de Canvi', items: [], buys: ['plata', 'anillo'] },
};

// Puestos del mercado: perfiles de vendedor al azar
export const MARKET = [
  { who: 'Payesa del Llano', items: ['huevo', 'col', 'alcachofa', 'trigo', 'uva', 'aceitunas', 'sem_col', 'sem_trigo'] },
  { who: 'Pescador del Besós', items: ['sardina', 'pulpo', 'dorada', 'concha', 'erizo_mar'] },
  { who: 'Pastor del Montseñal', items: ['queso', 'lana', 'miel', 'cuero', 'carne'] },
  { who: 'Herbolaria ambulante', items: ['romero', 'tomillo', 'ruda', 'hiperico', 'rovellon', 'cep', 'belladona'] },
  { who: 'Buhonero', items: ['cinta', 'tabaco', 'cuerda', 'sal', 'vidrio', 'garrote', 'barretina'] },
  { who: 'Carbonera de la sierra', items: ['madera', 'bellota', 'pinones', 'castanas', 'trufa'] },
  { who: 'Mercader de Mallorca', items: ['aceite', 'vino', 'perfume', 'jubon', 'anillo'] },
  { who: 'Chamarilero del Raval', items: ['lib_rondalles', 'amuleto', 'cuchillo', 'capa', 'libro_versos', 'hueso', 'plata'] },
];
export const MARKET_RARE = ['mandragora', 'lib_alambique', 'amuleto_plata', 'diadema', 'arco', 'yelmo_cuernos', 'lib_bestiario', 'trufa', 'esturion'];
