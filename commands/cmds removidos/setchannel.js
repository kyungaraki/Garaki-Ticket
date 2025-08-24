const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports.data = new SlashCommandBuilder()
    .setName("setchannel")
    .setDescription("Define o canal onde o painel será enviado.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
        option.setName("id")
            .setDescription("ID do canal")
            .setRequired(true));

module.exports.execute = async (interaction, db) => {
    const id = interaction.options.getString("id");
    db.run(`INSERT INTO guild_config (guild_id, panel_channel) VALUES (?, ?)
            ON CONFLICT(guild_id) DO UPDATE SET panel_channel = ?`, [interaction.guildId, id, id]);
    await interaction.reply({ content: `✅ Canal definido: ${id}`, ephemeral: true });
};
