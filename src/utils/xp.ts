export function getXpForLevel(level: number): number {
    return 5 * level ** 2 + 50 * level + 100;
}

export function getLevelForXp(xp: number): number {
    return Math.max(Math.floor(Math.sqrt(xp / 5 + 5) - 5), 0);
}

export function getXpUntilNextLevel(currentXp: number) {
    return getXpForLevel(getLevelForXp(currentXp) + 1) - currentXp;
}
