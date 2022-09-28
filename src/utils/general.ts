export const discordSnowflakeRegex = /(?:<@!?)?([0-9]+)(?:>)?/;
export const discordChannelSnowflakeRegex = /(?:<#)?(\d+)>?/;

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
