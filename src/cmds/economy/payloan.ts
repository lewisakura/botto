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
        return ctx.reply(ctx.config.emoji.error + " You can't pay back nothing!");
    }

    if (wallet.loan === 0n) {
        return ctx.reply(ctx.config.emoji.error + " You don't have a loan!");
    }

    const bottobux = ctx.config.emoji.bottobux;

    if (amount > wallet.loan) {
        return ctx.reply(ctx.config.emoji.error + " You can't pay back more than you owe!");
    }

    if (amount > wallet.balance) {
        return ctx.reply(ctx.config.emoji.error + " You don't have enough in BANKUバンク to pay back this amount.");
    }

    const cooldown = await runCooldown(ctx, 'payloan', ctx.msg.author.id, 30, 'minutes', false);
    if (cooldown) {
        return ctx.reply(`${ctx.config.emoji.error} You're on cooldown, chill out!\n⏱️ Expires in ${cooldown}.`);
    }

    const newLoan = wallet.loan - amount;

    const maxLoanIncrement = Math.ceil(Math.max(Math.min(Number(amount / 2n), 500), 1000));
    let newMaxLoan = Math.min(Number(wallet.maxLoan) + maxLoanIncrement, 10000);

    await ctx.db.wallet.update({
        where: {
            id: ctx.msg.author.id
        },
        data: {
            balance: {
                decrement: amount
            },
            loan: {
                decrement: amount
            },
            loanPaybackDate: newLoan === 0n ? null : undefined,
            maxLoan: newMaxLoan
        }
    });

    if (newLoan === 0n) {
        sendIRSNotice(
            ctx,
            `🏦 ${
                ctx.msg.author.mention
            } paid back ${amount.toLocaleString()} ${bottobux} of their loan. They no longer owe anything.`
        );
        await runCooldown(ctx, 'takeloan', ctx.msg.author.id, 1, 'hour');
        return ctx.reply(
            `${
                ctx.config.emoji.success
            } You have paid back ${amount.toLocaleString()} ${bottobux} of your loan. You no longer owe anything to BANKUバンク.`
        );
    }

    const fine = Math.floor(Number(newLoan) * (1 + 20 / 100));

    sendIRSNotice(
        ctx,
        `🏦 ${
            ctx.msg.author.mention
        } paid back ${amount.toLocaleString()} ${bottobux} of their loan. They still owe ${newLoan.toLocaleString()} ${bottobux}.`
    );
    return ctx.reply(
        `${
            ctx.config.emoji.success
        } You have paid back ${amount.toLocaleString()} ${bottobux} of your loan. You still owe ${newLoan.toLocaleString()} ${bottobux}, which you must pay back in ${dayjs(
            wallet.loanPaybackDate
        ).fromNow(true)} or suffer a fine of ${fine.toLocaleString()} ${bottobux}.`
    );
}

export default {
    name: 'payloan',
    description: 'Pay back a loan from BANKUバンク.',
    usage: '<amount>',

    exec,
    level: 0
};
