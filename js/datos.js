/* ============================================================
   datos.js - Constantes y datos semilla del calendario
   ------------------------------------------------------------
   Define el namespace global "App" que comparten todos los
   archivos del proyecto (datos.js -> estado.js -> render.js ->
   drag.js -> proveedores.js -> app.js, en ese orden).
   ============================================================ */
var App = window.App = window.App || {};

/* Días de la semana. Índice 0 = Domingo ... 6 = Sábado.
   - idx:    índice usado internamente en los datos del proveedor
   - nombre: nombre completo (títulos de fila, mensajes)
   - abbr:   abreviación usada en las anotaciones del calendario */
App.DIAS = [
    { idx: 0, nombre: 'Domingo',   abbr: 'Dom' },
    { idx: 1, nombre: 'Lunes',     abbr: 'L' },
    { idx: 2, nombre: 'Martes',    abbr: 'Ma' },
    { idx: 3, nombre: 'Miércoles', abbr: 'Mi' },
    { idx: 4, nombre: 'Jueves',    abbr: 'J' },
    { idx: 5, nombre: 'Viernes',   abbr: 'V' },
    { idx: 6, nombre: 'Sábado',    abbr: 'S' }
];

/* Etiquetas legibles de cada frecuencia (columna del calendario) */
App.FRECUENCIA_LABEL = {
    semanal: 'Semanal',
    quincenal13: 'Quincenal (Sem 1 y 3)',
    quincenal24: 'Quincenal (Sem 2 y 4)',
    mensual: 'Mensual'
};

/* Columnas de las tablas, en el orden en que se dibujan */
App.COLS = ['semanal', 'quincenal', 'mensual'];

/* Orden de las filas (días) en cada calendario.
   El de pedidos empieza en Sábado; el de recepción en Lunes. */
App.PEDIDOS_ROWS = [6, 0, 1, 2, 3, 4, 5];
App.RECEPCION_ROWS = [1, 2, 3, 4, 5, 6];

/* Notas bajo el nombre del día (primera columna) */
App.PEDIDOS_SUB = {
    6: '(Mañana)',
    0: '(Día de Borradores)',
    1: '(Día de Envíos Rápidos)',
    4: '(Día de mayor exigencia)',
    5: '(Día Cero Carga - Reuniones)'
};
App.RECEPCION_SUB = {
    3: '(Día Descongestionado)',
    4: '(Full Recepción Finde)'
};

/* Textos de celdas vacías conocidas, con formato "día|columna" */
App.VACIOS_PEDIDOS = {
    '6|mensual': 'Libre de gestión mensual',
    '5|quincenal': 'Libre de gestión'
};
App.VACIOS_RECEPCION = {
    '6|semanal': 'Vacío / Libre',
    '6|mensual': 'Vacío / Libre'
};

/* ------------------------------------------------------------
   Utilidades de texto
   ------------------------------------------------------------ */

/* esc(s): escapa caracteres HTML para evitar inyección y errores */
App.esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

/* slug(s): convierte un texto a un identificador url-friendly */
App.slug = function (s) {
    return String(s).toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')      // quita acentos
        .replace(/[^a-z0-9]+/g, '-')          // espacios/símbolos -> -
        .replace(/^-|-$/g, '');               // guiones al inicio/fin
};

/* ------------------------------------------------------------
   Mapeos de frecuencia
   ------------------------------------------------------------ */

/* colFor(f): a qué columna pertenece una frecuencia */
App.colFor = function (f) {
    return f === 'semanal' ? 'semanal' : f === 'mensual' ? 'mensual' : 'quincenal';
};

/* freqLabel(p): etiqueta de semana para la columna quincenal */
App.freqLabel = function (p) {
    return p.frecuencia === 'quincenal13' ? 'Sem 1/3'
        : p.frecuencia === 'quincenal24' ? 'Sem 2/4' : '';
};

/* ------------------------------------------------------------
   Datos semilla
   Los proveedores vienen de data-proveedores.json (se inyectan
   al construir el proyecto). Solo se usan la primera vez que la
   app se abre, o al pulsar "Restaurar original".
   ------------------------------------------------------------ */
