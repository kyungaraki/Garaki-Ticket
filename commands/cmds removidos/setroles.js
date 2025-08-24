const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports.data = new SlashCommandBuilder()
    .setName("setroles")
    .setDescription("Define os cargos que podem abrir ou atender tickets")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
        option.setName("roles")
            .setDescription("IDs dos cargos separados por vírgula")
            .setRequired(true));

module.exports.execute = async (interaction, db) => {
    const roles = interaction.options.getString("roles").split(",").map(r => r.trim());
    db.run(`INSERT INTO guild_config (guild_id, ticket_roles) VALUES (?, ?)
            ON CONFLICT(guild_id) DO UPDATE SET ticket_roles = ?`,
        [interaction.guildId, roles.join(","), roles.join(",")]);
    await interaction.reply({ content: `✅ Cargos configurados: ${roles.join(", ")}`, ephemeral: true });
};
