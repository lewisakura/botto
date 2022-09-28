import { CommandContext } from '../../types';
import { calculateStrikeWeight, cutoff } from '../../utils/strike';
import { discordSnowflakeRegex } from '../../utils/general';

async function exec(ctx: CommandContext) {
    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments.');
    }

    const userIdRaw = ctx.args.shift().match(discordSnowflakeRegex);

    if (!userIdRaw) {
        return ctx.reply(ctx.config.emoji.error + ' You need to mention a user or provide a snowflake.');
    }

    const userId = userIdRaw[1];
    const member = ctx.msg.channel.guild.members.find(m => m.id === userId);
    if (!member) {
        return ctx.reply(ctx.config.emoji.error + ' Could not find user.');
    }

    const msg = await ctx.reply(ctx.config.emoji.loading + ' Loading information...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cutoff);

    const discordUser = await ctx.db.discordUser.findUnique({
        where: { id: member.id },
        include: { strikes: true }
    });

    const strikes = discordUser.strikes
        .map(strike => {
            strike.weight = calculateStrikeWeight(strike, cutoffDate);
            return strike;
        })
        .filter(strike => strike.weight > 0);

    if (strikes.length > 0) {
        return msg.edit(
            `**Strikes**\n\n${strikes
                .map(
                    strike =>
                        `- ID ${strike.id} - ${strike.reason} (weight: ${strike.weight}) - issued by <@${
                            strike.actor
                        }> <t:${Math.floor(strike.at.getTime() / 1000)}:R>`
                )
                .join('\n')}`
        );
    } else {
        return msg.edit(`${ctx.config.emoji.success} User has no strikes.`);
    }
}

export default {
    name: 'strikes',
    aliases: ['warns'],
    description: "Gets a user's strikes.",
    usage: '<user(1)>',

    exec,
    level: 1
};
