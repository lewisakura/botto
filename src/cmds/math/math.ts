import { generateMathEquation } from '../../utils/math';
import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    let complexity = 3;

    if (ctx.args.length > 0) {
        const newComplexity = Number(ctx.args[0]);
        if (isNaN(newComplexity) || newComplexity > 10 || newComplexity < 1 || newComplexity % 1 !== 0) {
            return await ctx.reply(ctx.config.emoji.error + ' Invalid complexity.');
        }
        complexity = newComplexity;
    }

    const msg = await ctx.reply(ctx.config.emoji.loading + ' Generating equation...');

    const [equation, result] = generateMathEquation(complexity);

    await msg.edit(`❓ What is the answer to \`${equation}\`?\n*Need help? Try \`;mathhelp\`!*`);
    const answer = await ctx.awaitMessages(
        ctx.msg.channel,
        m => m.author.id === ctx.msg.author.id && m.content === result.toString(),
        {
            maxMatches: 1,
            time: 15000
        }
    );

    if (!answer.length) {
        return await msg.edit(`${ctx.config.emoji.error} Out of time! It was ${result}.`);
    } else {
        return await msg.edit(ctx.config.emoji.success + ' Correct!');
    }
}

export default {
    name: 'math',
    description: 'Do some math!\nThis is a work in progress test command for HungerCoins.',
    usage: '<complexity(1)? = 3>',

    exec,
    level: 0
};
