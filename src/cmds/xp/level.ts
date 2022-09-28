import { CommandContext } from '../../types';
import { getLevelForXp, getXpUntilNextLevel } from '../../utils/xp';

async function exec(ctx: CommandContext) {
    const user = await ctx.db.discordUser.findUnique({ where: { id: ctx.msg.member.id } });
    return ctx.reply({
        embed: {
            color: 0x63ffcb,
            fields: [
                {
                    name: 'Current Level',
                    value: getLevelForXp(user.xp),
                    inline: true
                },
                {
                    name: 'Current XP',
                    value: `${user.xp} ${ctx.config.emoji.xp}`,
                    inline: true
                },
                {
                    name: 'XP Until Next Level',
                    value: `${getXpUntilNextLevel(user.xp)} ${ctx.config.emoji.xp}`
                }
            ]
        }
    });
}

export default {
    name: 'level',
    description: 'Get your current level!',

    exec,
    level: 0
};
