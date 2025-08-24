const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports.data = new SlashCommandBuilder()
    .setName("status")
    .setDescription("Verifica o status do bot e envia as informações por DM");

module.exports.execute = async (interaction) => {
    try {
        // Defer com flags corretos
        await interaction.deferReply({ flags: 64 });

        const embed = new EmbedBuilder()
            .setTitle("Status do Bot")
            .setColor(0x2f3136)
            .addFields(
                { name: "Ativo", value: "✅ Sim", inline: true },
                { name: "Ping", value: `${interaction.client.ws.ping}ms`, inline: true },
                { name: "Dono", value: "@kyundaigaraki", inline: true },
                { name: "Servidores", value: `${interaction.client.guilds.cache.size}`, inline: true }
            )
            .setTimestamp();

        // Envia DM
        await interaction.user.send({ embeds: [embed] });

        // Confirma ao usuário que a DM foi enviada
        await interaction.followUp({ content: "📬 Verifique sua DM para o status do bot!", ephemeral: true });

    } catch (error) {
        console.error(error);
        // Se DM falhar, informa sem quebrar a interação
        if (!interaction.replied) {
            await interaction.followUp({ content: "❌ Não consegui enviar DM. Verifique se você permite DMs do servidor.", ephemeral: true });
        }
    }
};
