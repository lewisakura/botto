import { runCooldown } from '../../utils/cooldowns';
import { sendIRSNotice } from '../../utils/economy/irs';
import { cryptoRandRange } from '../../utils/qrng';
import { CommandContext } from '../../types';
import { discordSnowflakeRegex } from '../../utils/general';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments.');
    }

    const userIdRaw = ctx.args[0].match(discordSnowflakeRegex);

    if (!userIdRaw) {
        return ctx.reply(ctx.config.emoji.error + ' You need to mention a user or provide a snowflake.');
    }
    const userId = userIdRaw[1];
    const member = ctx.msg.channel.guild.members.find(m => m.id === userId);
    if (!member) {
        return ctx.reply(ctx.config.emoji.error + ' Could not find user.');
    }

    if (member.id === ctx.msg.author.id) {
        return ctx.reply(ctx.config.emoji.error + " You can't rob yourself!");
    }

    const ownWallet = await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } });
    if (!ownWallet) {
        return ctx.reply(`${ctx.config.emoji.error} You don't have a wallet yet! Create one with \`;createwallet\`.`);
    }

    const wallet = await ctx.db.wallet.findUnique({ where: { id: userId } });
    if (!wallet) {
        return ctx.reply(
            ctx.config.emoji.error + " They don't have a wallet yet! Tell them to create one with `;createwallet`."
        );
    }

    if (wallet.onHand <= 0) {
        return ctx.reply(ctx.config.emoji.error + ' They have nothing on hand for you to steal!');
    }
    if (ctx.msg.author.id != '884818518279864400') {
        const cooldown = await runCooldown(ctx, 'rob', ctx.msg.author.id, 10, 'minutes');
        if (cooldown) {
            return ctx.reply(`${ctx.config.emoji.error} You're on cooldown, chill out!\n⏱️ Expires in ${cooldown}.`);
        }
    }

    const bottobux = ctx.config.emoji.bottobux;

    const succeeded = (await cryptoRandRange(1, 4)) <= 2;

    if (succeeded) {
        const stolen = await cryptoRandRange(1, Number(wallet.onHand / 2n));
        await ctx.db.$transaction([
            ctx.db.wallet.update({
                where: {
                    id: userId
                },
                data: {
                    onHand: {
                        decrement: stolen
                    }
                }
            }),
            ctx.db.wallet.update({
                where: {
                    id: ctx.msg.author.id
                },
                data: {
                    onHand: {
                        increment: stolen
                    }
                }
            })
        ]);
        sendIRSNotice(
            ctx,
            `🔫 ${ctx.msg.member.mention} robbed ${member.mention} for ${stolen.toLocaleString()} ${bottobux}.`
        );
        return ctx.reply(
            `${ctx.config.emoji.success} You just robbed ${stolen.toLocaleString()} ${bottobux} from ${member.mention}!`
        );
    } else {
        const fine = await cryptoRandRange(1, Number((ownWallet.onHand + ownWallet.balance) / 2n));
        if (fine <= 0) {
            return ctx.reply(
                `${ctx.config.emoji.error} You got caught trying to rob ${member.mention} but you were let off because you are too broke to receive a fine!`
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
            `🔫 ${ctx.msg.member.mention} was fined ${fine.toLocaleString()} ${bottobux} for attempting to rob ${
                member.mention
            }.`
        );
        return ctx.reply(
            `${ctx.config.emoji.error} You got caught trying to rob ${
                member.mention
            } and were fined ${fine.toLocaleString()} ${bottobux}!`
        );
    }
}

export default {
    name: 'rob',
    description: "Pinch some Bottobux off of your competitors. Don't get caught!",
    usage: '<target(1)>',

    exec,
    level: 0
};
