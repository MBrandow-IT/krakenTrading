

export const calculateRSI = (data: number[]): number => {

    const changes = data.map((current, index) => {
        const previous = data[index - 1];
        return current - previous;
    });

    const gains = changes.filter(change => change > 0).map(change => change);
    const losses = changes.filter(change => change < 0).map(change => change);

    const averageGain = gains.reduce((sum, change) => sum + change, 0) / gains.length;
    const averageLoss = losses.reduce((sum, change) => sum + change, 0) / losses.length;

    const relativeStrength = averageGain / averageLoss;
    const rsi = 100 - 100 / (1 + relativeStrength);

    return rsi;
}
