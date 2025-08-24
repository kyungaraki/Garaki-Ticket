const {
    Client,
    GatewayIntentBits,
    Collection,
    REST,
    Routes,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const express = require("express"); // Servidor web
const config = require("./config.json");
const discordTranscripts = require("discord-html-transcripts");

const PORT = 3000;
const PUBLIC_IP = "45.89.30.205";

// ===== Banco de Dados =====
const db = new sqlite3.Database("./database.sqlite", (err) => {
    if (err) console.error(err);
    else console.log("[DB] Banco conectado.");
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS guild_config (
        guild_id TEXT PRIMARY KEY,
        ticket_category TEXT,
        panel_channel TEXT,
        panel_image TEXT,
        embed_color INTEGER
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS ticket_panels (
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
        log_channel TEXT,
        UNIQUE(guild_id, panel_name)
    )`);
});

// ===== Servidor Express para servir os transcripts =====
const app = express();
app.use("/transcripts", express.static(path.join(__dirname, "transcripts")));
app.listen(PORT, () => {
    console.log(`[WEB] Servindo transcripts em http://${PUBLIC_IP}:${PORT}/transcripts`);
});

// ===== Cliente Discord =====
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
client.selectHandlers = new Collection();

const commandFiles = fs.readdirSync(path.join(__dirname, "commands")).filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    if (command.handleSelect) client.selectHandlers.set(command.data.name, command.handleSelect);
}

client.once("ready", async () => {
    console.log(`[BOT] Logado como ${client.user.tag}`);
    const rest = new REST({ version: "10" }).setToken(config.token);
    try {
        const commands = Array.from(client.commands.values()).map(cmd => cmd.data.toJSON());
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log("[BOT] Comandos registrados.");
    } catch (err) {
        console.error(err);
    }
});

// ===== Função Criar Ticket =====
async function createTicket(interaction, row) {
    if (!row.staff_role) return interaction.reply({ content: "⚠️ Cargo da staff não configurado para este painel.", ephemeral: true });

    const staffRole = interaction.guild.roles.cache.get(row.staff_role);
    if (!staffRole) return interaction.reply({ content: "⚠️ Cargo da staff não encontrado.", ephemeral: true });

    const ticketName = `ticket-${interaction.user.username.toLowerCase()}`;
    const existing = interaction.guild.channels.cache.find(c => c.name === ticketName && c.type === ChannelType.GuildText);
    if (existing) return interaction.reply({ content: `⚠️ Você já tem um ticket aberto: ${existing}`, ephemeral: true });

    const ticketChannel = await interaction.guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: row.panel_category,
        permissionOverwrites: [
            { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
        ]
    });

    const embed = new EmbedBuilder()
        .setTitle(row.panel_title || "🎟️ Ticket Aberto")
        .setDescription(`Olá ${interaction.user}, aguarde a equipe responder.`)
        .setColor(row.panel_color || 0x2f3136)
        .setImage(row.panel_image || null);

    const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Fechar Ticket")
            .setStyle(ButtonStyle.Secondary)
    );

    await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed], components: [closeButton] });
    await interaction.reply({ content: `✅ Ticket criado: ${ticketChannel}`, ephemeral: true });
}

// ===== CSS Customizado =====
const customCSS = `
body { background-color: #2f3136; font-family: 'Whitney','Helvetica Neue',Helvetica,Arial,sans-serif; margin:0; padding:0; color:#dcddde; }
.transcript-container { max-width: 800px; margin: 20px auto; padding: 10px; }
.message { display: flex; padding: 8px; margin-bottom: 5px; border-radius: 6px; transition: background 0.2s; }
.message:hover { background-color: #32353b; }
.avatar { border-radius: 50%; width: 40px; height: 40px; margin-right: 10px; }
.meta { display: flex; align-items: center; }
.username { font-weight: bold; color: #fff; margin-right: 6px; }
.timestamp { font-size: 0.75rem; color: #72767d; }
.content { white-space: pre-wrap; word-wrap: break-word; }
.attachment { margin-top: 5px; }
`;

// ===== Interações =====
client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isStringSelectMenu()) {
            const handler = client.selectHandlers.get(interaction.customId.split("_")[0]);
            if (handler) return handler(interaction, db);
        }

        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction, db);
        }

        if (interaction.isButton()) {
            if (interaction.customId.startsWith("open_ticket_")) {
                const painelNome = interaction.customId.replace("open_ticket_", "");
                db.get(`SELECT * FROM ticket_panels WHERE guild_id = ? AND panel_name = ?`, [interaction.guildId, painelNome], async (err, row) => {
                    if (err) return console.error(err);
                    if (!row || !row.panel_category) return interaction.reply({ content: "⚠️ Categoria não configurada.", ephemeral: true });
                    await createTicket(interaction, row);
                });
            }

            if (interaction.customId === "close_ticket") {
                await interaction.deferReply({ ephemeral: true });

                db.get(`SELECT * FROM ticket_panels WHERE guild_id = ? AND panel_category = ?`, [interaction.guildId, interaction.channel.parentId], async (err, panel) => {
                    if (err) {
                        console.error(err);
                        return interaction.followUp({ content: "❌ Erro ao buscar painel.", ephemeral: true });
                    }

                    if (!panel) {
                        return interaction.followUp({ content: "⚠️ Painel não encontrado para esta categoria.", ephemeral: true });
                    }

                    // 🔒 Apenas o cargo da staff pode fechar
                    const staffRole = interaction.guild.roles.cache.get(panel.staff_role);
                    if (!staffRole) {
                        return interaction.followUp({ content: "⚠️ Cargo da staff não configurado ou não encontrado.", ephemeral: true });
                    }
                    if (!interaction.member.roles.cache.has(staffRole.id)) {
                        return interaction.followUp({ content: "❌ Aguarde um membro da nossa equipe para fechar esse ticket.", ephemeral: true });
                    }

                    const logChannel = interaction.guild.channels.cache.get(panel.log_channel);

                    if (!fs.existsSync("transcripts")) fs.mkdirSync("transcripts");

                    const fileName = `transcript-${interaction.channel.name}-${Date.now()}.html`;
                    const filePath = path.join(__dirname, "transcripts", fileName);

                    const attachment = await discordTranscripts.createTranscript(interaction.channel, {
                        limit: -1,
                        returnType: "string",
                        filename: fileName,
                        footerText: "Exported {number} message{s}",
                        poweredBy: false,
                        css: customCSS
                    });

                    fs.writeFileSync(filePath, attachment);

                    if (logChannel) {
                        const transcriptButton = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setLabel("📂 Ver Transcript")
                                .setStyle(ButtonStyle.Link)
                                .setURL(`http://${PUBLIC_IP}:${PORT}/transcripts/${fileName}`)
                        );

                        await logChannel.send({
                            content: `📄 Transcript do ticket ${interaction.channel.name}:`,
                            components: [transcriptButton]
                        });
                    }

                    await interaction.followUp({ content: "✅ Ticket fechado e transcript enviado.", ephemeral: true });
                    setTimeout(() => interaction.channel.delete().catch(() => {}), 1000);
                });
            }
        }
    } catch (err) {
        console.error(err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "❌ Erro ao executar comando.", ephemeral: true });
        } else {
            await interaction.followUp({ content: "❌ Erro ao executar comando.", ephemeral: true });
        }
    }
});

client.login(config.token);
