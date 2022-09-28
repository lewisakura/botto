import Eris from 'eris';
import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments.');
    }

    const strikeId = parseInt(ctx.args[0]);
    if (isNaN(strikeId) || strikeId < 0) {
        return ctx.reply(ctx.config.emoji.error + ' ID must be a positive number.');
    }

    const strike = await ctx.db.strike.findUnique({ where: { id: strikeId } });
    if (!strike) {
        return ctx.reply(`${ctx.config.emoji.error} Strike not found.`);
    }

    await ctx.db.strike.delete({ where: { id: strikeId } });

    const msg = await ctx.reply(`${ctx.config.emoji.loading} Processing, please wait...`);

    const modlogChannel = ctx.bot.getChannel(ctx.config.modlogChannel) as Eris.TextChannel;
    await modlogChannel.createMessage({
        embed: {
            title: `Strike #${strike.id} Revoked`,
            color: 0xff6b6b,
            fields: [
                {
                    name: 'Issued To',
                    value: `<@${strike.discordUserId}>`,
                    inline: true
                },
                {
                    name: 'Actor',
                    value: `<@${strike.actor}>`,
                    inline: true
                },
                {
                    name: 'Revoker',
                    value: ctx.msg.author.mention,
                    inline: true
                },
                {
                    name: 'Revoked',
                    value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                    inline: true
                }
            ]
        }
    });

    return msg.edit(
        `${ctx.config.emoji.success} Strike revoked. Any escalated punishments will have to be reverted manually.`
    );
}

export default {
    name: 'unstrike',
    aliases: ['unwarn', 'delstrike', 'delwarn'],
    description: 'Removes a strike.',
    usage: '<strike id(1)>',

    exec,
    level: 1
};
