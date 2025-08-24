const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports.data = new SlashCommandBuilder()
    .setName("setcategory")
    .setDescription("Define a categoria para criar tickets.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
        option.setName("id")
            .setDescription("ID da categoria")
            .setRequired(true));

module.exports.execute = async (interaction, db) => {
    const id = interaction.options.getString("id");
    db.run(`INSERT INTO guild_config (guild_id, ticket_category) VALUES (?, ?)
            ON CONFLICT(guild_id) DO UPDATE SET ticket_category = ?`, [interaction.guildId, id, id]);
    await interaction.reply({ content: `✅ Categoria definida: ${id}`, ephemeral: true });
};
