const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require("discord.js");

module.exports.data = new SlashCommandBuilder()
    .setName("setpanel")
    .setDescription("Configura ou cria um painel de tickets")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // -------------------- Campos obrigatórios --------------------
    .addStringOption(option =>
        option.setName("nome")
            .setDescription("Nome do painel")
            .setRequired(true))
    .addChannelOption(option =>
        option.setName("canal")
            .setDescription("Canal do painel")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText))
    .addChannelOption(option =>
        option.setName("categoria")
            .setDescription("Categoria onde os tickets serão criados")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory))
    .addStringOption(option =>
        option.setName("titulo")
            .setDescription("Título do painel")
            .setRequired(true))
    .addStringOption(option =>
        option.setName("descricao")
            .setDescription("Descrição do painel")
            .setRequired(true))
    .addRoleOption(option =>
        option.setName("staff")
            .setDescription("Cargo da staff que poderá atender os tickets")
            .setRequired(true))
    // -------------------- Campo opcional --------------------
    .addChannelOption(option =>
        option.setName("log")
            .setDescription("Canal de logs para os transcripts")
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText))
    .addStringOption(option =>
        option.setName("imagem")
            .setDescription("URL da imagem do painel")
            .setRequired(false))
    .addStringOption(option =>
        option.setName("cor")
            .setDescription("Cor do painel em HEX (ex: #FF0000)")
            .setRequired(false));

module.exports.execute = async (interaction, db) => {
    await interaction.deferReply({ ephemeral: true });

    const nome = interaction.options.getString("nome");
    const canal = interaction.options.getChannel("canal").id;
    const categoria = interaction.options.getChannel("categoria").id;
    const titulo = interaction.options.getString("titulo");
    const descricao = interaction.options.getString("descricao");
    const staffRole = interaction.options.getRole("staff");
    const logChannel = interaction.options.getChannel("log") ? interaction.options.getChannel("log").id : null;
    const imagem = interaction.options.getString("imagem") || "";
    let cor = interaction.options.getString("cor") || "#2f3136";

    if (cor.startsWith("#")) cor = cor.slice(1);
    const corInt = parseInt(cor, 16) || 0x2f3136;

    // Salva no banco incluindo canal de logs
    db.run(`
        INSERT INTO ticket_panels 
        (guild_id, panel_name, panel_channel, panel_category, panel_title, panel_description, panel_image, panel_color, staff_role, log_channel)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, panel_name) DO UPDATE SET
            panel_channel = excluded.panel_channel,
            panel_category = excluded.panel_category,
            panel_title = excluded.panel_title,
            panel_description = excluded.panel_description,
            panel_image = excluded.panel_image,
            panel_color = excluded.panel_color,
            staff_role = excluded.staff_role,
            log_channel = excluded.log_channel
    `, [interaction.guildId, nome, canal, categoria, titulo, descricao, imagem, corInt, staffRole.id, logChannel]);

    // Cria embed
    const embed = new EmbedBuilder()
        .setTitle(titulo)
        .setDescription(descricao)
        .setColor(corInt);

    if (imagem) embed.setImage(imagem);

    // Botão para abrir ticket (cinza escuro)
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`open_ticket_${nome}`)
                .setLabel("Abrir Ticket")
                .setStyle(ButtonStyle.Secondary)
        );

    const painelChannel = interaction.guild.channels.cache.get(canal);
    if (painelChannel) {
        await painelChannel.send({ embeds: [embed], components: [row] });
    }

    await interaction.editReply({ content: `✅ Painel "${nome}" criado/atualizado com sucesso! Cargo da staff: ${staffRole.name}` });
};
