import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Module {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  setup_fee: number;
  key: string;
  category: string;
  is_active: boolean;
}

interface ModuleSelectorProps {
  modules: Module[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  showPricing?: boolean;
  readonly?: boolean;
}

export function ModuleSelector({
  modules,
  selected,
  onSelectionChange,
  showPricing = true,
  readonly = false,
}: ModuleSelectorProps) {
  const toggleModule = (id: string) => {
    if (readonly) return;

    if (selected.includes(id)) {
      onSelectionChange(selected.filter((s) => s !== id));
    } else {
      onSelectionChange([...selected, id]);
    }
  };

  const totalMonthly = modules
    .filter((m) => selected.includes(m.id))
    .reduce((sum, m) => sum + Number(m.monthly_price), 0);

  const totalSetup = modules
    .filter((m) => selected.includes(m.id))
    .reduce((sum, m) => sum + Number(m.setup_fee), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((module) => {
          const isSelected = selected.includes(module.id);
          const isFree = Number(module.monthly_price) === 0;

          return (
            <Card
              key={module.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected && "border-primary bg-primary/5",
                readonly && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => toggleModule(module.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    disabled={readonly}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{module.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {module.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {module.description}
                    </p>
                    {showPricing && (
                      <div className="mt-2 text-sm">
                        {isFree ? (
                          <Badge variant="outline" className="text-xs border-success text-success">
                            Free
                          </Badge>
                        ) : (
                          <span className="font-medium">
                            K{module.monthly_price}/mo
                            {Number(module.setup_fee) > 0 && (
                              <span className="text-muted-foreground ml-1">
                                + K{module.setup_fee} setup
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showPricing && selected.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Monthly</p>
                <p className="text-2xl font-bold">
                  K{totalMonthly.toLocaleString()}
                  {totalMonthly === 0 && " (Free)"}
                </p>
                {totalSetup > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    + K{totalSetup.toLocaleString()} setup fees
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {selected.length} module{selected.length !== 1 ? "s" : ""} selected
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}