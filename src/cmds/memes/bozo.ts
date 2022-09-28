import { CommandContext } from '../../types';

export default {
    name: 'bozo',
    description: 'RIP Bozo.',

    async exec(ctx: CommandContext) {
        return await ctx.reply('https://tenor.com/view/rip-bozo-gif-22294771');
    },
    level: 1
};
