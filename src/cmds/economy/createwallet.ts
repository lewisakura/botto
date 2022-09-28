import { sendIRSNotice } from '../../utils/economy/irs';
import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    const bottobux = ctx.config.emoji.bottobux;

    if (await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } })) {
        return ctx.reply(ctx.config.emoji.error + ' You already have a wallet!');
    }

    await ctx.db.wallet.create({
        data: {
            id: ctx.msg.author.id
        }
    });

    sendIRSNotice(ctx, `💳 ${ctx.msg.author.mention} created a wallet.`);
    return ctx.reply(
        `${ctx.config.emoji.success} Wallet created! You have had 100 ${bottobux} credited to your account.`
    );
}

export default {
    name: 'createwallet',
    description: 'Create a wallet for your Bottobux.',
    usage: null,

    exec,
    level: 0
};
