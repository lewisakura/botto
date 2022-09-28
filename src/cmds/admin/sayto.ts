import { CommandContext } from '../../types';
import { discordChannelSnowflakeRegex } from '../../utils/general';

export default {
    name: 'sayto',
    description: 'Says a message to a specific channel!',
    usage: '<channel ID> <message...>',

    async exec(ctx: CommandContext) {
        if (ctx.args.length < 2) {
            return ctx.reply(
                `${ctx.config.emoji.error} You need to provide a channel to send to and a message to send.`
            );
        }

        const channel = ctx.args.shift();
        const channelIdRaw = channel.match(discordChannelSnowflakeRegex);
        if (!channelIdRaw) {
            return ctx.reply(
                `${ctx.config.emoji.error} You need to mention a channel or provide a snowflake.`
            );
        }

        const channelId = channelIdRaw[1];
        const channelObj = ctx.msg.channel.guild.channels.find(c => c.id === channelId);
        if (!channelObj) {
            return ctx.reply(`${ctx.config.emoji.error} Could not find channel.`);
        }

        ctx.reply({ content: ctx.args.join(' '), messageReference: null }, channelObj.id);
        return ctx.reply(ctx.config.emoji.success);
    },
    level: 5
};
