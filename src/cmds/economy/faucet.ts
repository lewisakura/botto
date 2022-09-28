import { CommandContext } from '../../types';
import dayjs from 'dayjs';
import { runCooldown } from '../../utils/cooldowns';
import { sendIRSNotice } from '../../utils/economy/irs';

const cooldowns: { [id: string]: dayjs.Dayjs } = {};

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    const wallet = await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } });

    if (!wallet) {
        return ctx.reply(`${ctx.config.emoji.error} You don't have a wallet yet! Create one with \`;createwallet\`.`);
    }

    const cooldown = await runCooldown(ctx, 'faucet', ctx.msg.author.id, 15, 'minutes');

    if (cooldown) {
        return ctx.reply(`${ctx.config.emoji.error} You're on cooldown, chill out!\n⏱️ Expires in ${cooldown}.`);
    }

    const bottobux = ctx.config.emoji.bottobux;

    const result = Math.floor(Math.random() * 100) + 1;

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

    sendIRSNotice(ctx, `💰 ${ctx.msg.author.mention} earned ${result} ${bottobux} by using \`;faucet\`.`);
    return ctx.reply(`${ctx.config.emoji.success} You\'ve been credited with ${result} ${bottobux}.`);
}

export default {
    name: 'faucet',
    description: 'Free money for the slackers.',
    usage: null,

    exec,
    level: 0
};
