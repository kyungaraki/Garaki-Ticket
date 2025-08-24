const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "database.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error(err);
    console.log("[DB] Banco conectado.");
});

// Criação da tabela guild_config
db.run(`
    CREATE TABLE IF NOT EXISTS guild_config (
        guild_id TEXT PRIMARY KEY,
        ticket_category TEXT,
        panel_channel TEXT,
        panel_image TEXT,
        embed_color INTEGER
    )
`);

// Criação da tabela ticket_panels
db.run(`
    CREATE TABLE IF NOT EXISTS ticket_panels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        panel_name TEXT NOT NULL,
        panel_channel TEXT,
        panel_category TEXT,
        panel_title TEXT DEFAULT 'Sistema de Tickets',
        panel_description TEXT DEFAULT 'Clique no botão abaixo para abrir um ticket.',
        panel_image TEXT DEFAULT '',
        panel_color INTEGER DEFAULT 0x2f3136,
        staff_role TEXT,
        UNIQUE(guild_id, panel_name)
    )
`);

db.close((err) => {
    if (err) return console.error(err);
    console.log("[DB] Banco fechado.");
});
