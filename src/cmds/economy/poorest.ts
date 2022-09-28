import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    const bottobux = ctx.config.emoji.bottobux;

    const wallets = await ctx.db.wallet.findMany({});
    const top10Wallets = wallets.sort((a, b) => Number(a.onHand + a.balance - (b.onHand + b.balance))).slice(0, 10);

    for (const wallet of top10Wallets) {
        const member = ctx.msg.channel.guild.members.find(m => m.id === wallet.id);
        if (member) {
            wallet.id = `${member.mention} (${member.username}#${member.discriminator})`;
        } else {
            wallet.id = '¯\\_(ツ)_/¯';
        }
    }

    const top10 = top10Wallets
        .map(
            (w, idx) =>
                `\`${(++idx).toString().padStart(2, ' ')} |\` ${w.id} ${(
                    w.onHand + w.balance
                ).toLocaleString()} ${bottobux}`
        )
        .join('\n');

    return ctx.reply(`**Top 10 Poorest Users**\n\n${top10}`);
}

export default {
    name: 'poorest',
    description: 'Get the bottom 10 Bottobux holders.',
    usage: null,

    exec,
    level: 0
};
