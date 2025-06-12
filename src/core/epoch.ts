import { ccc } from "@ckb-ccc/core";

export function getClaimEpoch(
  depositHeader: ccc.ClientBlockHeader,
  withdrawHeader: ccc.ClientBlockHeader
): ccc.Epoch {
  const depositEpoch = depositHeader.epoch;
  const withdrawEpoch = withdrawHeader.epoch;
  const intDiff = withdrawEpoch[0] - depositEpoch[0];
  if (
    intDiff % ccc.numFrom(180) !== ccc.numFrom(0) ||
    depositEpoch[1] * withdrawEpoch[2] <= depositEpoch[2] * withdrawEpoch[1]
  ) {
    return [
      depositEpoch[0] +
        (intDiff / ccc.numFrom(180) + ccc.numFrom(1)) * ccc.numFrom(180),
      depositEpoch[1],
      depositEpoch[2],
    ];
  }

  return [
    depositEpoch[0] + (intDiff / ccc.numFrom(180)) * ccc.numFrom(180),
    depositEpoch[1],
    depositEpoch[2],
  ];
}

export function getProfit(
  dao: ccc.Cell,
  depositHeader: ccc.ClientBlockHeader,
  withdrawHeader: ccc.ClientBlockHeader
) {
  const occupiedSize = ccc.fixedPointFrom(
    dao.cellOutput.occupiedSize + ccc.bytesFrom(dao.outputData).length
  );
  const profitableSize = dao.cellOutput.capacity - occupiedSize;

  return (
    (profitableSize * withdrawHeader.dao.ar) / depositHeader.dao.ar -
    profitableSize
  );
}

export function parseEpoch(epoch: ccc.Epoch) {
  return (
    ccc.fixedPointFrom(epoch[0].toString()) +
    (ccc.fixedPointFrom(epoch[1].toString()) * ccc.fixedPointFrom(1)) /
      ccc.fixedPointFrom(epoch[2].toString())
  );
}
