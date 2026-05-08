import { useCallback, useState } from "react";
import { roomService } from "@/services/room.service";
import { depositService } from "@/services/deposit.service";
import { occupancyService, type RentalOccupancy } from "@/services/occupancy.service";
import {
  tenantService,
  type CreateTenantInput,
  type Tenant,
  type UpdateTenantInput,
} from "@/services/tenant.service";

type RefetchRooms = () => Promise<unknown>;

type DepositInput = {
  amount: number;
  note?: string;
};

export function useTenant(refetchRooms: RefetchRooms) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const createAndAssign = useCallback(
    async (roomId: string, payload: CreateTenantInput, deposit?: DepositInput) => {
      setIsLoading(true);
      setError(null);

      let createdTenantId: string | null = null;
      let assigned = false;
      let createdOccupancyId: string | null = null;
      let createdDepositId: string | null = null;

      try {
        const tenant = await tenantService.createTenant(payload);
        createdTenantId = tenant.id;

        await roomService.assignTenant(roomId, tenant.id);
        assigned = true;

        const occupancy = await occupancyService.createOccupancy({
          userId: payload.userId,
          roomId,
          tenantId: tenant.id,
        });
        createdOccupancyId = occupancy.id;

        if (deposit && deposit.amount >= 0) {
          const createdDeposit = await depositService.createDeposit({
            tenantId: tenant.id,
            roomId,
            occupancyId: occupancy.id,
            amount: deposit.amount,
            note: deposit.note,
          });
          createdDepositId = createdDeposit.id;
        }

        await refetchRooms();
        return tenant;
      } catch (err) {
        console.error("[useTenant.createAndAssign] failed", err);

        if (createdDepositId) {
          try {
            await depositService.deleteDepositForRollback(createdDepositId);
          } catch (rollbackErr) {
            console.error("[useTenant.createAndAssign] rollback deleteDepositForRollback failed", rollbackErr);
          }
        }

        if (createdOccupancyId) {
          try {
            await occupancyService.deleteOccupancy(createdOccupancyId);
          } catch (rollbackErr) {
            console.error("[useTenant.createAndAssign] rollback deleteOccupancy failed", rollbackErr);
          }
        }

        if (assigned) {
          try {
            await roomService.removeTenant(roomId);
          } catch (rollbackErr) {
            console.error("[useTenant.createAndAssign] rollback removeTenant failed", rollbackErr);
          }
        }

        if (createdTenantId) {
          try {
            await tenantService.deleteTenant(createdTenantId);
          } catch (rollbackErr) {
            console.error("[useTenant.createAndAssign] rollback deleteTenant failed", rollbackErr);
          }
        }

        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refetchRooms],
  );

  const update = useCallback(
    async (tenantId: string, payload: UpdateTenantInput) => {
      setIsLoading(true);
      setError(null);
      try {
        const tenant = await tenantService.updateTenant(tenantId, payload);
        await refetchRooms();
        return tenant;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refetchRooms],
  );

  const removeFromRoom = useCallback(
    async (roomId: string) => {
      setIsLoading(true);
      setError(null);

      let pendingDepositId: string | null = null;
      let endedOccupancyId: string | null = null;

      try {
        const pendingDeposit =
          await depositService.moveActiveRoomDepositToPendingSettlement(roomId);
        pendingDepositId = pendingDeposit?.id ?? null;

        const activeOccupancy = await occupancyService.getActiveOccupancyByRoom(roomId);
        if (activeOccupancy) {
          const endedOccupancy = await occupancyService.endOccupancy(activeOccupancy.id);
          endedOccupancyId = endedOccupancy.id;
        }

        await roomService.removeTenant(roomId);
        await refetchRooms();
      } catch (err) {
        console.error("[useTenant.removeFromRoom] failed", err);

        if (endedOccupancyId) {
          try {
            await occupancyService.restoreOccupancyToActive(endedOccupancyId);
          } catch (rollbackErr) {
            console.error(
              "[useTenant.removeFromRoom] rollback restoreOccupancyToActive failed",
              rollbackErr,
            );
          }
        }

        if (pendingDepositId) {
          try {
            await depositService.restoreDepositToActive(pendingDepositId);
          } catch (rollbackErr) {
            console.error(
              "[useTenant.removeFromRoom] rollback restoreDepositToActive failed",
              rollbackErr,
            );
          }
        }

        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refetchRooms],
  );

  const assignExisting = useCallback(
    async (roomId: string, tenantId: string, deposit?: DepositInput) => {
      setIsLoading(true);
      setError(null);

      let previous: { tenantId: string | null; userId: string } | null = null;
      let assigned = false;
      let pendingDepositId: string | null = null;
      let previousOccupancy: RentalOccupancy | null = null;
      let endedPreviousOccupancyId: string | null = null;
      let createdOccupancyId: string | null = null;
      let createdDepositId: string | null = null;

      try {
        previous = await roomService.getTenantAssignment(roomId);
        previousOccupancy = await occupancyService.getActiveOccupancyByRoom(roomId);

        const pendingDeposit =
          await depositService.moveActiveRoomDepositToPendingSettlement(roomId);
        pendingDepositId = pendingDeposit?.id ?? null;

        await roomService.assignTenant(roomId, tenantId);
        assigned = true;

        if (previousOccupancy) {
          const endedOccupancy = await occupancyService.endOccupancy(previousOccupancy.id);
          endedPreviousOccupancyId = endedOccupancy.id;
        }

        const occupancy = await occupancyService.createOccupancy({
          userId: previous.userId,
          roomId,
          tenantId,
        });
        createdOccupancyId = occupancy.id;

        if (deposit && deposit.amount >= 0) {
          const createdDeposit = await depositService.createDeposit({
            tenantId,
            roomId,
            occupancyId: occupancy.id,
            amount: deposit.amount,
            note: deposit.note,
          });
          createdDepositId = createdDeposit.id;
        }

        await refetchRooms();
      } catch (err) {
        console.error("[useTenant.assignExisting] failed", err);

        if (createdDepositId) {
          try {
            await depositService.deleteDepositForRollback(createdDepositId);
          } catch (rollbackErr) {
            console.error("[useTenant.assignExisting] rollback deleteDepositForRollback failed", rollbackErr);
          }
        }

        if (createdOccupancyId) {
          try {
            await occupancyService.deleteOccupancy(createdOccupancyId);
          } catch (rollbackErr) {
            console.error("[useTenant.assignExisting] rollback deleteOccupancy failed", rollbackErr);
          }
        }

        if (endedPreviousOccupancyId) {
          try {
            await occupancyService.restoreOccupancyToActive(endedPreviousOccupancyId);
          } catch (rollbackErr) {
            console.error(
              "[useTenant.assignExisting] rollback restoreOccupancyToActive failed",
              rollbackErr,
            );
          }
        }

        if (assigned && previous) {
          try {
            await roomService.restoreTenantAssignment(roomId, previous.tenantId);
          } catch (rollbackErr) {
            console.error(
              "[useTenant.assignExisting] rollback restoreTenantAssignment failed",
              rollbackErr,
            );
          }
        }

        if (pendingDepositId) {
          try {
            await depositService.restoreDepositToActive(pendingDepositId);
          } catch (rollbackErr) {
            console.error(
              "[useTenant.assignExisting] rollback restoreDepositToActive failed",
              rollbackErr,
            );
          }
        }

        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refetchRooms],
  );

  const listTenants = useCallback(async (userId: string): Promise<Tenant[]> => {
    return tenantService.listTenantsByCurrentUser(userId);
  }, []);

  return {
    createAndAssign,
    update,
    removeFromRoom,
    assignExisting,
    listTenants,
    isLoading,
    error,
  };
}
