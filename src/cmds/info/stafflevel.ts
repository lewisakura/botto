import { CommandContext } from '../../types';

export default {
    name: 'stafflevel',
    description: 'Get your staff level on BOTTO.',

    async exec(ctx: CommandContext) {
        let explanation = '';
        for (const [level, name] of Object.entries(ctx.config.levelNames)) {
            explanation += `- Level ${level} - ${name}\n`;
        }

        await ctx.reply('ℹ️ You are staff level ' + ctx.userStaffLevel + '.\n\nStaff levels and meanings:\n' + explanation);
    },
    level: 0
};
