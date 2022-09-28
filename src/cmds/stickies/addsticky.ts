import { CommandContext } from '../../types';
import { discordChannelSnowflakeRegex } from '../../utils/general';

async function exec(ctx: CommandContext) {
    if (ctx.args.length < 2) {
        return ctx.reply(`${ctx.config.emoji.error} You need to provide a channel to send to and a message to send.`);
    }

    const channel = ctx.args.shift();
    const channelIdRaw = channel.match(discordChannelSnowflakeRegex);
    if (!channelIdRaw) {
        return ctx.reply(`${ctx.config.emoji.error} You need to mention a channel or provide a snowflake.`);
    }

    const channelId = channelIdRaw[1];
    const channelObj = ctx.msg.channel.guild.channels.find(c => c.id === channelId);
    if (!channelObj) {
        return ctx.reply(`${ctx.config.emoji.error} Could not find channel.`);
    }

    const messageContent = ctx.args.join(' ');

    const msg = await ctx.bot.createMessage(channelObj.id, messageContent);

    await ctx.db.sticky.create({
        data: {
            channelId: channelObj.id,
            lastMessageId: msg.id,
            messageContent
        }
    });

    return ctx.reply(`${ctx.config.emoji.success} Sticky added.`);
}

export default {
    name: 'addsticky',
    description: 'Add a sticky.',
    args: '<channel(1)> <message...>',

    exec,
    level: 2
};
