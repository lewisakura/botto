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

    return ctx.reply({
        embed: {
            title: `Strike #${strikeId}`,
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
                    name: 'Reason',
                    value: strike.reason,
                    inline: true
                },
                {
                    name: 'Weight',
                    value: strike.weight,
                    inline: true
                },
                {
                    name: 'Issued',
                    value: `<t:${Math.floor(strike.at.getTime() / 1000)}:R>`,
                    inline: true
                }
            ]
        }
    });
}

export default {
    name: 'strikeinfo',
    aliases: ['warninfo'],
    description: 'Gets strike information.',
    usage: '<strike id(1)>',

    exec,
    level: 1
};
