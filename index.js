const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

// ==== TE ADATAID (már beállítva) ====
const GUILD_ID = "1413606894005911685";
const STAFF_ROLE_ID = "1492078533013540905";
const TICKET_PANEL_CHANNEL_ID = "1413606894886457346";
// ===================================

let TICKET_CATEGORY_ID = null; // Automatikusan létrehozzuk vagy keresünk egyet

client.once('ready', async () => {
    console.log(`✅ Bot bejelentkezve: ${client.user.tag}`);
    
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
        console.log("❌ Nem találom a szervert!");
        return;
    }
    
    // Keresünk vagy létrehozunk egy "Tickets" kategóriát
    let category = guild.channels.cache.find(c => c.name === "TICKETS" && c.type === ChannelType.GuildCategory);
    if (!category) {
        category = await guild.channels.create({
            name: "TICKETS",
            type: ChannelType.GuildCategory
        });
        console.log("✅ Létrehoztam a TICKETS kategóriát");
    }
    TICKET_CATEGORY_ID = category.id;
    
    // Ticket panel elküldése (ha kell)
    const channel = client.channels.cache.get(TICKET_PANEL_CHANNEL_ID);
    if (channel) {
        // Töröljük a régi üzeneteket (hogy ne legyen duplikáció)
        const messages = await channel.messages.fetch({ limit: 10 });
        for (const msg of messages.values()) {
            if (msg.author.id === client.user.id) {
                await msg.delete();
            }
        }
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('🎫 Jelentkezés')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );
        
        await channel.send({
            content: '# 🛡️ Armada Security - Jelentkezés\n\nKattints a gombra egy új jelentkezési ticket nyitásához!\n\n`A staff hamarosan válaszol a jelentkezésedre.`',
            components: [row]
        });
        console.log('✅ Ticket panel elküldve');
    }
    
    // Slash parancsok regisztrálása
    const commands = [
        {
            name: 'close',
            description: 'A ticket bezárása'
        }
    ];
    
    await client.application.commands.set(commands);
    console.log('✅ Slash parancsok regisztrálva');
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    if (interaction.customId === 'create_ticket') {
        // Ellenőrizzük, van-e már nyitott tickete
        const existingChannel = interaction.guild.channels.cache.find(
            ch => ch.name === `jelentkezes-${interaction.user.username}` && 
                  ch.parentId === TICKET_CATEGORY_ID
        );
        
        if (existingChannel) {
            return interaction.reply({ 
                content: '❌ Már van egy nyitott jelentkezésed! Zárd be azt először.', 
                ephemeral: true 
            });
        }
        
        const channelName = `jelentkezes-${interaction.user.username}`;
        
        const permissions = [
            {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: interaction.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            },
            {
                id: STAFF_ROLE_ID,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            },
            {
                id: client.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            }
        ];
        
        try {
            const channel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID,
                permissionOverwrites: permissions,
            });
            
            const embed = new EmbedBuilder()
                .setTitle('🎫 Új jelentkezés')
                .setColor(0xc40000)
                .setDescription(`Kedves ${interaction.user}!\n\nKérlek, válaszolj az alábbi kérdésekre a jelentkezésedhez:\n\n` +
                    `**1.** Mi a karaktered IC neve?\n` +
                    `**2.** Kérlek, mutatkozz be **IC** szemszögből!\n` +
                    `**3.** Kérlek, mutatkozz be **OOC** szemszögből!\n` +
                    `**4.** Miért nálunk szeretnél dolgozni?\n` +
                    `**5.** Mennyi időt tudsz a frakcióra szánni?\n\n` +
                    `📝 A staff hamarosan válaszol a jelentkezésedre!\n` +
                    `Használd a \`/close\` parancsot a ticket bezárásához.`)
                .setFooter({ text: `Armada Security - Jelentkezési rendszer` });
            
            const closeButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('🔒 Ticket bezárása')
                        .setStyle(ButtonStyle.Danger)
                );
            
            await channel.send({ 
                content: `${interaction.user} <@&${STAFF_ROLE_ID}>`,
                embeds: [embed],
                components: [closeButton]
            });
            
            await interaction.reply({ 
                content: `✅ Ticket megnyitva: ${channel}`, 
                ephemeral: true 
            });
            
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '❌ Hiba történt a ticket létrehozásakor!', 
                ephemeral: true 
            });
        }
    }
    
    if (interaction.customId === 'close_ticket') {
        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_close')
                    .setLabel('✅ Igen, zárd be')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('cancel_close')
                    .setLabel('❌ Mégse')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await interaction.reply({
            content: 'Biztosan be szeretnéd zárni ezt a ticketet?',
            components: [confirmRow],
            ephemeral: true
        });
    }
    
    if (interaction.customId === 'confirm_close') {
        const channel = interaction.channel;
        
        const logEmbed = new EmbedBuilder()
            .setTitle('📝 Ticket bezárva')
            .setColor(0xff0000)
            .setDescription(`A ticketet bezárta: ${interaction.user}`)
            .addFields(
                { name: 'Csatorna', value: channel.name, inline: true },
                { name: 'Bezárás időpontja', value: new Date().toLocaleString(), inline: true }
            )
            .setTimestamp();
        
        await channel.send({ embeds: [logEmbed] });
        
        setTimeout(async () => {
            await channel.delete();
        }, 2000);
        
        await interaction.reply({ content: '✅ Ticket bezárva, a csatorna hamarosan törlődik...', ephemeral: true });
    }
    
    if (interaction.customId === 'cancel_close') {
        await interaction.reply({ content: '❌ Ticket bezárása megszakítva.', ephemeral: true });
    }
});

