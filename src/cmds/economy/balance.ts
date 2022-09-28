import { CommandContext } from '../../types';
import { discordSnowflakeRegex } from '../../utils/general';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    const userIdRaw = ctx.args.length > 0 ? ctx.args[0].match(discordSnowflakeRegex) : [undefined, ctx.msg.author.id];

    if (!userIdRaw) {
        return ctx.reply(ctx.config.emoji.error + ' You need to mention a user or provide a snowflake.');
    }

    const userId = userIdRaw[1];
    const member = ctx.msg.channel.guild.members.find(m => m.id === userId);
    if (!member) {
        return ctx.reply(ctx.config.emoji.error + ' Could not find user.');
    }

    const wallet = await ctx.db.wallet.findUnique({ where: { id: userId } });
    if (!wallet) {
        return ctx.reply(
            `${ctx.config.emoji.error} ${
                userId === ctx.msg.author.id ? "You don't" : member.mention + " doesn't"
            } have a wallet yet! ${
                userId === ctx.msg.author.id ? 'You can' : 'Tell them to'
            } create one with \`;createwallet\`.`
        );
    }

    const bottobux = ctx.config.emoji.bottobux;

    return ctx.reply(
        `💳 ${
            userId === ctx.msg.author.id ? 'You have' : member.mention + ' has'
        } ${wallet.onHand.toLocaleString()} ${bottobux} on hand and ${wallet.balance.toLocaleString()} ${bottobux} in BANKUバンク.`
    );
}

export default {
    name: 'balance',
    description: 'Get your Bottobux wallet balance.',
    usage: '<user(1)?>',
    aliases: ['bal'],

    exec,
    level: 0
};
