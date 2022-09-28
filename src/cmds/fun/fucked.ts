import { CommandContext } from '../../types';
import fs from 'fs';

const shitsFucked = fs.readFileSync('./resources/fucked.mp4');

export default {
    name: 'fucked',
    aliases: ['shitsfucked'],
    description: "When shit's fucked.",
    usage: null,

    exec: async (ctx: CommandContext) => {
        await ctx.reply({
            file: {
                file: shitsFucked,
                name: 'fucked.mp4'
            }
        });
    },
    level: 1
};
