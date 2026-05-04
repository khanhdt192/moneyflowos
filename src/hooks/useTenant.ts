import { useCallback, useState } from "react";
import { roomService } from "@/services/room.service";
import { depositService } from "@/services/deposit.service";
import { tenantService, type CreateTenantInput, type Tenant, type UpdateTenantInput } from "@/services/tenant.service";

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

      try {
        const tenant = await tenantService.createTenant(payload);
        createdTenantId = tenant.id;

        await roomService.assignTenant(roomId, tenant.id);
        assigned = true;

        if (deposit && deposit.amount >= 0) {
          await depositService.createDeposit({
            tenantId: tenant.id,
            roomId,
            amount: deposit.amount,
            note: deposit.note,
          });
        }

        await refetchRooms();
        return tenant;
      } catch (err) {
        console.error("[useTenant.createAndAssign] failed", err);

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
      try {
        await roomService.removeTenant(roomId);
        await refetchRooms();
      } catch (err) {
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

      let previous: { tenantId: string | null } | null = null;
      let assigned = false;

      try {
        previous = await roomService.getTenantAssignment(roomId);

        await roomService.assignTenant(roomId, tenantId);
        assigned = true;

        if (deposit && deposit.amount >= 0) {
          await depositService.createDeposit({
            tenantId,
            roomId,
            amount: deposit.amount,
            note: deposit.note,
          });
        }

        await refetchRooms();
      } catch (err) {
        console.error("[useTenant.assignExisting] failed", err);

        if (assigned && previous) {
          try {
            await roomService.restoreTenantAssignment(roomId, previous.tenantId);
          } catch (rollbackErr) {
            console.error("[useTenant.assignExisting] rollback restoreTenantAssignment failed", rollbackErr);
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