// Slash parancs kezelés
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand?.()) return;
    
    if (interaction.commandName === 'close') {
        if (!interaction.channel.name.startsWith('jelentkezes-')) {
            return interaction.reply({ content: '❌ Ez a parancs csak ticket csatornákban használható!', ephemeral: true });
        }
        
        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_close')
                    .setLabel('✅ Igen, zárd be')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('cancel_close')
                    .setLabel('❌ Mégse')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await interaction.reply({
            content: 'Biztosan be szeretnéd zárni ezt a ticketet?',
            components: [confirmRow],
            ephemeral: true
        });
    }
});
// Add ezt a bot kódodhoz az existing code mellé
const express = require('express');
const app = express();
app.use(express.json());

// Webhook endpoint a jelentkezések fogadására
app.post('/api/jelentkezes', async (req, res) => {
    const { icBemutatkozas, oocBemutatkozas, icNev, discordNev, telefonszam, deviceId } = req.body;
    
    console.log(`📥 Új jelentkezés érkezett: ${icNev} (${discordNev})`);
    
    // Keresd meg a jelentkező Discord ID-ját
    let user = null;
    const guild = client.guilds.cache.get("1413606894005911685");
    
    if (guild) {
        // Próbáljuk megkeresni a felhasználót a név alapján
        const members = await guild.members.fetch();
        user = members.find(m => m.user.username === discordNev || m.user.tag === discordNev);
    }
    
    // Ticket csatorna létrehozása
    const TICKET_CATEGORY_ID = "KATEGORIA_ID"; // A ticket kategória ID-ja
    const STAFF_ROLE_ID = "1492078533013540905";
    
    if (guild && user) {
        const channelName = `jelentkezes-${user.user.username}`;
        
        const permissions = [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
        ];
        
        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,
            permissionOverwrites: permissions,
        });
        
        const embed = new EmbedBuilder()
            .setTitle('🎫 ÚJ JELENTKEZÉS')
            .setColor(0xc40000)
            .addFields(
                { name: '🎮 IC név', value: icNev, inline: true },
                { name: '📞 IC telefonszám', value: telefonszam, inline: true },
                { name: '━━━━━━━━━━━━━━━━━━━━', value: '📝 IC BEMUTATKOZÁS', inline: false },
                { name: 'Tartalom', value: icBemutatkozas.length > 1000 ? icBemutatkozas.substring(0, 1000) + '...' : icBemutatkozas, inline: false },
                { name: '━━━━━━━━━━━━━━━━━━━━', value: '📝 OOC BEMUTATKOZÁS', inline: false },
                { name: 'Tartalom', value: oocBemutatkozas.length > 1000 ? oocBemutatkozas.substring(0, 1000) + '...' : oocBemutatkozas, inline: false }
            )
            .setFooter({ text: `Jelentkező: ${discordNev} | ID: ${deviceId}` })
            .setTimestamp();
        
        await channel.send({ content: `<@&${STAFF_ROLE_ID}>`, embeds: [embed] });
        await channel.send({ content: `📢 ${user}, a jelentkezésed megérkezett! A staff hamarosan válaszol.` });
        
        res.json({ success: true, message: `Ticket nyitva: ${channel.name}` });
    } else {
        res.status(404).json({ success: false, message: "Nem található a felhasználó ezen a szerveren!" });
    }
});

// HTTP szerver indítása
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ API szerver fut a ${PORT} porton`);
});

client.login(process.env.DISCORD_TOKEN);