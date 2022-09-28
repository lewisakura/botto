import { sendIRSNotice } from '../../utils/economy/irs';
import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments.');
    }

    const wallet = await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } });

    if (!wallet) {
        return ctx.reply(`${ctx.config.emoji.error} You don't have a wallet yet! Create one with \`;createwallet\`.`);
    }

    let amount: bigint;
    try {
        amount = ctx.args[0] !== 'all' ? BigInt(ctx.args[0]) : wallet.balance;
        if (amount % 1n !== 0n || amount < 0n) {
            return ctx.reply(ctx.config.emoji.error + ' Amount must be a positive number.');
        }
    } catch {
        return ctx.reply(ctx.config.emoji.error + ' Amount must be a positive number.');
    }

    if (!amount) {
        return ctx.reply(ctx.config.emoji.error + ' Amount must be a positive number.');
    }

    if (wallet.balance < amount) {
        return ctx.reply(ctx.config.emoji.error + ' You do not have enough in BANKUバンク for this withdrawal!');
    }

    if (amount === 0n) {
        return ctx.reply(ctx.config.emoji.error + " You can't withdraw nothing!");
    }

    const bottobux = ctx.config.emoji.bottobux;

    await ctx.db.$transaction([
        ctx.db.wallet.update({
            where: {
                id: ctx.msg.author.id
            },
            data: {
                onHand: {
                    increment: amount
                }
            }
        }),
        ctx.db.wallet.update({
            where: {
                id: ctx.msg.author.id
            },
            data: {
                balance: {
                    decrement: amount
                }
            }
        })
    ]);

    sendIRSNotice(
        ctx,
        `🏦 ${ctx.msg.author.mention} withdrew ${amount.toLocaleString()} ${bottobux} from their BANKUバンク account.`
    );
    return ctx.reply(
        ctx.config.emoji.success + ` ${amount.toLocaleString()} ${bottobux} has been withdrawn from BANKUバンク.`
    );
}

export default {
    name: 'withdraw',
    description: 'Withdraw money from BANKUバンク.',
    usage: '<amount>',
    aliases: ['with'],

    exec,
    level: 0
};
