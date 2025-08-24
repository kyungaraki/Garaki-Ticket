const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports.data = new SlashCommandBuilder()
    .setName("setimage")
    .setDescription("Define imagem ou GIF do painel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
        option.setName("url")
            .setDescription("URL da imagem/GIF")
            .setRequired(true));

module.exports.execute = async (interaction, db) => {
    const url = interaction.options.getString("url");
    db.run(`INSERT INTO guild_config (guild_id, panel_image) VALUES (?, ?)
            ON CONFLICT(guild_id) DO UPDATE SET panel_image = ?`, [interaction.guildId, url, url]);
    await interaction.reply({ content: `✅ Imagem definida: ${url}`, ephemeral: true });
};
