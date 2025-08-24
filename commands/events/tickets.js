import { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const name = "interactionCreate";

export async function execute(interaction, db) {
    if (!interaction.isButton()) return;

    if (interaction.customId === "open_ticket") {
        await interaction.deferReply({ flags: 64 });

        db.get(`SELECT * FROM guild_config WHERE guild_id = ?`, [interaction.guildId], async (err, row) => {
            if (err) {
                console.error(err);
                return await interaction.followUp({ content: "❌ Erro ao acessar configuração do servidor.", flags: 64 });
            }

            if (!row || !row.ticket_category) {
                return await interaction.followUp({ content: "⚠️ Categoria de tickets não configurada.", flags: 64 });
            }

            const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.username.toLowerCase()}` && c.type === ChannelType.GuildText);
            if (existing) {
                return await interaction.followUp({ content: `⚠️ Você já tem um ticket aberto: ${existing}`, flags: 64 });
            }

            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: row.ticket_category,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    }
                ]
            });

            const embed = new EmbedBuilder()
                .setColor(row.embed_color ? parseInt(row.embed_color.replace("#","0x")) : 0x2f3136)
                .setTitle("🎟️ Ticket Aberto")
                .setDescription(`Olá ${interaction.user}, um membro da equipe irá responder em breve.`);

            const closeButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("close_ticket")
                    .setLabel("Fechar Ticket")
                    .setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed], components: [closeButton] });
            await interaction.followUp({ content: `✅ Ticket criado: ${ticketChannel}`, flags: 64 });
        });
    }

    if (interaction.customId === "close_ticket") {
        await interaction.channel.send({ content: "⏳ Fechando ticket em 5 segundos..." });
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
    }
}
