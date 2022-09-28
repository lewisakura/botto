import dayjs from 'dayjs';
import { runCooldown } from '../../utils/cooldowns';
import { sendIRSNotice } from '../../utils/economy/irs';
import { generateMathEquation } from '../../utils/math';
import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    const wallet = await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } });

    if (!wallet) {
        return ctx.reply(`${ctx.config.emoji.error} You don't have a wallet yet! Create one with \`;createwallet\`.`);
    }

    const cooldown = await runCooldown(ctx, 'work', ctx.msg.author.id, 10, 'minutes');

    if (cooldown) {
        return ctx.reply(`${ctx.config.emoji.error} You're on cooldown, chill out!\n⏱️ Expires in ${cooldown}.`);
    }

    const bottobux = ctx.config.emoji.bottobux;

    const msg = await ctx.reply(ctx.config.emoji.loading + ' Generating equation...');

    const [equation, result] = generateMathEquation(3);

    await msg.edit(`❓ What is the answer to \`${equation}\`?\n*Need help? Try \`;mathhelp\`!*`);
    const answer = await ctx.awaitMessages(
        ctx.msg.channel,
        m => m.author.id === ctx.msg.author.id && m.content === result.toString(),
        {
            maxMatches: 1,
            time: 30000
        }
    );

    if (!answer.length) {
        return msg.edit(`${ctx.config.emoji.error} Out of time! It was ${result}.`);
    } else {
        await ctx.db.wallet.update({
            where: {
                id: ctx.msg.author.id
            },
            data: {
                onHand: {
                    increment: result
                }
            }
        });
        sendIRSNotice(ctx, `💰 ${ctx.msg.author.mention} earned ${result} ${bottobux} by using \`;work\`.`);
        return msg.edit(`${ctx.config.emoji.success} Correct! You\'ve been credited with ${result} ${bottobux}.`);
    }
}

export default {
    name: 'work',
    description: 'Work for some Bottobux.',
    usage: null,

    exec,
    level: 0
};
