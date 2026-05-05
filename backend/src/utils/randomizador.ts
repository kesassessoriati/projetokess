type RandomizerBranch = {
  id?: string;
  label?: string;
  percent?: number;
};

export function randomizarCaminho(
  chance: number,
  branches?: RandomizerBranch[]
) {
  const validBranches = Array.isArray(branches)
    ? branches
        .map((branch, index) => ({
          id: branch.id || String.fromCharCode(97 + index),
          percent: Number(branch.percent) || 0
        }))
        .filter(branch => branch.percent > 0)
    : [];

  if (validBranches.length > 0) {
    const total = validBranches.reduce((sum, branch) => sum + branch.percent, 0);
    const sortedNumber = Math.random() * total;
    let accumulated = 0;

    for (const branch of validBranches) {
      accumulated += branch.percent;
      if (sortedNumber <= accumulated) {
        return branch.id;
      }
    }

    return validBranches[validBranches.length - 1].id;
  }

  const chanceA = chance;
  const numeroAleatorio = Math.random();

  if (numeroAleatorio < chanceA) {
    return "A";
  }

  return "B";
}
