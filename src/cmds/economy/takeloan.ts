import dayjs from 'dayjs';
import { runCooldown } from '../../utils/cooldowns';
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

    if (amount === 0n) {
        return ctx.reply(ctx.config.emoji.error + " You can't loan nothing!");
    }

    if (wallet.loan > 0n) {
        return ctx.reply(ctx.config.emoji.error + ' You already have a loan!');
    }

    const cooldown = await runCooldown(ctx, 'takeloan', ctx.msg.author.id, 1, 'hour', false);
    if (cooldown) {
        return ctx.reply(`${ctx.config.emoji.error} You're on cooldown, chill out!\n⏱️ Expires in ${cooldown}.`);
    }

    const bottobux = ctx.config.emoji.bottobux;

    if (amount > wallet.maxLoan) {
        return ctx.reply(
            `${
                ctx.config.emoji.error
            } You can't get a loan greater than ${wallet.maxLoan.toLocaleString()} ${bottobux}.`
        );
    }

    const payback = dayjs().add(4, 'hours');

    await ctx.db.wallet.update({
        where: {
            id: ctx.msg.author.id
        },
        data: {
            balance: {
                increment: amount
            },
            loan: {
                increment: amount
            },
            loanPaybackDate: payback.toDate()
        }
    });

    const fine = Math.floor(Number(amount) * (1 + 20 / 100));

    sendIRSNotice(ctx, `🏦 ${ctx.msg.author.mention} took a loan for ${amount.toLocaleString()} ${bottobux}.`);
    return ctx.reply(
        `${
            ctx.config.emoji.success
        } ${amount.toLocaleString()} ${bottobux} has been loaned to you from BANKUバンク. You must pay it back in ${payback.fromNow(
            true
        )} or suffer a fine of ${fine.toLocaleString()} ${bottobux}.`
    );
}

export default {
    name: 'takeloan',
    description: 'Take a loan from BANKUバンク.',
    usage: '<amount>',

    exec,
    level: 0
};
