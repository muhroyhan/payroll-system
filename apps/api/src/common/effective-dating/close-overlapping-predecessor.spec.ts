import { ConflictException } from '@nestjs/common';
import { Op } from 'sequelize';
import { closeOverlappingPredecessor } from './close-overlapping-predecessor';

describe('closeOverlappingPredecessor', () => {
  function makeModel(existingOpenRows: any[]) {
    return {
      findAll: jest.fn().mockResolvedValue(existingOpenRows),
    };
  }

  const transaction = { id: 'txn-1' } as any;
  const newRowId = 'new-row-1';
  const updatedBy = 'actor-1';

  it('does nothing when there is no open predecessor in this category', async () => {
    const model = makeModel([]);

    await closeOverlappingPredecessor(
      model as any,
      { ptkpStatus: 'TK/0' },
      '2026-01-01',
      transaction,
      newRowId,
      updatedBy,
    );

    expect(model.findAll).toHaveBeenCalledWith({
      where: { ptkpStatus: 'TK/0', effectiveEndDate: { [Op.is]: null } },
      transaction,
    });
  });

  it('closes the single open predecessor the day before the new row starts, with reason/supersedesId/updatedBy set', async () => {
    const predecessor = {
      id: 'old-1',
      effectiveStartDate: '2025-01-01',
      update: jest.fn().mockResolvedValue(undefined),
    };
    const model = makeModel([predecessor]);

    await closeOverlappingPredecessor(
      model as any,
      { ptkpStatus: 'TK/0' },
      '2026-03-15',
      transaction,
      newRowId,
      updatedBy,
    );

    expect(predecessor.update).toHaveBeenCalledWith(
      {
        effectiveEndDate: '2026-03-14',
        reason: `Digantikan baris baru: ${newRowId}`,
        supersedesId: newRowId,
        updatedBy,
      },
      { transaction },
    );
  });

  it('handles a year boundary correctly when computing the day before', async () => {
    const predecessor = {
      id: 'old-1',
      effectiveStartDate: '2025-01-01',
      update: jest.fn().mockResolvedValue(undefined),
    };
    const model = makeModel([predecessor]);

    await closeOverlappingPredecessor(
      model as any,
      {},
      '2026-01-01',
      transaction,
      newRowId,
      updatedBy,
    );

    expect(predecessor.update).toHaveBeenCalledWith(
      {
        effectiveEndDate: '2025-12-31',
        reason: `Digantikan baris baru: ${newRowId}`,
        supersedesId: newRowId,
        updatedBy,
      },
      { transaction },
    );
  });

  it('rejects instead of guessing when more than one open predecessor already exists', async () => {
    const model = makeModel([
      { id: 'old-1', effectiveStartDate: '2024-01-01', update: jest.fn() },
      { id: 'old-2', effectiveStartDate: '2025-01-01', update: jest.fn() },
    ]);

    await expect(
      closeOverlappingPredecessor(
        model as any,
        {},
        '2026-01-01',
        transaction,
        newRowId,
        updatedBy,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects instead of guessing when the new row does not start strictly after the predecessor', async () => {
    const predecessor = {
      id: 'old-1',
      effectiveStartDate: '2026-01-01',
      update: jest.fn(),
    };
    const model = makeModel([predecessor]);

    // Same start date as the predecessor — ambiguous, not "later".
    await expect(
      closeOverlappingPredecessor(
        model as any,
        {},
        '2026-01-01',
        transaction,
        newRowId,
        updatedBy,
      ),
    ).rejects.toThrow(ConflictException);
    expect(predecessor.update).not.toHaveBeenCalled();
  });

  it('rejects when the new row starts strictly before the predecessor', async () => {
    const predecessor = {
      id: 'old-1',
      effectiveStartDate: '2026-01-01',
      update: jest.fn(),
    };
    const model = makeModel([predecessor]);

    await expect(
      closeOverlappingPredecessor(
        model as any,
        {},
        '2025-06-01',
        transaction,
        newRowId,
        updatedBy,
      ),
    ).rejects.toThrow(ConflictException);
    expect(predecessor.update).not.toHaveBeenCalled();
  });
});
