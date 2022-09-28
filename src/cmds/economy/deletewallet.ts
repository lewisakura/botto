import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    const wallet = await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } });
    if (!wallet) {
        return ctx.reply(ctx.config.emoji.error + ' You never had a wallet to begin with!');
    }
    
    if (wallet.loan > 0n) {
        return ctx.reply(
            ctx.config.emoji.error +
                " You have a loan. To prevent abuse, you can't close your account whilst you have a loan."
        );
    }
    
    if (wallet.maxLoan < 5000n) {
        return ctx.reply(
            `${ctx.config.emoji.error} You have less than 5000 ${ctx.config.emoji.bottobox} as your max loan. Please repay your loans properly, then you can close your account.`
        );
    }
    
    if ((wallet.balance + wallet.onHand) == 0n) {
        return ctx.reply(ctx.config.emoji.error + 'You are in debt. You can close your wallet once you are out of debt.');
    }

    const m = await ctx.reply(
        '⚠️ You are about to delete your Bottobux account. You will not be able to recover any funds or items once you do this. Reply with `yes` to confirm.'
    );
    const confirmation = await ctx.awaitMessages(ctx.msg.channel, msg => msg.author.id === ctx.msg.author.id, {
        time: 10000,
        maxMatches: 1
    });

    if (confirmation.length === 0 || confirmation[0].content !== 'yes') {
        return m.edit(ctx.config.emoji.error + ' Cancelled.');
    }

    await ctx.db.wallet.delete({ where: { id: ctx.msg.author.id } });
    return m.edit(ctx.config.emoji.success + ' Wallet deleted.');
}

export default {
    name: 'deletewallet',
    description: 'Deletes your Bottobux wallet.',
    usage: null,

    exec,
    level: 0
};
