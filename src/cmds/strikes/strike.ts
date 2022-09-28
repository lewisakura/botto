import { CommandContext } from '../../types';
import leven from 'leven';
import { aliases, issueStrike, strikeWeightMap } from '../../utils/strike';
import { discordSnowflakeRegex } from '../../utils/general';
import _ from 'lodash';

type WeightResult =
    | {
          exact: true;
          reason: string;
          weight: number;
      }
    | {
          exact: false;
          possibleReasons: { reason: string; weight: number }[];
      };

function getWeight(reason: string): WeightResult {
    if (aliases[reason]) {
        return {
            exact: true,
            reason: aliases[reason],
            weight: strikeWeightMap[aliases[reason]]
        };
    }

    if (strikeWeightMap[reason]) {
        return {
            exact: true,
            reason,
            weight: strikeWeightMap[reason]
        };
    }

    const closestReasons = _.uniqBy(
        [
            ...Object.keys(aliases)
                .filter(key => leven(key, reason) <= 5)
                .map(key => ({ reason: aliases[key], weight: strikeWeightMap[aliases[key]] })),
            ...Object.keys(strikeWeightMap)
                .filter(key => leven(key, reason) <= 5)
                .map(key => ({ reason: key, weight: strikeWeightMap[key] }))
        ],
        'reason'
    );
    if (closestReasons.length > 0) {
        return {
            exact: false,
            possibleReasons: closestReasons
        };
    }

    return { exact: false, possibleReasons: [] };
}

async function exec(ctx: CommandContext) {
    if (ctx.args.length < 2) {
        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments.');
    }

    const userIdRaw = ctx.args.shift().match(discordSnowflakeRegex);

    if (!userIdRaw) {
        return ctx.reply(ctx.config.emoji.error + ' You need to mention a user or provide a snowflake.');
    }

    const userId = userIdRaw[1];
    const member = ctx.msg.channel.guild.members.find(m => m.id === userId);
    if (!member) {
        return ctx.reply(ctx.config.emoji.error + ' Could not find user.');
    }

    const targetUserLevel = ctx.getUserStaffLevel(member);
    if (targetUserLevel >= ctx.userStaffLevel) {
        return ctx.reply(
            `${ctx.config.emoji.error} You cannot target someone with a higher or equal staff level to you (target is staff level ${targetUserLevel}, you are staff level ${ctx.userStaffLevel}).`
        );
    }

    const reason = ctx.args.join(' ').toLowerCase();
    const weightResult = getWeight(reason);

    if (weightResult.exact === false && weightResult.possibleReasons.length === 0) {
        return ctx.reply(
            ctx.config.emoji.error +
                " I don't understand what your reason means, and I have no suggestions for you. Sorry."
        );
    }

    if (weightResult.exact === false) {
        return ctx.reply(
            `${
                ctx.config.emoji.error
            } I don't understand what your reason means. Did you mean...\n${weightResult.possibleReasons
                .map(r => `- ${r.reason} (weight: ${r.weight})`)
                .join('\n')}`
        );
    }

    const msg = await ctx.reply(ctx.config.emoji.loading + ' Processing, please wait...');

    const extra = await issueStrike(
        ctx.bot,
        ctx.config,
        ctx.db,
        ctx.msg.author.id,
        weightResult.reason,
        weightResult.weight,
        member
    );

    return msg.edit(`${ctx.config.emoji.success} Strike issued for ${weightResult.reason}. User has been ${extra}.`);
}

export default {
    name: 'strike',
    aliases: ['warn'],
    description: 'Strikes a user.',
    usage: '<user(1)> <reason...>',

    exec,
    level: 1
};
