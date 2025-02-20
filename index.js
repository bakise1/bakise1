require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require("discord.js");
const mongoose = require("mongoose");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

const prefix = process.env.PREFIX;

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connecté à MongoDB"))
    .catch(err => console.log(err));

// Modèle pour stocker les paramètres d'auto-modération
const autoModSchema = new mongoose.Schema({ guildId: String, enabled: Boolean });
const AutoMod = mongoose.model("AutoMod", autoModSchema);

// Quand le bot est prêt
client.once("ready", () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

// Écoute les messages
client.on("messageCreate", async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // !automod (activer/désactiver)
    if (command === "automod") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply("❌ Tu n'as pas la permission !");
        const guildData = await AutoMod.findOne({ guildId: message.guild.id });
        if (!guildData) {
            await new AutoMod({ guildId: message.guild.id, enabled: true }).save();
            return message.reply("✅ Auto-modération activée !");
        }
        guildData.enabled = !guildData.enabled;
        await guildData.save();
        return message.reply(`🔧 Auto-modération ${guildData.enabled ? "activée" : "désactivée"} !`);
    }

    // !ban
    if (command === "ban") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply("❌ Tu n'as pas la permission !");
        const user = message.mentions.members.first();
        if (!user) return message.reply("🔍 Mentionne un utilisateur !");
        await user.ban();
        return message.reply(`🔨 ${user.user.tag} a été banni !`);
    }

    // !kick
    if (command === "kick") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return message.reply("❌ Tu n'as pas la permission !");
        const user = message.mentions.members.first();
        if (!user) return message.reply("🔍 Mentionne un utilisateur !");
        await user.kick();
        return message.reply(`👢 ${user.user.tag} a été expulsé !`);
    }

    // !mute (temporaire)
    if (command === "mute") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MuteMembers)) return message.reply("❌ Tu n'as pas la permission !");
        const user = message.mentions.members.first();
        if (!user) return message.reply("🔍 Mentionne un utilisateur !");
        const muteRole = message.guild.roles.cache.find(r => r.name === "Muted");
        if (!muteRole) return message.reply("🚫 Aucun rôle 'Muted' trouvé !");
        await user.roles.add(muteRole);
        return message.reply(`🔇 ${user.user.tag} a été muté !`);
    }

    // !help
    if (command === "help") {
        const embed = new EmbedBuilder()
            .setTitle("📜 Liste des commandes")
            .setColor("#00AAFF")
            .addFields(
                { name: "!automod", value: "Active/désactive l'auto-modération" },
                { name: "!ban", value: "Bannit un utilisateur" },
                { name: "!kick", value: "Expulse un utilisateur" },
                { name: "!mute", value: "Mute un utilisateur (temporaire)" },
                { name: "!logs-automod", value: "Affiche les logs d'auto-modération" }
            );
        return message.channel.send({ embeds: [embed] });
    }

    // !informations
    if (command === "informations") {
        return message.reply(`🤖 Je suis un bot créé pour modérer le serveur !`);
    }

    // !logs-automod (affichage des logs d'auto-modération)
    if (command === "logs-automod") {
        const guildData = await AutoMod.findOne({ guildId: message.guild.id });
        if (!guildData || !guildData.enabled) return message.reply("🚫 L'auto-modération est désactivée !");
        return message.reply("📜 Logs d'auto-modération activés !");
    }
});

// Connexion du bot
client.login(process.env.TOKEN);
