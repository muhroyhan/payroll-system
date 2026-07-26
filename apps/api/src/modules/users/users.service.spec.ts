import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService', () => {
  function makeService(existingRecord: any = null) {
    const model = {
      findByPk: jest.fn().mockResolvedValue(existingRecord),
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
    };
    const service = new UsersService(model as any);
    return { service, model };
  }

  function record(overrides: Partial<any> = {}) {
    return {
      id: 'user-1',
      isActive: true,
      update: jest.fn().mockImplementation(function (this: any, patch: any) {
        Object.assign(this, patch);
        return Promise.resolve(this);
      }),
      ...overrides,
    };
  }

  describe('setActive', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      const { service } = makeService(null);

      await expect(service.setActive('missing', false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deactivates an active user', async () => {
      const target = record({ isActive: true });
      const { service, model } = makeService(target);
      // findById (used for the return value) goes through findByPk with an
      // attributes-exclude option — same mock model, second call.
      model.findByPk.mockResolvedValueOnce(target).mockResolvedValueOnce({
        ...target,
        isActive: false,
      });

      const result = await service.setActive('user-1', false);

      expect(target.update).toHaveBeenCalledWith({ isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('reactivates an inactive user', async () => {
      const target = record({ isActive: false });
      const { service, model } = makeService(target);
      model.findByPk.mockResolvedValueOnce(target).mockResolvedValueOnce({
        ...target,
        isActive: true,
      });

      const result = await service.setActive('user-1', true);

      expect(target.update).toHaveBeenCalledWith({ isActive: true });
      expect(result.isActive).toBe(true);
    });

    it('is idempotent — deactivating an already-inactive user succeeds without error', async () => {
      const target = record({ isActive: false });
      const { service, model } = makeService(target);
      model.findByPk.mockResolvedValueOnce(target).mockResolvedValueOnce(target);

      await expect(service.setActive('user-1', false)).resolves.toBeDefined();
    });
  });
});
