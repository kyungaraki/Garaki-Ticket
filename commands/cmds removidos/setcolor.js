const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require("discord.js");

module.exports.data = new SlashCommandBuilder()
    .setName("setcolor")
    .setDescription("Altera a cor de um painel existente")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

module.exports.execute = async (interaction, db) => {
    await interaction.deferReply({ flags: 64 });

    db.all(`SELECT * FROM ticket_panels WHERE guild_id = ?`, [interaction.guildId], async (err, rows) => {
        if (err) return await interaction.followUp({ content: "❌ Erro ao buscar painéis.", ephemeral: true });
        if (!rows.length) return await interaction.followUp({ content: "⚠️ Nenhum painel encontrado.", ephemeral: true });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("select_panel_to_change_color")
            .setPlaceholder("Selecione o painel que deseja alterar a cor")
            .addOptions(rows.map(row => ({
                label: row.panel_name,
                description: row.panel_description,
                value: row.panel_name
            })));

        const actionRow = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.followUp({ content: "Selecione o painel que deseja alterar a cor:", components: [actionRow], ephemeral: true });
    });
};

module.exports.handleSelect = async (interaction, db) => {
    const painelNome = interaction.values[0];
    await interaction.followUp({ content: `Digite a nova cor em HEX para o painel "${painelNome}" (ex: #2f3136):`, ephemeral: true });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on("collect", async m => {
        let novaCor = m.content.trim();
        if (novaCor.startsWith("#")) novaCor = novaCor.slice(1);
        const corInt = parseInt(novaCor, 16);
        if (isNaN(corInt)) return interaction.followUp({ content: "❌ Cor inválida.", ephemeral: true });

        db.run(`UPDATE ticket_panels SET panel_color = ? WHERE guild_id = ? AND panel_name = ?`, [corInt, interaction.guildId, painelNome], async (err) => {
            if (err) return console.error(err);
            await interaction.followUp({ content: `✅ Cor do painel "${painelNome}" alterada com sucesso!`, ephemeral: true });
        });
    });

    collector.on("end", collected => {
        if (collected.size === 0) interaction.followUp({ content: "⚠️ Tempo expirado para digitar a cor.", ephemeral: true });
    });
};
