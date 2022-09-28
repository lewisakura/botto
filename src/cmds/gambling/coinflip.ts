import { runCooldown } from '../../utils/cooldowns';
import { sendIRSNotice } from '../../utils/economy/irs';
import { cryptoRandRange } from '../../utils/qrng';
import { CommandContext } from '../../types';
import { delay } from '../../utils/general';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    if (ctx.args.length < 2) {
        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments.');
    }

    const amount = Number(ctx.args[0]);
    if (isNaN(amount) || amount % 1 !== 0 || amount <= 0) {
        return ctx.reply(ctx.config.emoji.error + ' Amount must be a positive number.');
    }

    const side = ctx.args[1];
    if (side !== 'heads' && side !== 'tails' && side !== 'edge') {
        return ctx.reply(
            ctx.config.emoji.error + ' Side must be either heads or tails, or if you are daring, the edge.'
        );
    }

    const wallet = await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } });

    if (!wallet) {
        return ctx.reply(`${ctx.config.emoji.error} You don't have a wallet yet! Create one with \`;createwallet\`.`);
    }

    if (wallet.onHand < amount) {
        return ctx.reply(ctx.config.emoji.error + ' You do not have enough on hand for this gamble!');
    }

    const cooldown = await runCooldown(ctx, 'coinflip', ctx.msg.author.id, 5, 'minutes');

    if (cooldown) {
        return ctx.reply(`${ctx.config.emoji.error} You're on cooldown, chill out!\n⏱️ Expires in ${cooldown}.`);
    }

    await ctx.db.wallet.update({
        where: {
            id: ctx.msg.author.id
        },
        data: {
            onHand: {
                decrement: amount
            }
        }
    });

    const bottobux = ctx.config.emoji.bottobux;

    sendIRSNotice(ctx, `📫 ${ctx.msg.author.mention} paid ${amount.toLocaleString()} ${bottobux} for a bet.`);

    const msg = await ctx.reply(':coin: **FLIP!** Waiting for the coin to land...');
    await delay(await cryptoRandRange(2500, 5000));

    const winLose = (await cryptoRandRange(1, 10)) <= 9;
    if (!winLose) {
        return msg.edit(ctx.config.emoji.error + ' The coin rolled into a storm drain.');
    }

    const value = await cryptoRandRange(1, 100);
    const coin = value <= 48 ? 'heads' : value > 48 && value <= 96 ? 'tails' : 'edge';

    const coinInfo = `:coin: It landed on ${coin === 'edge' ? 'the edge' : coin}.`;
    if (coin === side || coin === 'edge') {
        const winnings = amount * (coin === 'edge' ? (side === 'edge' ? 10 : 3) : 2);
        await ctx.db.wallet.update({
            where: {
                id: ctx.msg.author.id
            },
            data: {
                onHand: {
                    increment: winnings
                }
            }
        });
        sendIRSNotice(
            ctx,
            `🎲 ${ctx.msg.author.mention} won ${winnings.toLocaleString()} ${bottobux} by using \`;coinflip\`.`
        );
        return msg.edit(`${coinInfo}\n${ctx.config.emoji.success} You won ${winnings.toLocaleString()} ${bottobux}!`);
    } else {
        return msg.edit(`${coinInfo}\n${ctx.config.emoji.error} You lost!`);
    }
}

export default {
    name: 'coinflip',
    description:
        'Flip a coin to double your money! Just pray it lands on your side. If you are feeling lucky, maybe the coin will land on its edge and give you 10x your money...',
    usage: '<bet(1)> <side(1)>',

    exec,
    level: 0
};