App.SEED_PROVEEDORES = [
  {
    "id": "cablu",
    "nombre": "Cablu S.A.S.",
    "frecuencia": "semanal",
    "diasEnvio": [6],
    "diasEntrega": [1, 2, 3, 4, 5],
    "transito": 2,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "Pedido obligatorio el sábado por la mañana",
    "posDiaEnvio": 6,
    "posDiaEntrega": 1,
    "sobrescribirEntrega": false
  },
  {
    "id": "la-chilenita",
    "nombre": "Laminados Industrial (La Chilenita)",
    "frecuencia": "semanal",
    "diasEnvio": [6],
    "diasEntrega": [1],
    "transito": 2,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "Pedido obligatorio sábado",
    "posDiaEnvio": 6,
    "posDiaEntrega": 1,
    "sobrescribirEntrega": false
  },
  {
    "id": "zambrano-figueroa",
    "nombre": "Zambrano Figueroa Carlos Eduardo",
    "frecuencia": "semanal",
    "diasEnvio": [6],
    "diasEntrega": [1],
    "transito": 2,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "Pedido obligatorio sábado mañana",
    "posDiaEnvio": 6,
    "posDiaEntrega": 1,
    "sobrescribirEntrega": false
  },
  {
    "id": "heineken",
    "nombre": "Heineken Ecuador S.A.",
    "frecuencia": "mensual",
    "diasEnvio": [0, 1, 2, 3, 4, 5],
    "diasEntrega": [1, 2, 3, 4, 5],
    "transito": 1,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "Atiende orden realizada el domingo para entrega lunes",
    "posDiaEnvio": 0,
    "posDiaEntrega": 1,
    "sobrescribirEntrega": false
  },
  {
    "id": "la-fabril",
    "nombre": "La Fabril S.A.",
    "frecuencia": "semanal",
    "diasEnvio": [1, 2, 3, 4, 5],
    "diasEntrega": [3, 4, 5],
    "transito": 2,
    "anticipacion": 1,
    "estricto": false,
    "gigante": true,
    "nota": "Prep Domingo -> Envía Lunes para descongestionar recepción el Jueves",
    "posDiaEnvio": 1,
    "posDiaEntrega": 5,
    "sobrescribirEntrega": true
  },
  {
    "id": "chicaiza",
    "nombre": "Chicaiza Bombon Hugo",
    "frecuencia": "semanal",
    "diasEnvio": [1],
    "diasEntrega": [1],
    "transito": 0,
    "anticipacion": 1,
    "estricto": true,
    "gigante": false,
    "nota": "Lead time 8 horas (Entrega mismo día)",
    "posDiaEnvio": 1,
    "posDiaEntrega": 1,
    "sobrescribirEntrega": false
  },
  {
    "id": "crearvida",
    "nombre": "Crearvida S.A.",
    "frecuencia": "semanal",
    "diasEnvio": [1],
    "diasEntrega": [2],
    "transito": 1,
    "anticipacion": 1,
    "estricto": true,
    "gigante": false,
    "nota": "Prep Domingo -> Envía Lunes",
    "posDiaEnvio": 1,
    "posDiaEntrega": 2,
    "sobrescribirEntrega": false
  },
  {
    "id": "lituma",
    "nombre": "Lituma Ordoñez Miguel Augusto",
    "frecuencia": "semanal",
    "diasEnvio": [1],
    "diasEntrega": [2],
    "transito": 1,
    "anticipacion": 1,
    "estricto": true,
    "gigante": false,
    "nota": "Prep Domingo -> Envía Lunes",
    "posDiaEnvio": 1,
    "posDiaEntrega": 2,
    "sobrescribirEntrega": false
  },
  {
    "id": "dipor",
    "nombre": "Distribuidora Importadora Dipor S.A.",
    "frecuencia": "semanal",
    "diasEnvio": [1],
    "diasEntrega": [2],
    "transito": 1,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "",
    "posDiaEnvio": 1,
    "posDiaEntrega": 2,
    "sobrescribirEntrega": false
  },
  {
    "id": "jefamicorp",
    "nombre": "Jefamicorp S.A.",
    "frecuencia": "semanal",
    "diasEnvio": [1],
    "diasEntrega": [3, 4],
    "transito": 2,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "",
    "posDiaEnvio": 1,
    "posDiaEntrega": 3,
    "sobrescribirEntrega": false
  },
  {
    "id": "inalecsa",
    "nombre": "Industrias Alimenticias Ecuatorianas S.A. Inalecsa",
    "frecuencia": "quincenal24",
    "diasEnvio": [1],
    "diasEntrega": [3],
    "transito": 2,
    "anticipacion": 1,
    "estricto": true,
    "gigante": false,
    "nota": "Prep Domingo -> Envía Lunes",
    "posDiaEnvio": 1,
    "posDiaEntrega": 3,
    "sobrescribirEntrega": false
  },
  {
    "id": "pydaco",
    "nombre": "Pydaco Cía. Ltda.",
    "frecuencia": "semanal",
    "diasEnvio": [1],
    "diasEntrega": [2, 3],
    "transito": 1,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "Lunes pedido máximo 3:00pm",
    "posDiaEnvio": 1,
    "posDiaEntrega": 2,
    "sobrescribirEntrega": false
  },
  {
    "id": "bimbo",
    "nombre": "Bimbo Ecuador S.A.",
    "frecuencia": "semanal",
    "diasEnvio": [2],
    "diasEntrega": [3],
    "transito": 1,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "Martes pedido estricto",
    "posDiaEnvio": 2,
    "posDiaEntrega": 3,
    "sobrescribirEntrega": false
  },
  {
    "id": "anahi-02",
    "nombre": "Distribuidora Anahi S.A. (Sucursal 02)",
    "frecuencia": "semanal",
    "diasEnvio": [1, 2],
    "diasEntrega": [2, 3],
    "transito": 1,
    "anticipacion": 0,
    "estricto": false,
    "gigante": false,
    "nota": "",
    "posDiaEnvio": 2,
    "posDiaEntrega": 3,
    "sobrescribirEntrega": false
  },
  {
    "id": "deanova",
    "nombre": "Deanova S.A.",
    "frecuencia": "semanal",
    "diasEnvio": [1, 2, 3, 4, 5],
    "diasEntrega": [3],
    "transito": 1,
    "anticipacion": 0,
    "estricto": false,
    "gigante": false,
    "nota": "Martes haría pedido",
    "posDiaEnvio": 2,
    "posDiaEntrega": 3,
    "sobrescribirEntrega": false
  },
  {
    "id": "danec",
    "nombre": "Industrial Danec S.A.",
    "frecuencia": "semanal",
    "diasEnvio": [1, 2, 3, 4, 5],
    "diasEntrega": [1, 2, 3, 4, 5],
    "transito": 2,
    "anticipacion": 0,
    "estricto": false,
    "gigante": true,
    "nota": "Movido a Miércoles para liberar recepción del Jueves",
    "posDiaEnvio": 3,
    "posDiaEntrega": 5,
    "sobrescribirEntrega": true
  },
  {
    "id": "arreaga-ayala",
    "nombre": "Arreaga Ayala Byron Adalberto",
    "frecuencia": "semanal",
    "diasEnvio": [3],
    "diasEntrega": [4],
    "transito": 1,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "",
    "posDiaEnvio": 3,
    "posDiaEntrega": 4,
    "sobrescribirEntrega": false
  },
  {
    "id": "panificadora-industrial",
    "nombre": "Panificadora Industrial Cia. Ltda.",
    "frecuencia": "semanal",
    "diasEnvio": [3],
    "diasEntrega": [4],
    "transito": 1,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "",
    "posDiaEnvio": 3,
    "posDiaEntrega": 4,
    "sobrescribirEntrega": false
  },
  {
    "id": "villegas-fajardo",
    "nombre": "Villegas Fajardo Claudio Kumar",
    "frecuencia": "semanal",
    "diasEnvio": [3],
    "diasEntrega": [4],
    "transito": 1,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "",
    "posDiaEnvio": 3,
    "posDiaEntrega": 4,
    "sobrescribirEntrega": false
  },
  {
    "id": "saliuper",
    "nombre": "Saliuper S.A.",
    "frecuencia": "semanal",
    "diasEnvio": [3],
    "diasEntrega": [4],
    "transito": 1,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "",
    "posDiaEnvio": 3,
    "posDiaEntrega": 4,
    "sobrescribirEntrega": false
  },
  {
    "id": "tecnoideas",
    "nombre": "Tecnoideas S.A.",
    "frecuencia": "semanal",
    "diasEnvio": [3],
    "diasEntrega": [4],
    "transito": 1,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "",
    "posDiaEnvio": 3,
    "posDiaEntrega": 4,
    "sobrescribirEntrega": false
  },
  {
    "id": "ac-bebidas",
    "nombre": "Bebidas Arcacontinental Ecuador (Arcador C.L.)",
    "frecuencia": "semanal",
    "diasEnvio": [3, 5],
    "diasEntrega": [1, 4],
    "transito": 3,
    "anticipacion": 1,
    "estricto": true,
    "gigante": true,
    "nota": "Pedido en borrador Miércoles, enviado Jueves para entrega Lunes Isidro PC",
    "posDiaEnvio": 4,
    "posDiaEntrega": 1,
    "sobrescribirEntrega": true
  },
  {
    "id": "dazulthi",
    "nombre": "Distribuidora Dazulthi S.A.S.",
    "frecuencia": "semanal",
    "diasEnvio": [4],
    "diasEntrega": [5],
    "transito": 1,
    "anticipacion": 1,
    "estricto": true,
    "gigante": false,
    "nota": "Prep Miércoles ➔ Envía Jueves",
    "posDiaEnvio": 4,
    "posDiaEntrega": 5,
    "sobrescribirEntrega": false
  },
  {
    "id": "gruvalcorp",
    "nombre": "Gruvalcorp S.A.",
    "frecuencia": "semanal",
    "diasEnvio": [4],
    "diasEntrega": [5],
    "transito": 1,
    "anticipacion": 1,
    "estricto": true,
    "gigante": false,
    "nota": "Prep Miércoles ➔ Envía Jueves",
    "posDiaEnvio": 4,
    "posDiaEntrega": 5,
    "sobrescribirEntrega": false
  },
  {
    "id": "piggis",
    "nombre": "Piggis Embutidos Pigem Cia. Ltda.",
    "frecuencia": "semanal",
    "diasEnvio": [4],
    "diasEntrega": [5],
    "transito": 1,
    "anticipacion": 1,
    "estricto": true,
    "gigante": false,
    "nota": "Prep Miércoles ➔ Envía Jueves",
    "posDiaEnvio": 4,
    "posDiaEntrega": 5,
    "sobrescribirEntrega": false
  },
  {
    "id": "cafrilosa",
    "nombre": "Industria de Alimentos Cafrilosa S.A.",
    "frecuencia": "semanal",
    "diasEnvio": [4],
    "diasEntrega": [5],
    "transito": 1,
    "anticipacion": 1,
    "estricto": true,
    "gigante": false,
    "nota": "Prep Miércoles ➔ Envía Jueves",
    "posDiaEnvio": 4,
    "posDiaEntrega": 5,
    "sobrescribirEntrega": false
  },
  {
    "id": "reylacteos",
    "nombre": "Reylacteos C.L.",
    "frecuencia": "semanal",
    "diasEnvio": [4],
    "diasEntrega": [5],
    "transito": 1,
    "anticipacion": 1,
    "estricto": true,
    "gigante": false,
    "nota": "Prep Miércoles ➔ Envía Jueves",
    "posDiaEnvio": 4,
    "posDiaEntrega": 5,
    "sobrescribirEntrega": false
  },
  {
    "id": "foproca",
    "nombre": "Foproca S.A. B.I.C.",
    "frecuencia": "semanal",
    "diasEnvio": [4],
    "diasEntrega": [5],
    "transito": 1,
    "anticipacion": 1,
    "estricto": true,
    "gigante": false,
    "nota": "Prep Miércoles ➔ Envía Jueves",
    "posDiaEnvio": 4,
    "posDiaEntrega": 5,
    "sobrescribirEntrega": false
  },
  {
    "id": "cerela",
    "nombre": "Cerela Guillermina Cevallos Intriago",
    "frecuencia": "quincenal24",
    "diasEnvio": [5],
    "diasEntrega": [5],
    "transito": 0,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "Lead time 8 horas (Mismo día)",
    "posDiaEnvio": 5,
    "posDiaEntrega": 5,
    "sobrescribirEntrega": false
  },
  {
    "id": "anahi-01",
    "nombre": "Distribuidora Anahi S.A. (Sucursal 01)",
    "frecuencia": "semanal",
    "diasEnvio": [5, 6],
    "diasEntrega": [1],
    "transito": 2,
    "anticipacion": 0,
    "estricto": false,
    "gigante": false,
    "nota": "Pedido sábado mañana para entrega Lunes",
    "posDiaEnvio": 6,
    "posDiaEntrega": 1,
    "sobrescribirEntrega": false
  },
  {
    "id": "alicorp",
    "nombre": "Alicorp Ecuador S.A.",
    "frecuencia": "semanal",
    "diasEnvio": [1, 2, 3, 4, 5, 6],
    "diasEntrega": [1],
    "transito": 2,
    "anticipacion": 0,
    "estricto": false,
    "gigante": false,
    "nota": "Pedido sábado mañana para entrega Lunes",
    "posDiaEnvio": 6,
    "posDiaEntrega": 1,
    "sobrescribirEntrega": false
  },
  {
    "id": "godoy-ruiz",
    "nombre": "Comercializadora Godoy Ruiz S.A.",
    "frecuencia": "quincenal13",
    "diasEnvio": [5, 6],
    "diasEntrega": [1],
    "transito": 2,
    "anticipacion": 0,
    "estricto": false,
    "gigante": false,
    "nota": "Pedido sábado mañana",
    "posDiaEnvio": 6,
    "posDiaEntrega": 1,
    "sobrescribirEntrega": false
  },
  {
    "id": "viteri-briones",
    "nombre": "Viteri Briones Armida Elizabeth",
    "frecuencia": "mensual",
    "diasEnvio": [5],
    "diasEntrega": [2],
    "transito": 4,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "Viernes visita obligatoria ➔ Entrega Martes fijo",
    "posDiaEnvio": 5,
    "posDiaEntrega": 2,
    "sobrescribirEntrega": false
  },
  {
    "id": "unilever",
    "nombre": "Unilever Andina Ecuador S.A.",
    "frecuencia": "mensual",
    "diasEnvio": [1, 2, 3, 4, 5],
    "diasEntrega": [3, 4, 5],
    "transito": 2,
    "anticipacion": 1,
    "estricto": false,
    "gigante": true,
    "nota": "Prep Martes ➔ Envía Miércoles para entrega Viernes",
    "posDiaEnvio": 3,
    "posDiaEntrega": 5,
    "sobrescribirEntrega": true
  },
  {
    "id": "induquiclor",
    "nombre": "Induquiclor S.A.",
    "frecuencia": "mensual",
    "diasEnvio": [4],
    "diasEntrega": [1],
    "transito": 4,
    "anticipacion": 1,
    "estricto": true,
    "gigante": false,
    "nota": "Prep Miércoles ➔ Envía Jueves para entrega Lunes (Ruta Daule)",
    "posDiaEnvio": 4,
    "posDiaEntrega": 1,
    "sobrescribirEntrega": false
  },
  {
    "id": "surtitodo",
    "nombre": "Surtitodo S.A.",
    "frecuencia": "mensual",
    "diasEnvio": [2],
    "diasEntrega": [3],
    "transito": 1,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "Martes pedido estricto",
    "posDiaEnvio": 2,
    "posDiaEntrega": 3,
    "sobrescribirEntrega": false
  },
  {
    "id": "pepsico",
    "nombre": "Pepsico Alimentos Ecuador Cia. Ltda.",
    "frecuencia": "quincenal13",
    "diasEnvio": [1],
    "diasEntrega": [3],
    "transito": 2,
    "anticipacion": 1,
    "estricto": true,
    "gigante": false,
    "nota": "Prep Domingo ➔ Envía Lunes",
    "posDiaEnvio": 1,
    "posDiaEntrega": 3,
    "sobrescribirEntrega": false
  },
  {
    "id": "macias-macias",
    "nombre": "Macias Macias Angel Lizandro",
    "frecuencia": "quincenal13",
    "diasEnvio": [1, 2],
    "diasEntrega": [3, 4],
    "transito": 2,
    "anticipacion": 1,
    "estricto": false,
    "gigante": false,
    "nota": "Prep Domingo ➔ Envía Lunes",
    "posDiaEnvio": 1,
    "posDiaEntrega": 3,
    "sobrescribirEntrega": false
  },
  {
    "id": "lacteos-san-antonio",
    "nombre": "Lacteos San Antonio C.A.",
    "frecuencia": "quincenal13",
    "diasEnvio": [2],
    "diasEntrega": [4],
    "transito": 2,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "",
    "posDiaEnvio": 2,
    "posDiaEntrega": 4,
    "sobrescribirEntrega": false
  },
  {
    "id": "colombina",
    "nombre": "Distribuidora Colombina del Ecuador S.A.",
    "frecuencia": "quincenal13",
    "diasEnvio": [2],
    "diasEntrega": [5],
    "transito": 3,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "Martes pedido estricto",
    "posDiaEnvio": 2,
    "posDiaEntrega": 5,
    "sobrescribirEntrega": false
  },
  {
    "id": "villavicencio",
    "nombre": "Villavicencio Villafuerte Dally Dalila",
    "frecuencia": "quincenal24",
    "diasEnvio": [2, 3],
    "diasEntrega": [5],
    "transito": 3,
    "anticipacion": 0,
    "estricto": false,
    "gigante": false,
    "nota": "",
    "posDiaEnvio": 2,
    "posDiaEntrega": 5,
    "sobrescribirEntrega": false
  },
  {
    "id": "alpina",
    "nombre": "Alpina Productos Alimenticios Alpiecuador S.A.",
    "frecuencia": "quincenal13",
    "diasEnvio": [3, 4],
    "diasEntrega": [5],
    "transito": 2,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "Miércoles haría pedido",
    "posDiaEnvio": 3,
    "posDiaEntrega": 5,
    "sobrescribirEntrega": false
  },
  {
    "id": "dacendi",
    "nombre": "Dacendi S.A.",
    "frecuencia": "quincenal13",
    "diasEnvio": [3],
    "diasEntrega": [4, 5],
    "transito": 2,
    "anticipacion": 0,
    "estricto": true,
    "gigante": false,
    "nota": "",
    "posDiaEnvio": 3,
    "posDiaEntrega": 5,
    "sobrescribirEntrega": false
  },
  {
    "id": "segarra-bermeo",
    "nombre": "Segarra Bermeo Evelyn Tatiana",
    "frecuencia": "quincenal24",
    "diasEnvio": [4, 5],
    "diasEntrega": [6],
    "transito": 2,
    "anticipacion": 1,
    "estricto": false,
    "gigante": false,
    "nota": "Prep Miércoles ➔ Envía Jueves",
    "posDiaEnvio": 4,
    "posDiaEntrega": 6,
    "sobrescribirEntrega": false
  },
  {
    "id": "nestle",
    "nombre": "Nestlé Ecuador S.A.",
    "frecuencia": "mensual",
    "diasEnvio": [5],
    "diasEntrega": [1, 2, 3, 4, 5],
    "transito": 3,
    "anticipacion": 1,
    "estricto": true,
    "gigante": false,
    "nota": "Prep Jueves ➔ Envía Viernes en borrador automático",
    "posDiaEnvio": 5,
    "posDiaEntrega": 1,
    "sobrescribirEntrega": false
  },
  {
    "id": "briones-contreras",
    "nombre": "Briones Contreras Scarleth Elizabeth",
    "frecuencia": "quincenal13",
    "diasEnvio": [5],
    "diasEntrega": [1],
    "transito": 3,
    "anticipacion": 1,
    "estricto": true,
    "gigante": false,
    "nota": "Prep Jueves ➔ Envía Viernes en borrador automático",
    "posDiaEnvio": 5,
    "posDiaEntrega": 1,
    "sobrescribirEntrega": false
  }
];
