import { CommandContext } from '../../types';

export default {
    name: 'credits',
    description: 'Gives insight on who created BOTTO.',
    aliases: ['credit'],

    async exec(ctx: CommandContext) {
        ctx.reply(
            "BOTTOボット was created primarily by LewisTehMinerz (<@96269247411400704>), and contributed to by TamperedReality (<@884818518279864400>).\n\nIt is canon that BOTTOボット is a girl.");
    },
    level: 0
};
