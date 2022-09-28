import { CommandContext } from '../../types';
import fs from 'fs';

const formulaSheet = fs.readFileSync('./resources/formula_sheet.png');

export default {
    name: 'mathhelp',
    description: 'Get some help with math.',
    usage: null,

    exec: async (ctx: CommandContext) => {
        await ctx.reply({
            file: {
                file: formulaSheet,
                name: 'formula_sheet.png'
            }
        });
    },
    level: 0
};
