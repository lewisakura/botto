import { runCooldown } from '../../utils/cooldowns';
import { sendIRSNotice } from '../../utils/economy/irs';
import { cryptoRandRange } from '../../utils/qrng';
import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    const wallet = await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } });

    if (!wallet) {
        return ctx.reply(`${ctx.config.emoji.error} You don't have a wallet yet! Create one with \`;createwallet\`.`);
    }

    const cooldown = await runCooldown(ctx, 'crime', ctx.msg.author.id, 30, 'minutes');

    if (cooldown) {
        return ctx.reply(`${ctx.config.emoji.error} You're on cooldown, chill out!\n⏱️ Expires in ${cooldown}.`);
    }

    const bottobux = ctx.config.emoji.bottobux;

    const result = await cryptoRandRange(1, 500);
    const successMessages = [
        // robberies
        'robbed the local BANKUバンク branch',
        'robbed a jewellery store',
        'robbed a coffee shop',
        "robbed some random dude's house",
        'robbed the Bottobux mint',
        'robbed a safe you found in the street',

        // selling things
        'sold yourself',
        'sold counterfeit jewellery',
        'sold Level 4 admin powers on ZOぞ',
        'sold crack',
        'sold heroin',
        'sold a fake ID card',
        'sold a fake passport',
        'sold a fake driving license',

        // others
        'threatened a bank employee',
        'used a calculator to cheat on your work job',
        'won a bet on an illegal Hunger Games tournament',
        'mugged a man on the street',
        'won an illegal gamble',
        'made a trade',
        "rigged a casino's machines to make them always pay out"
    ];

    const succeeded = (await cryptoRandRange(1, 4)) <= 2;

    if (succeeded) {
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
        sendIRSNotice(ctx, `💰 ${ctx.msg.author.mention} earned ${result} ${bottobux} by using \`;crime\`.`);
        return ctx.reply(
            `${ctx.config.emoji.success} You ${
                successMessages[await cryptoRandRange(0, successMessages.length - 1)]
            } for ${result} ${bottobux}!`
        );
    } else {
        const fine = await cryptoRandRange(1, Number(wallet.onHand + wallet.balance / 2n));
        if (fine <= 0) {
            return ctx.reply(
                `${ctx.config.emoji.error} You got caught breaking the law but you were let off because you are too broke to receive a fine!`
            );
        }
        await ctx.db.wallet.update({
            where: {
                id: ctx.msg.author.id
            },
            data: {
                onHand: {
                    decrement: fine
                }
            }
        });
        sendIRSNotice(
            ctx,
            `💸 ${ctx.msg.author.mention} lost ${fine.toLocaleString()} ${bottobux} by using \`;crime\`.`
        );
        return ctx.reply(
            `${
                ctx.config.emoji.error
            } You were caught breaking the law and were fined ${fine.toLocaleString()} ${bottobux}!`
        );
    }
}

export default {
    name: 'crime',
    description: 'Commit a crime in the name of Bottobux!',
    usage: null,

    exec,
    level: 0
};
