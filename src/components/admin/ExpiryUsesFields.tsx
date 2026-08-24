"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ExpirationOption, MaxUsesOption } from "@/app/admin/actions";

export interface ExpiryUsesState {
  expiration: ExpirationOption;
  customDays: number;
  maxUses: MaxUsesOption;
  customMax: number;
}

export const DEFAULT_EXPIRY_USES: ExpiryUsesState = {
  expiration: "30",
  customDays: 30,
  maxUses: "5",
  customMax: 5,
};

export function ExpiryUsesFields({
  state,
  onChange,
}: {
  state: ExpiryUsesState;
  onChange: (next: ExpiryUsesState) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground">Expiration</label>
        <Select
          value={state.expiration}
          onChange={(e) =>
            onChange({ ...state, expiration: e.target.value as ExpirationOption })
          }
        >
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="never">Never</option>
          <option value="custom">Custom</option>
        </Select>
        {state.expiration === "custom" && (
          <Input
            type="number"
            min={1}
            className="mt-2"
            value={state.customDays}
            onChange={(e) => onChange({ ...state, customDays: Number(e.target.value) })}
            placeholder="Days"
          />
        )}
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Maximum Uses</label>
        <Select
          value={state.maxUses}
          onChange={(e) => onChange({ ...state, maxUses: e.target.value as MaxUsesOption })}
        >
          <option value="1">1</option>
          <option value="5">5</option>
          <option value="15">15</option>
          <option value="unlimited">Unlimited</option>
          <option value="custom">Custom</option>
        </Select>
        {state.maxUses === "custom" && (
          <Input
            type="number"
            min={1}
            className="mt-2"
            value={state.customMax}
            onChange={(e) => onChange({ ...state, customMax: Number(e.target.value) })}
            placeholder="Uses"
          />
        )}
        <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
          Uses count new beta session activations, not page views.
        </p>
      </div>
    </div>
  );
}
