import dayjs from 'dayjs';
import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    const wallet = await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } });

    if (!wallet) {
        return ctx.reply(`${ctx.config.emoji.error} You don't have a wallet yet! Create one with \`;createwallet\`.`);
    }

    const bottobux = ctx.config.emoji.bottobux;

    if (wallet.loan === 0n) {
        return ctx.reply(
            `🏦 You do not currently have a loan. You may take out a loan of up to ${wallet.maxLoan.toLocaleString()} ${bottobux}.`
        );
    } else {
        const fine = Math.floor(Number(wallet.loan) * (1 + 20 / 100));

        return ctx.reply(
            `🏦 You currently have a loan of ${wallet.loan.toLocaleString()} ${bottobux}, which you must pay back in ${dayjs(
                wallet.loanPaybackDate
            ).fromNow(true)} or suffer a fine of ${fine.toLocaleString()} ${bottobux}.`
        );
    }
}

export default {
    name: 'loan',
    description: 'Check on your loan status.',
    usage: null,

    exec,
    level: 0
};
