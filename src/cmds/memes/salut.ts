import { CommandContext } from '../../types';

export default {
    name: 'salut',
    description: 'o7',

    async exec(ctx: CommandContext) {
        return await ctx.reply('o7');
    },
    level: 1
};
