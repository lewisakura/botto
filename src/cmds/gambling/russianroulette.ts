import Decimal from 'decimal.js';
import { runCooldown } from '../../utils/cooldowns';
import { sendIRSNotice } from '../../utils/economy/irs';
import { cryptoRand } from '../../utils/qrng';
import { CommandContext } from '../../types';
import { delay } from '../../utils/general';

const revolverState = [true, false, false, false, false, false];

let multiplier = new Decimal(1.1);

async function spin() {
    for (let i = revolverState.length - 1; i > 0; i--) {
        const j = Math.floor((await cryptoRand()) * (i + 1));
        const temp = revolverState[i];
        revolverState[i] = revolverState[j];
        revolverState[j] = temp;
    }
}

spin();

function shoot() {
    const state = revolverState.shift();
    revolverState.push(state);
    return state;
}

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments.');
    }

    const amount = Number(ctx.args[0]);
    if (isNaN(amount) || amount % 1 !== 0 || amount <= 0) {
        return ctx.reply(ctx.config.emoji.error + ' Amount must be a positive number.');
    }

    const wallet = await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } });

    if (!wallet) {
        return ctx.reply(`${ctx.config.emoji.error} You don't have a wallet yet! Create one with \`;createwallet\`.`);
    }

    if (wallet.onHand < amount) {
        return ctx.reply(ctx.config.emoji.error + ' You do not have enough on hand for this gamble!');
    }

    const cooldown = await runCooldown(ctx, 'russianroulette', ctx.msg.author.id, 5, 'minutes', false);

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

    await ctx.reply(
        `❓ Would you like to \`spin\` or \`shoot\`?\n\nSpinning will also shoot the gun, you will just spin the chamber first.`
    );

    const spinOrShoot = await ctx.awaitMessages(
        ctx.msg.channel,
        m => m.author.id === ctx.msg.author.id && (m.content === 'spin' || m.content === 'shoot'),
        {
            time: 10000,
            maxMatches: 1
        }
    );

    if (spinOrShoot.length === 0) {
        await ctx.db.wallet.update({
            where: {
                id: ctx.msg.author.id
            },
            data: {
                onHand: {
                    increment: amount
                }
            }
        });
        return ctx.reply(ctx.config.emoji.error + ' Cancelled.');
    }

    await runCooldown(ctx, 'russianroulette', ctx.msg.author.id, 5, 'minutes');

    const bottobux = ctx.config.emoji.bottobux;

    sendIRSNotice(ctx, `📫 ${ctx.msg.author.mention} paid ${amount.toLocaleString()} ${bottobux} for a bet.`);

    const answer = spinOrShoot[0].content;

    const revolverMsg = await ctx.reply('You pick up the revolver.');

    await delay(2500);

    if (answer === 'spin') {
        await spin();
        await revolverMsg.edit('You spin the chamber.');
        await delay(2500);
    }

    await revolverMsg.edit('You hold the gun up to your head.');
    await delay(2500);
    const result = shoot();

    let winnings = 0;

    if (!result) {
        winnings = Math.floor(amount * multiplier.toNumber());

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

        multiplier = multiplier.add(0.1);
    } else {
        await ctx.db.wallet.update({
            where: {
                id: ctx.msg.author.id
            },
            data: {
                onHand: {
                    decrement: amount * 3
                }
            }
        });

        multiplier = new Decimal(1.1);

        await spin();
    }

    const message = result
        ? `BANG!\n${ctx.config.emoji.error} You have lost ${amount * 3} ${bottobux}.`
        : `*click*\n${ctx.config.emoji.success} You have won ${winnings} ${bottobux}! The next multiplier is ${multiplier}.`;

    await revolverMsg.edit(`You pull the trigger. ${message}`);
}

export default {
    name: 'russianroulette',
    description: "One in the chamber. Don't die.",
    usage: '<amount(1)>',

    exec,
    level: 0
};
