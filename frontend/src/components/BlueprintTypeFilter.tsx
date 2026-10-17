import React from "react";

interface BlueprintTypeFilterProps {
  drawingTypes: string[];
  activeType: string;
  onSelectType: (type: string) => void;
  totalDrawings: number;
}

export const BlueprintTypeFilter: React.FC<BlueprintTypeFilterProps> = ({
  drawingTypes,
  activeType,
  onSelectType,
  totalDrawings,
}) => {
  const allTypes = ["ALL", ...drawingTypes];

  return (
    <div className="blueprint-type-bar" role="toolbar" aria-label="Filter drawings by technical type">
      <div className="blueprint-type-label">DRAWING TYPE</div>
      <div className="blueprint-type-scroll">
        {allTypes.map((type) => {
          const isActive = activeType === type;
          return (
            <button
              key={type}
              type="button"
              className={`blueprint-type-pill ${isActive ? "is-active" : ""}`}
              onClick={() => onSelectType(type)}
              aria-pressed={isActive}
            >
              {type}
              {type === "ALL" && (
                <span className="blueprint-pill-count">{totalDrawings}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
