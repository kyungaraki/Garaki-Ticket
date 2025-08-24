const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

function resumoDescricao(texto, limite = 100) {
    if (!texto) return "";
    texto = texto.trim().replace(/\s+/g, " ");
    const chars = [...texto]; // Conta corretamente inclusive emojis
    if (chars.length > limite) {
        return chars.slice(0, limite - 3).join('') + "...";
    }
    return texto;
}

module.exports.data = new SlashCommandBuilder()
    .setName("sendpanel")
    .setDescription("Envia um painel de tickets existente em um canal")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

module.exports.execute = async (interaction, db) => {
    await interaction.deferReply({ flags: 64 }); // substituindo ephemeral

    db.all(`SELECT * FROM ticket_panels WHERE guild_id = ?`, [interaction.guildId], async (err, rows) => {
        if (err) return await interaction.editReply({ content: "❌ Erro ao buscar painéis." });
        if (!rows.length) return await interaction.editReply({ content: "⚠️ Nenhum painel encontrado." });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("select_panel_to_send")
            .setPlaceholder("Selecione o painel que deseja enviar")
            .addOptions(
                rows.map(row => {
                    let desc = resumoDescricao(row.panel_description || "", 100);
                    return {
                        label: row.panel_name.slice(0, 100),
                        description: desc && desc.length > 0 ? desc : undefined,
                        value: row.panel_name
                    };
                })
            );

        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({ content: "Selecione o painel que deseja enviar:", components: [actionRow] });
    });
};

module.exports.handleSelect = async (interaction, db) => {
    const painelNome = interaction.values[0];

    db.get(`SELECT * FROM ticket_panels WHERE guild_id = ? AND panel_name = ?`, [interaction.guildId, painelNome], async (err, row) => {
        if (err) return console.error(err);
        if (!row) return await interaction.update({ content: "❌ Painel não encontrado.", components: [] });

        const embed = new EmbedBuilder()
            .setTitle(row.panel_title)
            .setDescription(row.panel_description)
            .setColor(row.panel_color || 0x2f3136)
            .setImage(row.panel_image || null);

        const openButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`open_ticket_${row.panel_name}`)
                .setLabel("Abrir Ticket")
                .setStyle(ButtonStyle.Secondary)
        );

        const canal = interaction.guild.channels.cache.get(row.panel_channel);
        if (!canal) return await interaction.update({ content: "⚠️ Canal configurado não encontrado.", components: [] });

        await canal.send({ embeds: [embed], components: [openButton] });
        await interaction.update({ content: `✅ Painel "${row.panel_name}" enviado em ${canal}`, components: [] });
    });
};
