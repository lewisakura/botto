import { CommandContext } from '../../types';
import { strikeWeightMap } from '../../utils/strike';

async function exec(ctx: CommandContext) {
    let reasons = '**Reasons**\n\n';

    for (const [reason, weight] of Object.entries(strikeWeightMap)) {
        reasons += '`' + reason + '` - ' + weight + '\n';
    }

    return ctx.reply(reasons);
}

export default {
    name: 'strikereasons',
    aliases: ['warnreasons'],
    description: 'Lists reasons for warnings and their weights.',

    exec,
    level: 1
};
