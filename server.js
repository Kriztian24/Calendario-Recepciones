/* ============================================================
   server.js - Servidor compartido del Calendario
   ------------------------------------------------------------
   Sirve la aplicación (index.html, css, js) y guarda la base de
   datos central en db.json. Todos los equipos de la red se
   conectan a este servidor y ven los mismos datos en tiempo real
   (los cambios se propagan por Server-Sent Events).

   Uso (en la PC que queda de servidor):
       node server.js
   Los demás equipos abren en el navegador:
       http://<IP-de-esta-PC>:3000

   Nota: abre el puerto 3000 en el firewall de Windows si otros
   equipos no pueden conectarse.
   ============================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DB_FILE = path.join(ROOT, 'db.json');
const SEED_FILE = path.join(ROOT, 'data-proveedores.json');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

/* ------------------------------------------------------------
   Base de datos central (db.json)
   ------------------------------------------------------------ */

/* ensureDB(): crea db.json con la semilla la primera vez. */
function ensureDB() {
    if (!fs.existsSync(DB_FILE)) {
        const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
        fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
        console.log('Creado db.json con la semilla inicial.');
    }
}

/* readDB(): lee la base de datos actual. */
function readDB() {
    ensureDB();
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

/* writeDB(data): guarda la base de datos y avisa a todos los
   equipos conectados (tiempo real). */
function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    broadcast(data);
}

/* ------------------------------------------------------------
   Tiempo real: Server-Sent Events
   ------------------------------------------------------------ */

/* Conexiones SSE abiertas (una por navegador conectado) */
const clients = new Set();

/* broadcast(data): envía la base de datos a todos los clientes. */
function broadcast(data) {
    const msg = 'data: ' + JSON.stringify({ proveedores: data }) + '\n\n';
    for (const res of clients) {
        res.write(msg);
    }
}

/* ------------------------------------------------------------
   Servidor HTTP
   ------------------------------------------------------------ */
const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    // API: leer la base de datos
    if (url.pathname === '/api/proveedores' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(readDB()));
        return;
    }

    // API: guardar la base de datos (reemplaza el arreglo completo)
    if (url.pathname === '/api/proveedores' && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (!Array.isArray(data)) throw new Error('formato inválido');
                writeDB(data);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: true }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'JSON inválido' }));
            }
        });
        return;
    }

    // Canal de tiempo real (SSE)
    if (url.pathname === '/api/stream') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write(': conectado\n\n');
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return;
    }

    // Archivos estáticos
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const file = path.join(ROOT, '.' + pathname);
    if (!file.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Prohibido');
        return;
    }
    fs.readFile(file, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('No encontrado');
            return;
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
    });
});

/* ------------------------------------------------------------
   Arranque
   ------------------------------------------------------------ */

/* IP local para mostrar la URL a la que deben entrar los demás. */
function localIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            if (net.family === 'IPv4' && !net.internal) return net.address;
        }
    }
    return 'localhost';
}

server.listen(PORT, () => {
    ensureDB();
    console.log('==============================================');
    console.log(' Calendario compartido activo');
    console.log('  En esta PC:  http://localhost:' + PORT);
    console.log('  Otros equipos: http://' + localIP() + ':' + PORT);
    console.log(' Base de datos central: db.json');
    console.log('==============================================');
});