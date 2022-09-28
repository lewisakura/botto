import { CommandContext } from '../../types';

export default {
    name: 'len',
    description: 'ohohohoho',

    async exec(ctx: CommandContext) {
        return await ctx.reply('( ͡° ͜ʖ ͡°)');
    },
    level: 1
};
