import { CommandContext } from '../../types';
import fs from 'fs';

const shitsUnfucked = fs.readFileSync('./resources/unfucked.mp4');

export default {
    name: 'unfucked',
    aliases: ['shitsunfucked'],
    description: "When shit's unfucked.",
    usage: null,

    exec: async (ctx: CommandContext) => {
        await ctx.reply({
            file: {
                file: shitsUnfucked,
                name: 'unfucked.mp4'
            }
        });
    },
    level: 1
};
