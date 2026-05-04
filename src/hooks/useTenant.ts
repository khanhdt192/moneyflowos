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
      try {
        const tenant = await tenantService.createTenant(payload);
        await roomService.assignTenant(roomId, tenant.id);
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
      try {
        await roomService.assignTenant(roomId, tenantId);
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
