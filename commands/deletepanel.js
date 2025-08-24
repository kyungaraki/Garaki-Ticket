const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder 
} = require("discord.js");

module.exports.data = new SlashCommandBuilder()
    .setName("deletepanel")
    .setDescription("Deleta um painel de tickets existente")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

module.exports.execute = async (interaction, db) => {
    await interaction.deferReply({ ephemeral: true });

    db.all(`SELECT * FROM ticket_panels WHERE guild_id = ?`, [interaction.guildId], async (err, rows) => {
        if (err) return await interaction.followUp({ content: "❌ Erro ao buscar painéis.", ephemeral: true });
        if (!rows.length) return await interaction.followUp({ content: "⚠️ Nenhum painel encontrado.", ephemeral: true });

        // Criar embed listando os painéis e suas descrições completas
        const embed = new EmbedBuilder()
            .setTitle("🗑 Painéis de Tickets Disponíveis")
            .setDescription(
                rows.map(row => `**${row.panel_name}**\n${row.panel_description || "*Sem descrição*"}\n`).join("\n")
            )
            .setColor("Red");

        // Menu só com nome curto (limite do Discord)
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("select_panel_to_delete")
            .setPlaceholder("Selecione o painel que deseja deletar")
            .addOptions(rows.map(row => ({
                label: row.panel_name.slice(0, 100),
                description: row.panel_description 
                    ? row.panel_description.slice(0, 97) + (row.panel_description.length > 97 ? "..." : "") 
                    : "Sem descrição",
                value: row.panel_name
            })));

        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.followUp({ 
            embeds: [embed], 
            components: [actionRow], 
            ephemeral: true 
        });
    });
};

module.exports.handleSelect = async (interaction, db) => {
    const painelNome = interaction.values[0];

    db.run(`DELETE FROM ticket_panels WHERE guild_id = ? AND panel_name = ?`, [interaction.guildId, painelNome], async (err) => {
        if (err) return console.error(err);
        await interaction.update({ content: `✅ Painel "${painelNome}" deletado com sucesso.`, components: [], embeds: [] });
    });
};
